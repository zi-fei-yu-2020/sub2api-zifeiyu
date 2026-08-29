import { ref, reactive, onUnmounted, toRaw } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { BasePaginationResponse, FetchOptions } from '@/types'
import { getPersistedPageSize, setPersistedPageSize } from './usePersistedPageSize'

interface PaginationState {
  page: number
  page_size: number
  total: number
  pages: number
}

interface TableLoaderOptions<T, P> {
  fetchFn: (page: number, pageSize: number, params: P, options?: FetchOptions) => Promise<BasePaginationResponse<T>>
  initialParams?: P
  pageSize?: number
  debounceMs?: number
  cacheKey?: string
}

// Global in-memory cache for instant table switching (0ms load experience)
const globalTableCache = new Map<string, { items: any[]; total: number; pages: number; timestamp: number }>()

/**
 * 通用表格数据加载 Composable（升级版：支持 SWR 瞬间呈现与后台静默刷新）
 */
export function useTableLoader<T, P extends Record<string, any>>(options: TableLoaderOptions<T, P>) {
  const { fetchFn, initialParams, pageSize, debounceMs = 300, cacheKey } = options

  const items = ref<T[]>([])
  const loading = ref(false)
  const isBackgroundRefreshing = ref(false)
  const params = reactive<P>({ ...(initialParams || {}) } as P)
  const pagination = reactive<PaginationState>({
    page: 1,
    page_size: pageSize ?? getPersistedPageSize(),
    total: 0,
    pages: 0
  })

  let abortController: AbortController | null = null

  const getComputedCacheKey = () => {
    if (!cacheKey) return null
    return `${cacheKey}_${pagination.page}_${pagination.page_size}_${JSON.stringify(toRaw(params))}`
  }

  // Hydrate from cache immediately if available
  const currentKey = getComputedCacheKey()
  if (currentKey && globalTableCache.has(currentKey)) {
    const cached = globalTableCache.get(currentKey)!
    items.value = cached.items as T[]
    pagination.total = cached.total
    pagination.pages = cached.pages
  }

  const isAbortError = (error: any) => {
    return error?.name === 'AbortError' || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError'
  }

  const load = async (isBackground = false) => {
    if (abortController) {
      abortController.abort()
    }
    const currentController = new AbortController()
    abortController = currentController

    const key = getComputedCacheKey()
    const hasCache = key ? globalTableCache.has(key) : false

    if (hasCache && (items.value as T[]).length > 0) {
      // If we already have items rendered, don't flash skeleton — do smooth background refresh
      isBackgroundRefreshing.value = true
    } else if (!isBackground) {
      loading.value = true
    }

    try {
      const response = await fetchFn(
        pagination.page,
        pagination.page_size,
        toRaw(params) as P,
        { signal: currentController.signal }
      )

      items.value = response.items || []
      pagination.total = response.total || 0
      pagination.pages = response.pages || 0

      // Update cache
      if (key) {
        globalTableCache.set(key, {
          items: response.items || [],
          total: response.total || 0,
          pages: response.pages || 0,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Table load error:', error)
        throw error
      }
    } finally {
      if (abortController === currentController) {
        loading.value = false
        isBackgroundRefreshing.value = false
      }
    }
  }

  const reload = () => {
    pagination.page = 1
    return load()
  }

  const debouncedReload = useDebounceFn(reload, debounceMs)

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, pagination.pages || 1))
    pagination.page = validPage
    load()
  }

  const handlePageSizeChange = (size: number) => {
    pagination.page_size = size
    pagination.page = 1
    setPersistedPageSize(size)
    load()
  }

  onUnmounted(() => {
    abortController?.abort()
  })

  return {
    items,
    loading,
    isBackgroundRefreshing,
    params,
    pagination,
    load,
    reload,
    debouncedReload,
    handlePageChange,
    handlePageSizeChange
  }
}
