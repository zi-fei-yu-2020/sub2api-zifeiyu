import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()

vi.mock('@/api/client', () => ({
  apiClient: {
    post,
    get: vi.fn()
  }
}))

vi.mock('@/api/tokenRefresh', () => ({
  refreshAuthTokens: vi.fn()
}))

describe('browser refresh cookie transport', () => {
  beforeEach(() => {
    post.mockReset()
    localStorage.clear()
  })

  it('requests cookie transport on password login and never persists a returned raw token', async () => {
    post.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_cookie: true,
        expires_in: 900,
        token_type: 'Bearer',
        user: { id: 7, email: 'user@example.com', role: 'user', status: 'active' }
      }
    })
    localStorage.setItem('refresh_token', 'legacy-refresh-token')
    const { login } = await import('@/api/auth')

    await login({ email: 'user@example.com', password: 'secret' })

    expect(post).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'user@example.com', password: 'secret' },
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    )
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('refresh_cookie_enabled')).toBe('1')
  })

  it('requests cookie transport when completing a 2FA login', async () => {
    post.mockResolvedValueOnce({
      data: {
        access_token: 'two-factor-access',
        refresh_cookie: true,
        expires_in: 900,
        token_type: 'Bearer',
        user: { id: 7, email: 'user@example.com', role: 'user', status: 'active' }
      }
    })
    const { login2FA } = await import('@/api/auth')

    await login2FA({ temp_token: 'temporary-login-token', totp_code: '123456' })

    expect(post).toHaveBeenCalledWith(
      '/auth/login/2fa',
      { temp_token: 'temporary-login-token', totp_code: '123456' },
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    )
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('refresh_cookie_enabled')).toBe('1')
  })

  it('marks fragment-based oauth sessions as cookie-backed when no raw refresh token exists', async () => {
    const { persistOAuthTokenContext } = await import('@/api/auth')

    persistOAuthTokenContext({ access_token: 'oauth-access', expires_in: 900 })

    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('refresh_cookie_enabled')).toBe('1')
  })

  it('sends the legacy token once on logout while still requesting cookie transport', async () => {
    post.mockResolvedValueOnce({ data: { message: 'ok' } })
    localStorage.setItem('refresh_token', 'legacy-refresh-token')
    const { logout } = await import('@/api/auth')

    await logout()

    expect(post).toHaveBeenCalledWith(
      '/auth/logout',
      { refresh_token: 'legacy-refresh-token' },
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    )
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('refresh_cookie_enabled')).toBeNull()
  })
})
