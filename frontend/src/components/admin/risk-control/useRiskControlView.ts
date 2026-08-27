import { computed, inject, onMounted, onUnmounted, provide, reactive, ref, type InjectionKey } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import type {
  ContentModerationAPIKeyLoad,
  ContentModerationAPIKeyStatus,
  ContentModerationConfig,
  ContentModerationLog,
  ContentModerationModelFilter,
  ContentModerationModelFilterType,
  ContentModerationRuntimeStatus,
  ContentModerationTestAuditResult,
  KeywordBlockingMode,
  ModerationMode,
  UpdateContentModerationConfig,
} from '@/api/admin/riskControl'
import type { AdminGroup, Proxy, SelectOption } from '@/types'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'
import { formatDateTime as formatDateTimeValue } from '@/utils/format'

export function useRiskControlView() {
  type SettingsTab = 'basic' | 'scope' | 'runtime' | 'response' | 'riskThresholds' | 'retention' | 'keywords'
  type WorkerSlotState = 'active' | 'idle' | 'disabled'
  type APIKeysWriteMode = 'append' | 'replace'
  type OverviewIcon = 'shield' | 'key' | 'users' | 'document'
  type OverviewItem = {
    key: string
    label: string
    value: string
    meta: string
    icon: OverviewIcon
    iconClass: string
    badge?: string
    badgeClass?: string
  }
  type ModerationScoreRow = {
    category: string
    score: number
    threshold: number
    hit: boolean
  }
  type RiskThresholdRow = {
    category: string
    value: number
    defaultValue: number
  }

  const maxModerationTestImages = 1
  const maxModerationTestImageSize = 8 * 1024 * 1024
  const maxVisibleApiKeyRows: number = 3
  const blockedKeywordMax = 10000
  const riskThresholdDefaults: Record<string, number> = {
    harassment: 98,
    'harassment/threatening': 90,
    hate: 65,
    'hate/threatening': 65,
    illicit: 95,
    'illicit/violent': 95,
    'self-harm': 65,
    'self-harm/intent': 85,
    'self-harm/instructions': 65,
    sexual: 65,
    'sexual/minors': 65,
    violence: 95,
    'violence/graphic': 95,
  }
  const riskThresholdCategories = Object.keys(riskThresholdDefaults)

  const { t } = useI18n()
  const appStore = useAppStore()
  const defaultBlockMessage = () => t('admin.riskControl.defaultBlockMessage')

  const loading = ref(true)
  const saving = ref(false)
  const logsLoading = ref(false)
  const statusLoading = ref(false)
  const apiKeyTesting = ref(false)
  const hashActionLoading = ref(false)
  const unbanningUserID = ref<number | null>(null)
  const settingsOpen = ref(false)
  const activeSettingsTab = ref<SettingsTab>('basic')
  const groupSearch = ref('')
  const flaggedHashInput = ref('')
  const groups = ref<AdminGroup[]>([])
  const proxies = ref<Proxy[]>([])
  const logs = ref<ContentModerationLog[]>([])
  const status = ref<ContentModerationRuntimeStatus | null>(null)
  const testedApiKeyStatuses = ref<ContentModerationAPIKeyStatus[]>([])
  const pendingDeleteApiKeyHashes = ref<string[]>([])
  const apiKeyRowsExpanded = ref<boolean>(false)
  const moderationTestPrompt = ref('')
  const moderationTestImages = ref<string[]>([])
  const moderationTestResult = ref<ContentModerationTestAuditResult | null>(null)
  const inputDetailRow = ref<ContentModerationLog | null>(null)
  let statusTimer: number | null = null

  const configForm = reactive({
    enabled: false,
    mode: 'pre_block' as ModerationMode,
    base_url: 'https://api.openai.com',
    model: 'omni-moderation-latest',
    proxy_id: null as number | null,
    api_keys_text: '',
    api_key_configured: false,
    api_key_masked: '',
    api_key_count: 0,
    api_key_masks: [] as string[],
    api_key_statuses: [] as ContentModerationAPIKeyStatus[],
    api_keys_mode: 'append' as APIKeysWriteMode,
    clear_api_key: false,
    timeout_ms: 3000,
    retry_count: 2,
    sample_rate: 100,
    all_groups: true,
    group_ids: [] as number[],
    record_non_hits: false,
    worker_count: 4,
    queue_size: 32768,
    block_status: 403,
    block_message: defaultBlockMessage(),
    email_on_hit: true,
    auto_ban_enabled: true,
    cyber_policy_exclude_from_ban_count: false,
    ban_threshold: 10,
    violation_window_hours: 720,
    hit_retention_days: 180,
    non_hit_retention_days: 3,
    pre_hash_check_enabled: false,
    thresholds: { ...riskThresholdDefaults } as Record<string, number>,
    blocked_keywords_text: '',
    keyword_blocking_mode: 'keyword_and_api' as KeywordBlockingMode,
    model_filter_type: 'all' as ContentModerationModelFilterType,
    model_filter_models: [] as string[],
  })

  const pagination = reactive({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 1,
  })

  const filters = reactive({
    result: '',
    group_id: 0,
    endpoint: '',
    search: '',
    from: '',
    to: '',
  })

  const settingsTabs = computed<Array<{ id: SettingsTab; label: string }>>(() => [
    { id: 'basic', label: t('admin.riskControl.tabs.basic') },
    { id: 'scope', label: t('admin.riskControl.tabs.scope') },
    { id: 'runtime', label: t('admin.riskControl.tabs.runtime') },
    { id: 'response', label: t('admin.riskControl.tabs.response') },
    { id: 'riskThresholds', label: t('admin.riskControl.tabs.riskThresholds') },
    { id: 'keywords', label: t('admin.riskControl.tabs.keywords') },
    { id: 'retention', label: t('admin.riskControl.tabs.retention') },
  ])

  const modeOptions = computed<SelectOption[]>(() => [
    { value: 'pre_block', label: t('admin.riskControl.modePreBlock') },
    { value: 'observe', label: t('admin.riskControl.modeObserve') },
    { value: 'off', label: t('admin.riskControl.modeOff') },
  ])

  const keywordBlockingModeOptions = computed<Array<{ value: KeywordBlockingMode; label: string; description: string }>>(() => [
    {
      value: 'keyword_and_api',
      label: t('admin.riskControl.keywordModeKeywordAndApi'),
      description: t('admin.riskControl.keywordModeKeywordAndApiDesc'),
    },
    {
      value: 'keyword_only',
      label: t('admin.riskControl.keywordModeKeywordOnly'),
      description: t('admin.riskControl.keywordModeKeywordOnlyDesc'),
    },
    {
      value: 'api_only',
      label: t('admin.riskControl.keywordModeApiOnly'),
      description: t('admin.riskControl.keywordModeApiOnlyDesc'),
    },
  ])

  const modelFilterOptions = computed<Array<{ value: ContentModerationModelFilterType; label: string; description: string }>>(() => [
    {
      value: 'all',
      label: t('admin.riskControl.modelFilterAll'),
      description: t('admin.riskControl.modelFilterAllDesc'),
    },
    {
      value: 'include',
      label: t('admin.riskControl.modelFilterInclude'),
      description: t('admin.riskControl.modelFilterIncludeDesc'),
    },
    {
      value: 'exclude',
      label: t('admin.riskControl.modelFilterExclude'),
      description: t('admin.riskControl.modelFilterExcludeDesc'),
    },
  ])

  type KeywordNoticeView = {
    title: string
    description: string
    icon: 'infoCircle' | 'exclamationTriangle'
    toneClass: string
    iconClass: string
    titleClass: string
  }

  const keywordNoticeTones = {
    info: {
      icon: 'infoCircle' as const,
      toneClass: 'border-primary-100 bg-primary-50/60 dark:border-primary-900/40 dark:bg-primary-900/10',
      iconClass: 'mt-0.5 flex-shrink-0 text-primary-500 dark:text-primary-300',
      titleClass: 'text-primary-700 dark:text-primary-200',
    },
    warning: {
      icon: 'exclamationTriangle' as const,
      toneClass: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20',
      iconClass: 'mt-0.5 flex-shrink-0 text-amber-500 dark:text-amber-300',
      titleClass: 'text-amber-700 dark:text-amber-200',
    },
  }

  const keywordNotice = computed<KeywordNoticeView>(() => {
    const strategy = configForm.keyword_blocking_mode
    if (strategy === 'api_only') {
      return {
        ...keywordNoticeTones.info,
        title: t('admin.riskControl.keywordModeApiOnlyNotice'),
        description: t('admin.riskControl.keywordModeApiOnlyDesc'),
      }
    }
    if (configForm.mode !== 'pre_block') {
      return {
        ...keywordNoticeTones.warning,
        title: t('admin.riskControl.blockedKeywordsModeWarning', { mode: modeLabel(configForm.mode) }),
        description: t('admin.riskControl.blockedKeywordsDescription'),
      }
    }
    if (strategy === 'keyword_only') {
      return {
        ...keywordNoticeTones.info,
        title: t('admin.riskControl.keywordModeKeywordOnlyNotice'),
        description: t('admin.riskControl.keywordModeKeywordOnlyDesc'),
      }
    }
    return {
      ...keywordNoticeTones.info,
      title: t('admin.riskControl.blockedKeywordsPreBlockHint'),
      description: t('admin.riskControl.blockedKeywordsDescription'),
    }
  })

  const resultOptions = computed<SelectOption[]>(() => [
    { value: '', label: t('admin.riskControl.result.all') },
    { value: 'hit', label: t('admin.riskControl.result.hit') },
    { value: 'blocked', label: t('admin.riskControl.result.blocked') },
    { value: 'pass', label: t('admin.riskControl.result.pass') },
    { value: 'error', label: t('admin.riskControl.result.error') },
  ])

  const endpointOptions = computed<SelectOption[]>(() => [
    { value: '', label: t('admin.riskControl.filters.allEndpoints') },
    { value: '/v1/messages', label: '/v1/messages' },
    { value: '/v1/responses', label: '/v1/responses' },
    { value: '/v1/chat/completions', label: '/v1/chat/completions' },
    { value: '/v1beta/models', label: '/v1beta/models' },
    { value: '/v1/images/generations', label: '/v1/images/generations' },
    { value: '/v1/images/edits', label: '/v1/images/edits' },
  ])

  const groupFilterOptions = computed<SelectOption[]>(() => [
    { value: 0, label: t('admin.riskControl.filters.allGroups') },
    ...groups.value.map((group) => ({
      value: group.id,
      label: `${group.name} (${group.platform})`,
    })),
  ])

  const selectedGroupCount = computed(() => String(configForm.group_ids.length))

  const modelFilterModelCount = computed(() => configForm.model_filter_models.length)

  const modelFilterSummary = computed(() => {
    if (configForm.model_filter_type === 'include') {
      return t('admin.riskControl.modelFilterIncludeSummary', { count: modelFilterModelCount.value })
    }
    if (configForm.model_filter_type === 'exclude') {
      return t('admin.riskControl.modelFilterExcludeSummary', { count: modelFilterModelCount.value })
    }
    return t('admin.riskControl.modelFilterAllSummary')
  })

  const modelFilterPreviewModels = computed(() => configForm.model_filter_models.slice(0, 6))

  const hiddenModelFilterModelCount = computed(() => Math.max(0, configForm.model_filter_models.length - modelFilterPreviewModels.value.length))

  const filteredGroups = computed(() => {
    const keyword = groupSearch.value.trim().toLowerCase()
    if (!keyword) return groups.value
    return groups.value.filter((group) => {
      return group.name.toLowerCase().includes(keyword) || String(group.platform).toLowerCase().includes(keyword)
    })
  })

  const inputApiKeyCount = computed(() => parseApiKeys(configForm.api_keys_text).length)

  const blockedKeywordList = computed(() => parseBlockedKeywords(configForm.blocked_keywords_text))

  const blockedKeywordCount = computed(() => blockedKeywordList.value.length)

  const pendingDeletedApiKeyCount = computed(() => pendingDeleteApiKeyHashes.value.length)

  const effectiveStoredApiKeyCount = computed(() => Math.max(0, configForm.api_key_count - pendingDeletedApiKeyCount.value))

  const apiKeysPlaceholder = computed(() => (
    configForm.api_keys_mode === 'replace'
      ? t('admin.riskControl.apiKeysPlaceholderReplace')
      : t('admin.riskControl.apiKeysPlaceholder')
  ))

  const apiKeysModeHint = computed(() => (
    configForm.api_keys_mode === 'replace'
      ? t('admin.riskControl.apiKeysModeReplaceHint')
      : t('admin.riskControl.apiKeysModeAppendHint')
  ))

  const hasModerationAuditInput = computed(() => {
    return moderationTestPrompt.value.trim() !== '' || moderationTestImages.value.length > 0
  })

  const isFlaggedHashInputValid = computed(() => /^[a-fA-F0-9]{64}$/.test(flaggedHashInput.value.trim()))

  const storedApiKeyTestButtonText = computed(() => {
    if (apiKeyTesting.value) return t('admin.riskControl.testingApiKeys')
    if (hasModerationAuditInput.value) return t('admin.riskControl.testContentWithStoredApiKey')
    return t('admin.riskControl.testStoredApiKeys')
  })

  const savedApiKeyRows = computed<ContentModerationAPIKeyStatus[]>(() => {
    const rows = status.value?.api_key_statuses?.length
      ? status.value.api_key_statuses
      : configForm.api_key_statuses
    return Array.isArray(rows) ? rows : []
  })

  const apiKeyRows = computed<ContentModerationAPIKeyStatus[]>(() => [
    ...savedApiKeyRows.value,
    ...testedApiKeyStatuses.value,
  ])

  const visibleApiKeyRows = computed<ContentModerationAPIKeyStatus[]>(() => {
    if (apiKeyRowsExpanded.value) return apiKeyRows.value
    return apiKeyRows.value.slice(0, maxVisibleApiKeyRows)
  })

  const hiddenApiKeyRowCount = computed<number>(() => Math.max(0, apiKeyRows.value.length - visibleApiKeyRows.value.length))

  const canToggleApiKeyRows = computed<boolean>(() => apiKeyRows.value.length > maxVisibleApiKeyRows)

  const activeSavedApiKeyRows = computed<ContentModerationAPIKeyStatus[]>(() => (
    savedApiKeyRows.value.filter((row) => !isStoredApiKeyPendingDelete(row))
  ))

  const apiKeyHealthBadges = computed<Array<{ status: ContentModerationAPIKeyStatus['status']; count: number }>>(() => {
    const counts: Record<ContentModerationAPIKeyStatus['status'], number> = {
      ok: 0,
      error: 0,
      frozen: 0,
      unknown: 0,
    }
    for (const row of activeSavedApiKeyRows.value) {
      counts[row.status] = (counts[row.status] ?? 0) + 1
    }
    if (activeSavedApiKeyRows.value.length === 0 && effectiveStoredApiKeyCount.value > 0) {
      counts.unknown = effectiveStoredApiKeyCount.value
    }
    return (['ok', 'frozen', 'error', 'unknown'] as Array<ContentModerationAPIKeyStatus['status']>)
      .map((item) => ({ status: item, count: counts[item] }))
      .filter((item) => item.count > 0)
  })

  const apiKeyHealthSummary = computed(() => {
    if (!configForm.api_key_configured) return ''
    if (apiKeyHealthBadges.value.length === 0) return t('admin.riskControl.apiKeyStatusUnknown')
    return apiKeyHealthBadges.value
      .map((badge) => `${apiKeyStatusLabel(badge.status)} ${badge.count}`)
      .join(' · ')
  })

  const overviewItems = computed<OverviewItem[]>(() => [
    {
      key: 'status',
      label: t('admin.riskControl.overview.status'),
      value: configForm.enabled ? t('admin.riskControl.overview.enabled') : t('admin.riskControl.overview.disabled'),
      meta: modeLabel(configForm.mode),
      icon: 'shield',
      iconClass: configForm.enabled
        ? 'bg-emerald-50 text-blue-600 dark:bg-emerald-900/20 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400',
      badge: runtimeBadgeText.value,
      badgeClass: runtimeBadgeClass.value,
    },
    {
      key: 'api-key',
      label: t('admin.riskControl.overview.apiKey'),
      value: configForm.api_key_configured ? t('admin.riskControl.apiKeyCount', { count: configForm.api_key_count }) : t('admin.riskControl.notConfigured'),
      meta: configForm.api_key_configured ? apiKeyHealthSummary.value || configForm.model || '-' : configForm.model || '-',
      icon: 'key',
      iconClass: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300',
    },
    {
      key: 'scope',
      label: t('admin.riskControl.overview.groupScope'),
      value: configForm.all_groups ? t('admin.riskControl.allGroups') : selectedGroupCount.value,
      meta: modelFilterSummary.value,
      icon: 'users',
      iconClass: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300',
    },
    {
      key: 'logs',
      label: t('admin.riskControl.overview.logs'),
      value: formatNumber(pagination.total),
      meta: t('admin.riskControl.overview.currentFilter'),
      icon: 'document',
      iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    },
  ])

  const moderationScoreRows = computed<ModerationScoreRow[]>(() => {
    const result = moderationTestResult.value
    if (!result) return []
    return Object.entries(result.category_scores || {})
      .map(([category, score]) => {
        const threshold = result.thresholds?.[category] ?? 1
        return {
          category,
          score,
          threshold,
          hit: score >= threshold,
        }
      })
      .sort((a, b) => b.score - a.score)
  })

  const riskThresholdRows = computed<RiskThresholdRow[]>(() => (
    riskThresholdCategories.map((category) => ({
      category,
      value: configForm.thresholds[category] ?? riskThresholdDefaults[category],
      defaultValue: riskThresholdDefaults[category],
    }))
  ))

  const inputDetailText = computed(() => {
    if (!inputDetailRow.value) return '-'
    return inputDetailRow.value.input_excerpt || inputDetailRow.value.error || '-'
  })

  const queueUsagePercent = computed(() => `${Math.min(100, Math.max(0, status.value?.queue_usage_percent ?? 0)).toFixed(1)}%`)

  const queueUsageStyle = computed(() => ({
    width: queueUsagePercent.value,
  }))

  const runtimeMode = computed<ModerationMode>(() => status.value?.mode ?? configForm.mode)

  const showPreBlockRuntimeCard = computed(() => runtimeMode.value === 'pre_block')

  const showWorkerRuntimeCard = computed(() => runtimeMode.value === 'observe')

  const preBlockMetricItems = computed(() => [
    {
      key: 'active',
      label: t('admin.riskControl.preBlockActive'),
      value: formatNumber(status.value?.pre_block_active ?? 0),
      meta: t('admin.riskControl.preBlockActiveHint'),
      class: 'bg-sky-50 dark:bg-sky-900/10',
      valueClass: 'text-sky-700 dark:text-sky-300',
    },
    {
      key: 'checked',
      label: t('admin.riskControl.preBlockChecked'),
      value: formatNumber(status.value?.pre_block_checked ?? 0),
      meta: t('admin.riskControl.preBlockCheckedHint'),
      class: 'bg-slate-50 dark:bg-slate-800/50',
      valueClass: 'text-slate-900 dark:text-white',
    },
    {
      key: 'allowed',
      label: t('admin.riskControl.preBlockAllowed'),
      value: formatNumber(status.value?.pre_block_allowed ?? 0),
      meta: t('admin.riskControl.preBlockAllowedHint'),
      class: 'bg-emerald-50 dark:bg-emerald-900/10',
      valueClass: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      key: 'blocked',
      label: t('admin.riskControl.preBlockBlocked'),
      value: formatNumber(status.value?.pre_block_blocked ?? 0),
      meta: t('admin.riskControl.preBlockBlockedHint'),
      class: 'bg-rose-50 dark:bg-rose-900/10',
      valueClass: 'text-rose-700 dark:text-rose-300',
    },
    {
      key: 'errors',
      label: t('admin.riskControl.preBlockErrors'),
      value: formatNumber(status.value?.pre_block_errors ?? 0),
      meta: t('admin.riskControl.preBlockErrorsHint'),
      class: 'bg-amber-50 dark:bg-amber-900/10',
      valueClass: 'text-amber-700 dark:text-amber-300',
    },
    {
      key: 'latency',
      label: t('admin.riskControl.preBlockAvgLatency'),
      value: `${formatNumber(status.value?.pre_block_avg_latency_ms ?? 0)} ms`,
      meta: t('admin.riskControl.preBlockAvgLatencyHint'),
      class: 'bg-violet-50 dark:bg-violet-900/10',
      valueClass: 'text-violet-700 dark:text-violet-300',
    },
  ])

  const preBlockAPIKeyLoads = computed<ContentModerationAPIKeyLoad[]>(() => (
    [...(status.value?.pre_block_api_key_loads ?? [])].sort((a, b) => a.index - b.index)
  ))

  const preBlockAPIKeyMaxTotal = computed(() => Math.max(1, ...preBlockAPIKeyLoads.value.map((item) => item.total || 0)))

  const preBlockAPIKeyLoadSummaryText = computed(() => t('admin.riskControl.preBlockAPIKeyLoadSummary', {
    active: formatNumber(status.value?.pre_block_api_key_active ?? 0),
    available: formatNumber(status.value?.pre_block_api_key_available_count ?? 0),
    total: formatNumber(status.value?.pre_block_api_key_total_calls ?? 0),
    workerActive: formatNumber(status.value?.active_workers ?? 0),
    workerTotal: formatNumber(status.value?.worker_count ?? configForm.worker_count),
  }))

  function preBlockAPIKeyLoadWidth(total: number): string {
    return `${Math.min(100, Math.max(0, (total / preBlockAPIKeyMaxTotal.value) * 100)).toFixed(1)}%`
  }

  const workerSlots = computed(() => {
    const total = Math.max(0, status.value?.worker_count ?? configForm.worker_count)
    const active = Math.max(0, status.value?.active_workers ?? 0)
    const enabled = Boolean(status.value?.risk_control_enabled && status.value?.enabled && status.value?.mode !== 'off')
    return Array.from({ length: total }, (_, index) => ({
      id: index + 1,
      state: (!enabled ? 'disabled' : index < active ? 'active' : 'idle') as WorkerSlotState,
      label: !enabled
        ? t('admin.riskControl.workerDisabled')
        : index < active
          ? t('admin.riskControl.workerActive')
          : t('admin.riskControl.workerIdle'),
    }))
  })

  const runtimeBadgeText = computed(() => {
    if (!status.value?.risk_control_enabled) return t('admin.riskControl.riskSwitchOff')
    if (!configForm.enabled || configForm.mode === 'off') return t('admin.riskControl.overview.disabled')
    return t('admin.riskControl.overview.enabled')
  })

  const runtimeBadgeClass = computed(() => {
    if (!status.value?.risk_control_enabled || !configForm.enabled || configForm.mode === 'off') {
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-gray-300'
    }
    return 'bg-blue-50 text-primary-700 dark:bg-emerald-900/20 dark:text-emerald-300'
  })

  function applyConfig(config: ContentModerationConfig) {
    configForm.enabled = config.enabled
    configForm.mode = config.mode
    configForm.base_url = config.base_url || 'https://api.openai.com'
    configForm.model = config.model || 'omni-moderation-latest'
    configForm.proxy_id = config.proxy_id || null
    configForm.api_keys_text = ''
    configForm.api_key_configured = config.api_key_configured
    configForm.api_key_masked = config.api_key_masked || ''
    configForm.api_key_count = config.api_key_count || 0
    configForm.api_key_masks = Array.isArray(config.api_key_masks) ? [...config.api_key_masks] : []
    configForm.api_key_statuses = Array.isArray(config.api_key_statuses) ? [...config.api_key_statuses] : []
    configForm.api_keys_mode = 'append'
    configForm.clear_api_key = false
    pendingDeleteApiKeyHashes.value = []
    testedApiKeyStatuses.value = []
    apiKeyRowsExpanded.value = false
    configForm.timeout_ms = config.timeout_ms || 3000
    configForm.retry_count = config.retry_count ?? 2
    configForm.sample_rate = config.sample_rate ?? 100
    configForm.all_groups = config.all_groups
    configForm.group_ids = Array.isArray(config.group_ids) ? [...config.group_ids] : []
    configForm.record_non_hits = config.record_non_hits
    configForm.worker_count = config.worker_count || 4
    configForm.queue_size = config.queue_size || 32768
    configForm.block_status = config.block_status || 403
    configForm.block_message = config.block_message || defaultBlockMessage()
    configForm.email_on_hit = config.email_on_hit ?? true
    configForm.auto_ban_enabled = config.auto_ban_enabled ?? true
    configForm.cyber_policy_exclude_from_ban_count = config.cyber_policy_exclude_from_ban_count ?? false
    configForm.ban_threshold = config.ban_threshold || 10
    configForm.violation_window_hours = config.violation_window_hours || 720
    configForm.hit_retention_days = config.hit_retention_days || 180
    configForm.non_hit_retention_days = Math.min(Math.max(config.non_hit_retention_days || 3, 1), 3)
    configForm.pre_hash_check_enabled = config.pre_hash_check_enabled ?? false
    configForm.thresholds = riskThresholdsFromConfig(config.thresholds)
    configForm.blocked_keywords_text = Array.isArray(config.blocked_keywords) ? config.blocked_keywords.join('\n') : ''
    configForm.keyword_blocking_mode = normalizeKeywordBlockingMode(config.keyword_blocking_mode)
    const modelFilter = normalizeModelFilter(config.model_filter)
    configForm.model_filter_type = modelFilter.type
    configForm.model_filter_models = modelFilter.models
  }

  async function loadAll() {
    loading.value = true
    try {
      const [config, groupItems, runtimeStatus, proxyItems] = await Promise.all([
        adminAPI.riskControl.getConfig(),
        adminAPI.groups.getAll(),
        adminAPI.riskControl.getStatus(),
        // 代理列表加载失败不阻塞风控页面（仅影响下拉可选项）
        adminAPI.proxies.getAll().catch(() => [] as Proxy[]),
      ])
      applyConfig(config)
      groups.value = groupItems
      status.value = runtimeStatus
      proxies.value = proxyItems
      if (Array.isArray(runtimeStatus.api_key_statuses)) {
        configForm.api_key_statuses = [...runtimeStatus.api_key_statuses]
        prunePendingDeleteAPIKeyHashes()
      }
      await loadLogs()
    } catch (err: unknown) {
      appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.loadFailed')))
    } finally {
      loading.value = false
    }
  }

  async function loadStatus(silent = true) {
    statusLoading.value = true
    try {
      const runtimeStatus = await adminAPI.riskControl.getStatus()
      status.value = runtimeStatus
      if (Array.isArray(runtimeStatus.api_key_statuses)) {
        configForm.api_key_statuses = [...runtimeStatus.api_key_statuses]
        prunePendingDeleteAPIKeyHashes()
      }
    } catch (err: unknown) {
      if (!silent) {
        appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.statusFailed')))
      }
    } finally {
      statusLoading.value = false
    }
  }

  async function saveConfig() {
    saving.value = true
    try {
      const modelFilterPayload = buildModelFilterPayload()
      if (modelFilterPayload.type !== 'all' && modelFilterPayload.models.length === 0) {
        appStore.showError(t('admin.riskControl.modelFilterModelsRequired'))
        return
      }
      const payload: UpdateContentModerationConfig = {
        enabled: configForm.enabled,
        mode: configForm.mode,
        base_url: configForm.base_url,
        model: configForm.model,
        // 后端语义：0 清除代理（直连），>0 指定代理
        proxy_id: configForm.proxy_id ?? 0,
        timeout_ms: Number(configForm.timeout_ms) || 3000,
        retry_count: Number(configForm.retry_count) || 0,
        sample_rate: Number(configForm.sample_rate) || 0,
        all_groups: configForm.all_groups,
        group_ids: configForm.all_groups ? [] : [...configForm.group_ids],
        record_non_hits: configForm.record_non_hits,
        clear_api_key: configForm.clear_api_key,
        worker_count: Number(configForm.worker_count) || 4,
        queue_size: Number(configForm.queue_size) || 32768,
        block_status: Number(configForm.block_status) || 403,
        block_message: configForm.block_message || defaultBlockMessage(),
        email_on_hit: configForm.email_on_hit,
        auto_ban_enabled: configForm.auto_ban_enabled,
        cyber_policy_exclude_from_ban_count: configForm.cyber_policy_exclude_from_ban_count,
        ban_threshold: Number(configForm.ban_threshold) || 10,
        violation_window_hours: Number(configForm.violation_window_hours) || 720,
        hit_retention_days: Number(configForm.hit_retention_days) || 180,
        non_hit_retention_days: Math.min(Math.max(Number(configForm.non_hit_retention_days) || 3, 1), 3),
        pre_hash_check_enabled: configForm.pre_hash_check_enabled,
        thresholds: buildRiskThresholdPayload(),
        blocked_keywords: blockedKeywordList.value,
        keyword_blocking_mode: configForm.keyword_blocking_mode,
        model_filter: modelFilterPayload,
      }
      const keys = parseApiKeys(configForm.api_keys_text)
      if (!payload.clear_api_key && configForm.api_keys_mode === 'replace' && keys.length === 0) {
        appStore.showError(t('admin.riskControl.apiKeysReplaceNoInput'))
        return
      }
      if (keys.length > 0) {
        payload.api_keys = keys
        payload.api_keys_mode = configForm.api_keys_mode
        payload.clear_api_key = false
      }
      if (!payload.clear_api_key && configForm.api_keys_mode !== 'replace' && pendingDeleteApiKeyHashes.value.length > 0) {
        payload.delete_api_key_hashes = [...pendingDeleteApiKeyHashes.value]
      }

      const updated = await adminAPI.riskControl.updateConfig(payload)
      applyConfig(updated)
      settingsOpen.value = false
      appStore.showSuccess(t('admin.riskControl.saved'))
      await Promise.all([loadStatus(true), loadLogs()])
    } catch (err: unknown) {
      appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.saveFailed')))
    } finally {
      saving.value = false
    }
  }

  async function loadLogs() {
    logsLoading.value = true
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        result: filters.result || undefined,
        group_id: filters.group_id || undefined,
        endpoint: filters.endpoint || undefined,
        search: filters.search || undefined,
        from: normalizeDateTimeLocal(filters.from),
        to: normalizeDateTimeLocal(filters.to),
      }
      const result = await adminAPI.riskControl.listLogs(params)
      logs.value = result.items
      pagination.total = result.total
      pagination.page = result.page
      pagination.page_size = result.page_size
      pagination.pages = result.pages
    } catch (err: unknown) {
      appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.logsFailed')))
    } finally {
      logsLoading.value = false
    }
  }

  function canUnbanRow(row: ContentModerationLog): boolean {
    return Boolean(row.auto_banned && row.user_id && row.user_status === 'disabled')
  }

  function inputSummaryText(row: ContentModerationLog): string {
    return row.input_excerpt || row.error || '-'
  }

  function openInputDetail(row: ContentModerationLog) {
    inputDetailRow.value = row
  }

  function closeInputDetail() {
    inputDetailRow.value = null
  }

  async function unbanUser(row: ContentModerationLog) {
    if (!row.user_id || unbanningUserID.value !== null) return
    unbanningUserID.value = row.user_id
    try {
      const result = await adminAPI.riskControl.unbanUser(row.user_id)
      logs.value = logs.value.map((item) => {
        if (item.user_id !== row.user_id) return item
        return { ...item, user_status: result.status }
      })
      appStore.showSuccess(t('admin.riskControl.unbanSuccess'))
    } catch (err: unknown) {
      appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.unbanFailed')))
    } finally {
      unbanningUserID.value = null
    }
  }

  async function deleteFlaggedHash() {
    if (!isFlaggedHashInputValid.value || hashActionLoading.value) return
    hashActionLoading.value = true
    try {
      const result = await adminAPI.riskControl.deleteFlaggedHash(flaggedHashInput.value)
      flaggedHashInput.value = ''
      await loadStatus(true)
      appStore.showSuccess(result.deleted ? t('admin.riskControl.flaggedHashDeleted') : t('admin.riskControl.flaggedHashNotFound'))
    } catch (err: unknown) {
      appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.flaggedHashDeleteFailed')))
    } finally {
      hashActionLoading.value = false
    }
  }

  async function clearFlaggedHashes() {
    if (hashActionLoading.value) return
    const confirmed = window.confirm(t('admin.riskControl.clearFlaggedHashesConfirm'))
    if (!confirmed) return
    hashActionLoading.value = true
    try {
      const result = await adminAPI.riskControl.clearFlaggedHashes()
      await loadStatus(true)
      appStore.showSuccess(t('admin.riskControl.flaggedHashesCleared', { count: result.deleted }))
    } catch (err: unknown) {
      appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.flaggedHashesClearFailed')))
    } finally {
      hashActionLoading.value = false
    }
  }

  function openSettings() {
    activeSettingsTab.value = 'basic'
    settingsOpen.value = true
  }

  function reloadLogsFromFirstPage() {
    pagination.page = 1
    void loadLogs()
  }

  function onPageChange(page: number) {
    pagination.page = page
    void loadLogs()
  }

  function onPageSizeChange(pageSize: number) {
    pagination.page = 1
    pagination.page_size = pageSize
    void loadLogs()
  }

  function toggleClearApiKey() {
    configForm.clear_api_key = !configForm.clear_api_key
    if (configForm.clear_api_key) {
      configForm.api_keys_text = ''
      configForm.api_keys_mode = 'append'
      testedApiKeyStatuses.value = []
      pendingDeleteApiKeyHashes.value = []
    }
  }

  function setAPIKeysMode(mode: APIKeysWriteMode) {
    configForm.api_keys_mode = mode
    if (mode === 'replace') {
      pendingDeleteApiKeyHashes.value = []
    }
  }

  function setModelFilterType(type: ContentModerationModelFilterType) {
    configForm.model_filter_type = type
    if (type === 'all') {
      configForm.model_filter_models = []
    }
  }

  async function testApiKeys(useInputKeys: boolean) {
    const keys = useInputKeys ? parseApiKeys(configForm.api_keys_text) : []
    if (useInputKeys && keys.length === 0) {
      appStore.showError(t('admin.riskControl.apiKeyTestNoInput'))
      return
    }
    apiKeyTesting.value = true
    try {
      const result = await adminAPI.riskControl.testAPIKeys({
        api_keys: keys,
        base_url: configForm.base_url,
        model: configForm.model,
        timeout_ms: Number(configForm.timeout_ms) || 3000,
        // 与保存语义一致：0 强制直连，>0 指定代理，确保测试与实际审计走同一条链路
        proxy_id: configForm.proxy_id ?? 0,
        prompt: moderationTestPrompt.value,
        images: moderationTestImages.value,
      })
      moderationTestResult.value = result.audit_result ?? null
      if (useInputKeys) {
        testedApiKeyStatuses.value = result.items.map((item) => ({ ...item, configured: false }))
      } else {
        mergeConfiguredAPIKeyStatuses(result.items)
        testedApiKeyStatuses.value = []
        await loadStatus(true)
      }
      appStore.showSuccess(t('admin.riskControl.apiKeyTestDone', { count: result.items.length }))
    } catch (err: unknown) {
      appStore.showError(extractApiErrorMessage(err, t('admin.riskControl.apiKeyTestFailed')))
    } finally {
      apiKeyTesting.value = false
    }
  }

  function mergeConfiguredAPIKeyStatuses(items: ContentModerationAPIKeyStatus[]) {
    if (!hasModerationAuditInput.value || configForm.api_key_statuses.length === 0) {
      configForm.api_key_statuses = items
      return
    }
    const updates = new Map(items.map((item) => [item.key_hash, item]))
    configForm.api_key_statuses = configForm.api_key_statuses.map((item) => updates.get(item.key_hash) ?? item)
  }

  function toggleDeleteStoredApiKey(row: ContentModerationAPIKeyStatus) {
    if (!row.configured || !row.key_hash) return
    const index = pendingDeleteApiKeyHashes.value.indexOf(row.key_hash)
    if (index >= 0) {
      pendingDeleteApiKeyHashes.value.splice(index, 1)
      return
    }
    pendingDeleteApiKeyHashes.value.push(row.key_hash)
  }

  function isStoredApiKeyPendingDelete(row: ContentModerationAPIKeyStatus): boolean {
    return row.configured && row.key_hash !== '' && pendingDeleteApiKeyHashes.value.includes(row.key_hash)
  }

  function prunePendingDeleteAPIKeyHashes() {
    const currentHashes = new Set(savedApiKeyRows.value.map((row) => row.key_hash).filter(Boolean))
    pendingDeleteApiKeyHashes.value = pendingDeleteApiKeyHashes.value.filter((hash) => currentHashes.has(hash))
  }

  function clearModerationTestInput() {
    moderationTestPrompt.value = ''
    moderationTestImages.value = []
    moderationTestResult.value = null
  }

  function removeModerationTestImage(index: number) {
    moderationTestImages.value.splice(index, 1)
  }

  async function handleModerationImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    await addModerationTestFiles(input.files)
    input.value = ''
  }

  async function handleModerationImageDrop(event: DragEvent) {
    await addModerationTestFiles(event.dataTransfer?.files ?? null)
  }

  async function handleModerationImagePaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return
    event.preventDefault()
    await addModerationTestFiles(files)
  }

  async function addModerationTestFiles(files: FileList | File[] | null) {
    if (!files) return
    const items = Array.from(files).filter((file) => file.type.startsWith('image/'))
    for (const file of items) {
      if (moderationTestImages.value.length >= maxModerationTestImages) {
        appStore.showError(t('admin.riskControl.auditTestImageLimit', { count: maxModerationTestImages }))
        return
      }
      if (file.size > maxModerationTestImageSize) {
        appStore.showError(t('admin.riskControl.auditTestImageTooLarge'))
        continue
      }
      try {
        moderationTestImages.value.push(await fileToDataURL(file))
      } catch {
        appStore.showError(t('admin.riskControl.auditTestImageReadFailed'))
      }
    }
  }

  function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  function toggleGroup(groupID: number) {
    const index = configForm.group_ids.indexOf(groupID)
    if (index >= 0) {
      configForm.group_ids.splice(index, 1)
    } else {
      configForm.group_ids.push(groupID)
    }
  }

  function isGroupSelected(groupID: number): boolean {
    return configForm.group_ids.includes(groupID)
  }

  function modeLabel(mode: ModerationMode): string {
    const found = modeOptions.value.find((option) => option.value === mode)
    return found?.label ?? mode
  }

  function modeDescription(mode: ModerationMode): string {
    const descriptions: Record<ModerationMode, string> = {
      pre_block: t('admin.riskControl.modePreBlockDesc'),
      observe: t('admin.riskControl.modeObserveDesc'),
      off: t('admin.riskControl.modeOffDesc'),
    }
    return descriptions[mode] ?? ''
  }

  function resultLabel(row: ContentModerationLog): string {
    if (row.action === 'cyber_policy') return t('admin.riskControl.action.cyberPolicy')
    if (row.action === 'keyword_block') return t('admin.riskControl.action.keywordBlock')
    if (row.action === 'block') return t('admin.riskControl.action.block')
    if (row.action === 'error' || row.error) return t('admin.riskControl.action.error')
    if (row.flagged) return t('admin.riskControl.result.hit')
    return t('admin.riskControl.result.pass')
  }

  function resultBadgeClass(row: ContentModerationLog): string {
    if (row.action === 'block' || row.action === 'keyword_block' || row.action === 'cyber_policy') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    if (row.action === 'error' || row.error) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    if (row.flagged) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  }

  function workerSlotClass(state: WorkerSlotState): string {
    if (state === 'active') {
      return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/20 dark:text-sky-300'
    }
    if (state === 'idle') {
      return 'border-blue-200 bg-blue-50 text-primary-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300'
    }
    return 'border-slate-100 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
  }

  function workerDotClass(state: WorkerSlotState): string {
    if (state === 'active') return 'bg-sky-500'
    if (state === 'idle') return 'bg-emerald-500'
    return 'bg-gray-300 dark:bg-dark-500'
  }

  function percent(value: number): string {
    if (!Number.isFinite(value)) return '-'
    return `${(value * 100).toFixed(1)}%`
  }

  function percentWidth(value: number): string {
    if (!Number.isFinite(value)) return '0%'
    return `${Math.min(100, Math.max(0, value * 100)).toFixed(1)}%`
  }

  function latencyText(value: number | null): string {
    if (value === null || value === undefined) return '-'
    return `${value} ms`
  }

  function apiKeyRowKey(row: ContentModerationAPIKeyStatus, index: number): string {
    return `${row.configured ? 'saved' : 'test'}-${row.key_hash || index}`
  }

  function apiKeyStatusLabel(statusValue: ContentModerationAPIKeyStatus['status']): string {
    const labels: Record<ContentModerationAPIKeyStatus['status'], string> = {
      ok: t('admin.riskControl.apiKeyStatusOk'),
      error: t('admin.riskControl.apiKeyStatusError'),
      frozen: t('admin.riskControl.apiKeyStatusFrozen'),
      unknown: t('admin.riskControl.apiKeyStatusUnknown'),
    }
    return labels[statusValue] ?? labels.unknown
  }

  function apiKeyStatusBadgeClass(statusValue: ContentModerationAPIKeyStatus['status']): string {
    const classes: Record<ContentModerationAPIKeyStatus['status'], string> = {
      ok: 'bg-blue-50 text-primary-700 dark:bg-emerald-900/20 dark:text-emerald-300',
      error: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
      frozen: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-gray-300',
    }
    return classes[statusValue] ?? classes.unknown
  }

  function apiKeyStatusDotClass(statusValue: ContentModerationAPIKeyStatus['status']): string {
    const classes: Record<ContentModerationAPIKeyStatus['status'], string> = {
      ok: 'bg-emerald-500',
      error: 'bg-amber-500',
      frozen: 'bg-red-500',
      unknown: 'bg-gray-400',
    }
    return classes[statusValue] ?? classes.unknown
  }

  function apiKeyStatusMeta(row: ContentModerationAPIKeyStatus): string {
    const parts: string[] = []
    parts.push(t('admin.riskControl.apiKeyFailureCount', { count: row.failure_count || 0 }))
    if (row.last_latency_ms > 0) {
      parts.push(t('admin.riskControl.apiKeyLatency', { ms: row.last_latency_ms }))
    }
    if (row.last_http_status > 0) {
      parts.push(t('admin.riskControl.apiKeyHTTPStatus', { status: row.last_http_status }))
    }
    if (row.frozen_until) {
      parts.push(t('admin.riskControl.apiKeyFrozenUntil', { time: formatDateTime(row.frozen_until) }))
    } else if (row.last_checked_at) {
      parts.push(t('admin.riskControl.apiKeyLastChecked', { time: formatDateTime(row.last_checked_at) }))
    } else {
      parts.push(t('admin.riskControl.apiKeyNotTested'))
    }
    return parts.join(' / ')
  }

  function parseApiKeys(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item, index, arr) => item && arr.indexOf(item) === index)
  }

  function normalizeKeywordBlockingMode(value: unknown): KeywordBlockingMode {
    if (value === 'keyword_only' || value === 'api_only' || value === 'keyword_and_api') {
      return value
    }
    return 'keyword_and_api'
  }

  function normalizeModelFilter(value: unknown): ContentModerationModelFilter {
    if (!value || typeof value !== 'object') {
      return { type: 'all', models: [] }
    }
    const raw = value as Partial<ContentModerationModelFilter>
    const type = normalizeModelFilterType(raw.type)
    const models = type === 'all' ? [] : normalizeModelNames(raw.models)
    return { type, models }
  }

  function normalizeModelFilterType(value: unknown): ContentModerationModelFilterType {
    if (value === 'include' || value === 'exclude' || value === 'all') {
      return value
    }
    return 'all'
  }

  function normalizeModelNames(models: unknown): string[] {
    if (!Array.isArray(models)) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of models) {
      const model = String(item ?? '').trim()
      if (!model) continue
      const key = model.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(model)
    }
    return out
  }

  function buildModelFilterPayload(): ContentModerationModelFilter {
    const type = normalizeModelFilterType(configForm.model_filter_type)
    if (type === 'all') {
      return { type: 'all', models: [] }
    }
    return {
      type,
      models: normalizeModelNames(configForm.model_filter_models),
    }
  }

  function riskThresholdsFromConfig(thresholds: Record<string, number> | null | undefined): Record<string, number> {
    const out: Record<string, number> = { ...riskThresholdDefaults }
    for (const category of riskThresholdCategories) {
      const value = thresholds?.[category]
      if (Number.isFinite(value)) {
        out[category] = clampPercent(Number(value) * 100)
      }
    }
    return out
  }

  function buildRiskThresholdPayload(): Record<string, number> {
    const payload: Record<string, number> = {}
    for (const category of riskThresholdCategories) {
      payload[category] = Number((clampPercent(configForm.thresholds[category]) / 100).toFixed(4))
    }
    return payload
  }

  function resetRiskThresholds() {
    configForm.thresholds = { ...riskThresholdDefaults }
  }

  function clampPercent(value: unknown): number {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      return 0
    }
    return Math.min(100, Math.max(0, numeric))
  }

  function formatThresholdPercent(value: number): string {
    return `${clampPercent(value).toFixed(1)}%`
  }

  function parseBlockedKeywords(value: string): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const line of value.split(/\r?\n/)) {
      const kw = line.trim()
      if (!kw) continue
      const key = kw.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(kw)
    }
    return out
  }

  function violationCountText(row: ContentModerationLog): string {
    if (!row.flagged) return '-'
    if (row.violation_count === 0) return t('admin.riskControl.violationNotCounted')
    return t('admin.riskControl.violationCount', { count: row.violation_count || 1 })
  }

  function normalizeDateTimeLocal(value: string): string | undefined {
    if (!value) return undefined
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return undefined
    return date.toISOString()
  }

  function formatDateTime(value: string): string {
    return formatDateTimeValue(value) || '-'
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value)
  }

  onMounted(() => {
    void loadAll()
    statusTimer = window.setInterval(() => {
      void loadStatus(true)
    }, 15000)
  })

  onUnmounted(() => {
    if (statusTimer !== null) {
      window.clearInterval(statusTimer)
      statusTimer = null
    }
  })

  return {
    maxModerationTestImages,
    maxModerationTestImageSize,
    maxVisibleApiKeyRows,
    blockedKeywordMax,
    riskThresholdDefaults,
    riskThresholdCategories,
    t,
    appStore,
    defaultBlockMessage,
    loading,
    saving,
    logsLoading,
    statusLoading,
    apiKeyTesting,
    hashActionLoading,
    unbanningUserID,
    settingsOpen,
    activeSettingsTab,
    groupSearch,
    flaggedHashInput,
    groups,
    proxies,
    logs,
    status,
    testedApiKeyStatuses,
    pendingDeleteApiKeyHashes,
    apiKeyRowsExpanded,
    moderationTestPrompt,
    moderationTestImages,
    moderationTestResult,
    inputDetailRow,
    configForm,
    pagination,
    filters,
    settingsTabs,
    modeOptions,
    keywordBlockingModeOptions,
    modelFilterOptions,
    keywordNoticeTones,
    keywordNotice,
    resultOptions,
    endpointOptions,
    groupFilterOptions,
    selectedGroupCount,
    modelFilterModelCount,
    modelFilterSummary,
    modelFilterPreviewModels,
    hiddenModelFilterModelCount,
    filteredGroups,
    inputApiKeyCount,
    blockedKeywordList,
    blockedKeywordCount,
    pendingDeletedApiKeyCount,
    effectiveStoredApiKeyCount,
    apiKeysPlaceholder,
    apiKeysModeHint,
    hasModerationAuditInput,
    isFlaggedHashInputValid,
    storedApiKeyTestButtonText,
    savedApiKeyRows,
    apiKeyRows,
    visibleApiKeyRows,
    hiddenApiKeyRowCount,
    canToggleApiKeyRows,
    activeSavedApiKeyRows,
    apiKeyHealthBadges,
    apiKeyHealthSummary,
    overviewItems,
    moderationScoreRows,
    riskThresholdRows,
    inputDetailText,
    queueUsagePercent,
    queueUsageStyle,
    runtimeMode,
    showPreBlockRuntimeCard,
    showWorkerRuntimeCard,
    preBlockMetricItems,
    preBlockAPIKeyLoads,
    preBlockAPIKeyMaxTotal,
    preBlockAPIKeyLoadSummaryText,
    preBlockAPIKeyLoadWidth,
    workerSlots,
    runtimeBadgeText,
    runtimeBadgeClass,
    applyConfig,
    loadAll,
    loadStatus,
    saveConfig,
    loadLogs,
    canUnbanRow,
    inputSummaryText,
    openInputDetail,
    closeInputDetail,
    unbanUser,
    deleteFlaggedHash,
    clearFlaggedHashes,
    openSettings,
    reloadLogsFromFirstPage,
    onPageChange,
    onPageSizeChange,
    toggleClearApiKey,
    setAPIKeysMode,
    setModelFilterType,
    testApiKeys,
    mergeConfiguredAPIKeyStatuses,
    toggleDeleteStoredApiKey,
    isStoredApiKeyPendingDelete,
    prunePendingDeleteAPIKeyHashes,
    clearModerationTestInput,
    removeModerationTestImage,
    handleModerationImageUpload,
    handleModerationImageDrop,
    handleModerationImagePaste,
    addModerationTestFiles,
    fileToDataURL,
    toggleGroup,
    isGroupSelected,
    modeLabel,
    modeDescription,
    resultLabel,
    resultBadgeClass,
    workerSlotClass,
    workerDotClass,
    percent,
    percentWidth,
    latencyText,
    apiKeyRowKey,
    apiKeyStatusLabel,
    apiKeyStatusBadgeClass,
    apiKeyStatusDotClass,
    apiKeyStatusMeta,
    parseApiKeys,
    normalizeKeywordBlockingMode,
    normalizeModelFilter,
    normalizeModelFilterType,
    normalizeModelNames,
    buildModelFilterPayload,
    riskThresholdsFromConfig,
    buildRiskThresholdPayload,
    resetRiskThresholds,
    clampPercent,
    formatThresholdPercent,
    parseBlockedKeywords,
    violationCountText,
    normalizeDateTimeLocal,
    formatDateTime,
    formatNumber,
  }
}

export type RiskControlViewContext = ReturnType<typeof useRiskControlView>

const riskControlContextKey: InjectionKey<RiskControlViewContext> = Symbol('risk-control-view')

export function provideRiskControlContext(context: RiskControlViewContext): void {
  provide(riskControlContextKey, context)
}

export function useRiskControlContext(): RiskControlViewContext {
  const context = inject(riskControlContextKey)
  if (!context) {
    throw new Error('Risk control context is not available')
  }
  return context
}
