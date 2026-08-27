import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestUse, setupClient } = vi.hoisted(() => ({
  requestUse: vi.fn(),
  setupClient: { interceptors: { request: { use: vi.fn() } }, get: vi.fn(), post: vi.fn() },
}))

vi.mock('axios', () => ({ default: { create: vi.fn(() => {
  setupClient.interceptors.request.use = requestUse
  return setupClient
}) } }))

describe('setup API token transport', () => {
  beforeEach(() => {
    vi.resetModules()
    requestUse.mockReset()
    sessionStorage.clear()
    window.history.replaceState(null, '', '/setup')
  })

  it('captures a setup token from the URL fragment and removes it from the address bar', async () => {
    window.history.replaceState(null, '', '/setup?lang=zh#setup_token=remote-secret')
    await import('@/api/setup')
    expect(sessionStorage.getItem('sub2api_setup_token')).toBe('remote-secret')
    expect(window.location.search).toBe('?lang=zh')
    expect(window.location.hash).toBe('')
    const interceptor = requestUse.mock.calls[0][0] as (config: { headers: Record<string, string> }) => unknown
    const config = { headers: {} as Record<string, string> }
    interceptor(config)
    expect(config.headers['X-Setup-Token']).toBe('remote-secret')
  })

  it('supports a legacy query token while removing it from the address bar', async () => {
    window.history.replaceState(null, '', '/setup?setup_token=remote-secret&lang=zh')
    await import('@/api/setup')
    expect(sessionStorage.getItem('sub2api_setup_token')).toBe('remote-secret')
    expect(window.location.search).toBe('?lang=zh')
    const interceptor = requestUse.mock.calls[0][0] as (config: { headers: Record<string, string> }) => unknown
    const config = { headers: {} as Record<string, string> }
    interceptor(config)
    expect(config.headers['X-Setup-Token']).toBe('remote-secret')
  })

  it('does not add a header without a token', async () => {
    await import('@/api/setup')
    const interceptor = requestUse.mock.calls[0][0] as (config: { headers: Record<string, string> }) => unknown
    const config = { headers: {} as Record<string, string> }
    interceptor(config)
    expect(config.headers['X-Setup-Token']).toBeUndefined()
  })

  it('clears the setup token after a successful installation', async () => {
    const setupApi = await import('@/api/setup')
    sessionStorage.setItem('sub2api_setup_token', 'remote-secret')
    setupClient.post.mockResolvedValueOnce({
      data: { data: { message: 'installed', restart: true } },
    })

    await setupApi.install({} as Parameters<typeof setupApi.install>[0])

    expect(sessionStorage.getItem('sub2api_setup_token')).toBeNull()
  })
})
