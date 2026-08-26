/**
 * Centralized API error message extraction
 *
 * The API client interceptor rejects with a plain object: { status, code, message, error }
 * This utility extracts the user-facing message from any error shape and provides
 * graceful Chinese translations for common HTTP status codes, network errors, and English server errors.
 */

import { getLocale } from '@/i18n'

interface ApiErrorLike {
  status?: number
  code?: number | string
  message?: string
  error?: string
  reason?: string
  metadata?: Record<string, unknown>
  response?: {
    status?: number
    data?: {
      detail?: string
      message?: string
      code?: number | string
      error?: string
    }
  }
}

const ZH_ERROR_TRANSLATIONS: Record<string, string> = {
  'internal server error': '服务器内部错误，请稍后重试',
  'bad gateway': '网关错误 / 上游无响应，请稍后重试',
  'service unavailable': '服务暂不可用，请稍后重试',
  'gateway timeout': '网关响应超时，请稍后重试',
  'unauthorized': '登录已过期或未授权，请重新登录',
  'forbidden': '无权限执行此操作',
  'not found': '请求的资源不存在',
  'bad request': '请求参数无效或格式错误',
  'too many requests': '请求过于频繁，请稍后再试',
  'network error': '网络连接失败，请检查网络设置',
  'network error. please check your connection.': '网络连接失败，请检查网络设置',
  'unknown error': '未知系统错误，请重试',
  'request failed': '请求失败，请稍后重试',
  'upstream request failed': '上游渠道请求失败，请检查渠道配置或状态',
  'timeout': '请求超时，请检查网络或稍后重试',
  'CONFIG_NOT_READY': '系统配置尚未就绪',
  'OAUTH_DISABLED': '该第三方登录方式已被禁用',
  'OAUTH_CONFIG_INVALID': '第三方登录配置有误或未设置回调地址',
  'OAUTH_STATE_GEN_FAILED': '生成授权安全凭据失败',
  'OAUTH_BUILD_URL_FAILED': '构建授权地址失败',
  'AUTH_IDENTITY_LOOKUP_FAILED': '查找第三方绑定用户失败',
  'PENDING_AUTH_SESSION_INVALID': '登录授权会话已过期或无效',
  'USER_NOT_FOUND': '用户不存在',
  'INVALID_CREDENTIALS': '用户名或密码错误',
  'USER_DISABLED': '账户已被封禁或停用',
  'DATABASE_ERROR': '数据库查询或操作失败',
  'REDIS_ERROR': '缓存服务异常'
}

const STATUS_TO_ZH: Record<number, string> = {
  400: '请求参数错误 (400)',
  401: '登录已失效，请重新登录 (401)',
  403: '权限不足，禁止访问 (403)',
  404: '请求的接口或资源不存在 (404)',
  408: '请求超时，请重试 (408)',
  429: '操作过于频繁，触发系统限流 (429)',
  500: '服务器内部错误，请稍后重试 (500)',
  502: '网关上游无响应或异常 (502)',
  503: '服务器过载或正在维护 (503)',
  504: '网关请求上游超时 (504)'
}

function localizeRawErrorMessage(rawMsg: string, status?: number): string {
  if (!rawMsg) return ''
  const trimmed = rawMsg.trim()
  if (getLocale() !== 'zh') return trimmed
  const lower = trimmed.toLowerCase()
  if (ZH_ERROR_TRANSLATIONS[trimmed]) return ZH_ERROR_TRANSLATIONS[trimmed]
  if (ZH_ERROR_TRANSLATIONS[lower]) return ZH_ERROR_TRANSLATIONS[lower]
  if (/^5\d\d$/.test(trimmed)) {
    const codeNum = parseInt(trimmed, 10)
    return STATUS_TO_ZH[codeNum] || ('服务器异常 (' + trimmed + ')')
  }
  if (lower.includes('internal server error') || lower.includes('500 internal')) {
    return '服务器内部错误，请稍后重试 (500)'
  }
  if (lower.includes('bad gateway') || lower.includes('502 bad gateway')) {
    return '网关异常或上游未响应 (502)'
  }
  if (lower.includes('gateway timeout') || lower.includes('504 gateway timeout')) {
    return '网关请求上游超时 (504)'
  }
  if (lower.includes('network error') || lower.includes('failed to fetch')) {
    return '网络连接失败，请检查网络设置'
  }
  if (lower.includes('timeout of') || lower.includes('timeout exceeded')) {
    return '网络请求超时，请稍后重试'
  }
  if (status && (trimmed === 'Error' || trimmed === 'Request failed with status code ' + status)) {
    return STATUS_TO_ZH[status] || ('请求失败 (HTTP ' + status + ')')
  }
  return trimmed
}

export function extractApiErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as ApiErrorLike
  const code = e.reason ?? e.code ?? e.response?.data?.code
  return code != null ? String(code) : undefined
}

export function extractApiErrorMetadata(err: unknown): Record<string, unknown> | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as ApiErrorLike
  return e.metadata
}

type TranslateFn = (key: string, params?: Record<string, unknown>) => string
type TranslateWithExistsFn = TranslateFn & { te?: (key: string) => boolean }

function tryTranslate(t: TranslateFn, key: string, fallback: string): string {
  const translated = t(key)
  if (translated === key) return fallback
  const te = (t as TranslateWithExistsFn).te
  if (te && !te(key)) return fallback
  return translated
}

function localizeMetadata(metadata: Record<string, unknown>, t: TranslateFn): Record<string, unknown> {
  const out: Record<string, unknown> = { ...metadata }
  if (typeof out.key === 'string') {
    out.key = tryTranslate(t, 'admin.settings.payment.field_' + out.key, out.key)
  }
  if (typeof out.keys === 'string') {
    out.keys = out.keys
      .split('/')
      .map(k => tryTranslate(t, 'admin.settings.payment.field_' + k, k))
      .join(' / ')
  }
  return out
}

export function extractI18nErrorMessage(
  err: unknown,
  t: TranslateFn,
  namespace: string,
  fallback: string,
): string {
  const code = extractApiErrorCode(err)
  if (code) {
    const key = namespace + '.' + code
    const rawMetadata = extractApiErrorMetadata(err) ?? {}
    const metadata = localizeMetadata(rawMetadata, t)
    const translated = t(key, metadata)
    if (translated !== key) return translated
    const te = (t as TranslateWithExistsFn).te
    if (te && te(key)) return translated
  }
  return extractApiErrorMessage(err, fallback)
}

export function extractApiErrorMessage(
  err: unknown,
  fallback = '未知错误，请重试',
  i18nMap?: Record<string, string>,
): string {
  if (!err) return fallback
  if (i18nMap) {
    const code = extractApiErrorCode(err)
    if (code && i18nMap[code]) return i18nMap[code]
  }
  if (typeof err === 'object' && err !== null) {
    const e = err as ApiErrorLike
    const status = e.status ?? e.response?.status
    const raw = e.message || e.error || e.response?.data?.detail || e.response?.data?.message || e.response?.data?.error
    if (raw) {
      return localizeRawErrorMessage(raw, status)
    }
    if (status && STATUS_TO_ZH[status]) {
      return getLocale() === 'zh' ? STATUS_TO_ZH[status] : ('HTTP ' + status)
    }
  }
  if (err instanceof Error) {
    return localizeRawErrorMessage(err.message)
  }
  const str = String(err)
  if (str === '[object Object]') return fallback
  return localizeRawErrorMessage(str)
}