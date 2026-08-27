import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { adminAPI } from '@/api/admin'
import type { Account, AccountUsageInfo, WindowStats } from '@/types'

const DESKTOP_VIEWPORT_QUERY = '(min-width: 768px)'
const USAGE_BATCH_CACHE_TTL = 5 * 60 * 1000

const buildDefaultTodayStats = (): WindowStats => ({
  requests: 0,
  tokens: 0,
  cost: 0,
  standard_cost: 0,
  user_cost: 0
})

const accountSupportsBatchUsage = (account: Account) => {
  if (account.platform === 'anthropic') {
    return account.type === 'oauth' || account.type === 'setup-token'
  }
  if (account.platform === 'gemini') return true
  if (account.platform === 'antigravity') return account.type === 'oauth'
  if (account.platform === 'openai') return account.type === 'oauth'
  if (account.platform === 'grok') return account.type === 'oauth'
  return false
}

export function useAccountUsageBatches(accounts: Ref<Account[]>, hiddenColumns: Set<string>) {
  const todayStatsByAccountId = ref<Record<string, WindowStats>>({})
  const todayStatsLoading = ref(false)
  const todayStatsError = ref<string | null>(null)
  const todayStatsReqSeq = ref(0)
  const isDesktopViewport = ref(
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches
  )

  const usageBatchByAccountId = ref<Record<string, AccountUsageInfo | null>>({})
  const usageBatchErrorByAccountId = ref<Record<string, string | null>>({})
  const usageBatchLoadingByAccountId = ref<Record<string, boolean>>({})
  const usageBatchRequestTokenByAccountId = ref<Record<string, number>>({})
  const usageBatchCache = new Map<number, { data: AccountUsageInfo; ts: number }>()
  const pendingUsageBatchIds = new Set<number>()
  let usageBatchFlushTimer: ReturnType<typeof setTimeout> | null = null
  let queuedUsageBatchForce = false
  let usageBatchRequestToken = 0
  let desktopViewportMediaQuery: MediaQueryList | null = null
  let desktopViewportListener: ((event: MediaQueryListEvent) => void) | null = null

  const setUsageBatchLoading = (accountID: number, loadingState: boolean) => {
    usageBatchLoadingByAccountId.value = {
      ...usageBatchLoadingByAccountId.value,
      [String(accountID)]: loadingState
    }
  }

  const setUsageBatchState = (accountID: number, usage: AccountUsageInfo | null, error: string | null) => {
    const key = String(accountID)
    usageBatchByAccountId.value = { ...usageBatchByAccountId.value, [key]: usage }
    usageBatchErrorByAccountId.value = { ...usageBatchErrorByAccountId.value, [key]: error }
  }

  const handleAccountUsageLoaded = (accountID: number, usage: AccountUsageInfo) => {
    if (usageBatchByAccountId.value[String(accountID)] === usage) return
    setUsageBatchState(accountID, usage, null)
  }

  const flushQueuedUsageBatch = async () => {
    usageBatchFlushTimer = null
    const accountIDs = Array.from(pendingUsageBatchIds)
    const force = queuedUsageBatchForce
    pendingUsageBatchIds.clear()
    queuedUsageBatchForce = false
    if (accountIDs.length === 0) return

    const requestTokensByAccount = accountIDs.reduce<Record<string, number>>((acc, accountID) => {
      acc[String(accountID)] = usageBatchRequestTokenByAccountId.value[String(accountID)] ?? 0
      return acc
    }, {})

    try {
      const result = await adminAPI.accounts.getBatchUsage(accountIDs, force)
      const usageMap = result.usage ?? {}
      const errorMap = result.errors ?? {}
      const now = Date.now()
      const nextUsage = { ...usageBatchByAccountId.value }
      const nextErrors = { ...usageBatchErrorByAccountId.value }
      const nextLoading = { ...usageBatchLoadingByAccountId.value }

      for (const accountID of accountIDs) {
        const key = String(accountID)
        if ((usageBatchRequestTokenByAccountId.value[key] ?? 0) !== requestTokensByAccount[key]) continue
        const usage = usageMap[key] ?? null
        nextUsage[key] = usage
        nextErrors[key] = errorMap[key] ?? null
        nextLoading[key] = false
        if (usage) usageBatchCache.set(accountID, { data: usage, ts: now })
        else usageBatchCache.delete(accountID)
      }

      usageBatchByAccountId.value = nextUsage
      usageBatchErrorByAccountId.value = nextErrors
      usageBatchLoadingByAccountId.value = nextLoading
    } catch (error) {
      const nextErrors = { ...usageBatchErrorByAccountId.value }
      const nextLoading = { ...usageBatchLoadingByAccountId.value }
      for (const accountID of accountIDs) {
        const key = String(accountID)
        if ((usageBatchRequestTokenByAccountId.value[key] ?? 0) !== requestTokensByAccount[key]) continue
        nextErrors[key] = 'Failed'
        nextLoading[key] = false
      }
      usageBatchErrorByAccountId.value = nextErrors
      usageBatchLoadingByAccountId.value = nextLoading
      console.error('Failed to load account usage batch:', error)
    }
  }

  const queueBatchedUsage = (account: Account, options?: { force?: boolean }) => {
    if (!isDesktopViewport.value || !accountSupportsBatchUsage(account)) return
    const force = options?.force === true
    const accountID = account.id
    const key = String(accountID)

    if (force) {
      usageBatchCache.delete(accountID)
    } else {
      const cached = usageBatchCache.get(accountID)
      if (cached && Date.now() - cached.ts < USAGE_BATCH_CACHE_TTL) {
        setUsageBatchState(accountID, cached.data, null)
        setUsageBatchLoading(accountID, false)
        return
      }
    }

    usageBatchErrorByAccountId.value = { ...usageBatchErrorByAccountId.value, [key]: null }
    usageBatchRequestTokenByAccountId.value = {
      ...usageBatchRequestTokenByAccountId.value,
      [key]: ++usageBatchRequestToken
    }
    setUsageBatchLoading(accountID, true)
    pendingUsageBatchIds.add(accountID)
    queuedUsageBatchForce = queuedUsageBatchForce || force
    if (usageBatchFlushTimer !== null) return
    usageBatchFlushTimer = setTimeout(() => void flushQueuedUsageBatch(), 0)
  }

  const refreshTodayStatsBatch = async () => {
    if (hiddenColumns.has('today_stats') && hiddenColumns.has('usage')) {
      todayStatsLoading.value = false
      todayStatsError.value = null
      return
    }

    const accountIDs = accounts.value.map(account => account.id)
    const reqSeq = ++todayStatsReqSeq.value
    if (accountIDs.length === 0) {
      todayStatsByAccountId.value = {}
      todayStatsError.value = null
      todayStatsLoading.value = false
      return
    }

    todayStatsLoading.value = true
    todayStatsError.value = null
    try {
      const result = await adminAPI.accounts.getBatchTodayStats(accountIDs)
      if (reqSeq !== todayStatsReqSeq.value) return
      const serverStats = result.stats ?? {}
      const nextStats: Record<string, WindowStats> = {}
      for (const accountID of accountIDs) {
        const key = String(accountID)
        nextStats[key] = serverStats[key] ?? buildDefaultTodayStats()
      }
      todayStatsByAccountId.value = nextStats
    } catch (error) {
      if (reqSeq !== todayStatsReqSeq.value) return
      todayStatsError.value = 'Failed'
      console.error('Failed to load account today stats:', error)
    } finally {
      if (reqSeq === todayStatsReqSeq.value) todayStatsLoading.value = false
    }
  }

  watch(accounts, rows => {
    const visibleIDs = new Set(rows.map(row => String(row.id)))
    usageBatchByAccountId.value = Object.fromEntries(
      Object.entries(usageBatchByAccountId.value).filter(([key]) => visibleIDs.has(key))
    )
    usageBatchErrorByAccountId.value = Object.fromEntries(
      Object.entries(usageBatchErrorByAccountId.value).filter(([key]) => visibleIDs.has(key))
    )
    usageBatchLoadingByAccountId.value = Object.fromEntries(
      Object.entries(usageBatchLoadingByAccountId.value).filter(([key]) => visibleIDs.has(key))
    )
    usageBatchRequestTokenByAccountId.value = Object.fromEntries(
      Object.entries(usageBatchRequestTokenByAccountId.value).filter(([key]) => visibleIDs.has(key))
    )
  })

  onMounted(() => {
    if (typeof window === 'undefined') return
    desktopViewportMediaQuery = window.matchMedia(DESKTOP_VIEWPORT_QUERY)
    isDesktopViewport.value = desktopViewportMediaQuery.matches
    desktopViewportListener = event => {
      isDesktopViewport.value = event.matches
    }
    if (typeof desktopViewportMediaQuery.addEventListener === 'function') {
      desktopViewportMediaQuery.addEventListener('change', desktopViewportListener)
    } else {
      desktopViewportMediaQuery.addListener(desktopViewportListener)
    }
  })

  onUnmounted(() => {
    if (usageBatchFlushTimer !== null) clearTimeout(usageBatchFlushTimer)
    pendingUsageBatchIds.clear()
    if (desktopViewportMediaQuery && desktopViewportListener) {
      if (typeof desktopViewportMediaQuery.removeEventListener === 'function') {
        desktopViewportMediaQuery.removeEventListener('change', desktopViewportListener)
      } else {
        desktopViewportMediaQuery.removeListener(desktopViewportListener)
      }
    }
    desktopViewportListener = null
    desktopViewportMediaQuery = null
  })

  return {
    isDesktopViewport,
    todayStatsByAccountId,
    todayStatsLoading,
    todayStatsError,
    usageBatchByAccountId,
    usageBatchErrorByAccountId,
    usageBatchLoadingByAccountId,
    queueBatchedUsage,
    handleAccountUsageLoaded,
    refreshTodayStatsBatch
  }
}
