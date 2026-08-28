export interface ApiErrorLike {
  status?: number
  code?: number | string
  message?: string
  detail?: string
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
      reason?: string
      metadata?: Record<string, unknown>
    }
  }
}

export interface NormalizedApiError {
  status?: number
  code?: string
  reason?: string
  error?: string
  message?: string
  metadata?: Record<string, unknown>
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  if (typeof err === 'string') return { message: err }
  if (!err || typeof err !== 'object') return {}

  const e = err as ApiErrorLike
  const data = e.response?.data
  return {
    status: e.status ?? e.response?.status,
    code: e.code != null ? String(e.code) : data?.code != null ? String(data.code) : undefined,
    reason: e.reason ?? data?.reason,
    error: e.error ?? data?.error,
    message: data?.detail ?? data?.message ?? e.detail ?? e.message ?? e.error ?? data?.error,
    metadata: e.metadata ?? data?.metadata,
  }
}

export function extractApiErrorStatus(err: unknown): number | undefined {
  return normalizeApiError(err).status
}

export function extractApiErrorCode(err: unknown): string | undefined {
  const normalized = normalizeApiError(err)
  return normalized.code ?? normalized.reason ?? normalized.error
}

export function extractApiErrorReason(err: unknown): string | undefined {
  return normalizeApiError(err).reason
}

export function isApiErrorCode(err: unknown, code: string): boolean {
  const normalized = normalizeApiError(err)
  return normalized.code === code || normalized.reason === code || normalized.error === code
}

export function extractApiErrorMetadata(err: unknown): Record<string, unknown> | undefined {
  return normalizeApiError(err).metadata
}

export function extractRawApiErrorMessage(err: unknown, fallback = ''): string {
  const message = normalizeApiError(err).message?.trim()
  return message || fallback
}
