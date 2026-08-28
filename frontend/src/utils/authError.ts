interface AuthErrorLike {
  detail?: string
  message?: string
  error?: string
  response?: {
    data?: {
      detail?: string
      message?: string
      error?: string
    }
  }
}

function extractAuthErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error.trim()
  if (!error || typeof error !== 'object') return ''
  const err = error as AuthErrorLike
  return (
    err.response?.data?.detail ||
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.detail ||
    err.message ||
    err.error ||
    ''
  ).trim()
}

export function buildAuthErrorMessage(
  error: unknown,
  options: {
    fallback: string
  }
): string {
  return extractAuthErrorMessage(error) || options.fallback
}
