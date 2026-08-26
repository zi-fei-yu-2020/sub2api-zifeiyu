import { describe, expect, it } from 'vitest'
import { formatConcurrencyLimit } from '../concurrency'
describe('formatConcurrencyLimit', () => {
  it('shows non-positive and invalid values as unlimited', () => {
    expect(formatConcurrencyLimit(0, '无限制', '请求')).toBe('无限制')
    expect(formatConcurrencyLimit(-1, 'Unlimited', 'requests')).toBe('Unlimited')
    expect(formatConcurrencyLimit(undefined, 'Unlimited', 'requests')).toBe('Unlimited')
  })
  it('keeps positive concurrency as a request count', () => {
    expect(formatConcurrencyLimit(5, '无限制', '请求')).toBe('5 请求')
  })
})
