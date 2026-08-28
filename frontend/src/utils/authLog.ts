import {
  extractApiErrorCode,
  extractApiErrorReason,
  extractApiErrorStatus,
  extractRawApiErrorMessage,
} from './apiErrorCore'

export type AuthLogLevel = 'debug' | 'warn' | 'error'

export function logAuthEvent(level: AuthLogLevel, event: string, error?: unknown): void {
  const payload = {
    event,
    status: extractApiErrorStatus(error),
    code: extractApiErrorCode(error),
    reason: extractApiErrorReason(error),
    message: error ? extractRawApiErrorMessage(error, 'Authentication operation failed') : undefined,
    hasRefreshCookie: localStorage.getItem('refresh_cookie_enabled') === '1',
    hasRefreshToken: !!localStorage.getItem('refresh_token'),
    refreshGenerationPresent: !!localStorage.getItem('refresh_generation'),
  }
  console[level](`[auth] ${JSON.stringify(payload)}`)
}
