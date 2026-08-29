export function authenticatedHomePath(isAdmin: boolean): string {
  return isAdmin ? '/admin/dashboard' : '/dashboard'
}

export function isAuthenticationCallbackPath(value: string): boolean {
  const pathname = value.split(/[?#]/, 1)[0].replace(/\/+$/, '').toLowerCase()
  if (!pathname) return false
  if (pathname === '/auth/callback' || pathname === '/auth/oauth/callback') return true
  if (
    pathname.startsWith('/oauth/') ||
    pathname.startsWith('/api/oauth/') ||
    pathname.startsWith('/api/v1/oauth/')
  ) {
    return true
  }
  if (pathname.startsWith('/auth/') && pathname.endsWith('/callback')) return true
  return pathname.startsWith('/api/v1/auth/oauth/') && pathname.endsWith('/callback')
}

export function resolvePostLoginRedirect(redirect: unknown, isAdmin: boolean): string {
  const candidate = Array.isArray(redirect) ? redirect[0] : redirect
  if (typeof candidate !== 'string') {
    return authenticatedHomePath(isAdmin)
  }

  const normalized = candidate.trim()
  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    isAuthenticationCallbackPath(normalized)
  ) {
    return authenticatedHomePath(isAdmin)
  }

  // /dashboard is the generic login default. Administrators should land on
  // the admin overview unless a more specific internal destination was saved.
  if (isAdmin && normalized === '/dashboard') {
    return '/admin/dashboard'
  }
  return normalized
}
