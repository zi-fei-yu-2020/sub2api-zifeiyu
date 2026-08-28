import { describe, expect, it } from 'vitest'
import { authenticatedHomePath, resolvePostLoginRedirect } from '@/router/authRedirect'

describe('post-login redirect resolution', () => {
  it('uses the admin dashboard for an administrator without an intended route', () => {
    expect(authenticatedHomePath(true)).toBe('/admin/dashboard')
    expect(resolvePostLoginRedirect(undefined, true)).toBe('/admin/dashboard')
  })

  it('uses the user dashboard for a regular user', () => {
    expect(authenticatedHomePath(false)).toBe('/dashboard')
    expect(resolvePostLoginRedirect(undefined, false)).toBe('/dashboard')
  })

  it('upgrades the generic dashboard redirect for administrators', () => {
    expect(resolvePostLoginRedirect('/dashboard', true)).toBe('/admin/dashboard')
  })

  it('preserves a specific internal destination', () => {
    expect(resolvePostLoginRedirect('/admin/accounts?status=active', true)).toBe('/admin/accounts?status=active')
    expect(resolvePostLoginRedirect('/keys', true)).toBe('/keys')
  })

  it('rejects external or protocol-relative redirect values', () => {
    expect(resolvePostLoginRedirect('https://evil.example', true)).toBe('/admin/dashboard')
    expect(resolvePostLoginRedirect('//evil.example', false)).toBe('/dashboard')
  })

  it('accepts the first router query value when an array is provided', () => {
    expect(resolvePostLoginRedirect(['/dashboard', '/keys'], true)).toBe('/admin/dashboard')
  })
})
