export function authenticatedHomePath(isAdmin: boolean): string {
  return isAdmin ? '/admin/dashboard' : '/dashboard'
}

export function resolvePostLoginRedirect(redirect: unknown, isAdmin: boolean): string {
  const candidate = Array.isArray(redirect) ? redirect[0] : redirect
  if (typeof candidate !== 'string') {
    return authenticatedHomePath(isAdmin)
  }

  const normalized = candidate.trim()
  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return authenticatedHomePath(isAdmin)
  }

  // /dashboard is the generic login default. Administrators should land on
  // the admin overview unless a more specific internal destination was saved.
  if (isAdmin && normalized === '/dashboard') {
    return '/admin/dashboard'
  }
  return normalized
}
