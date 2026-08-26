import { describe, expect, it } from 'vitest'
import { formatConcurrencyLimit } from '../concurrency'
import zhCommon from '@/i18n/locales/zh/common'
import enCommon from '@/i18n/locales/en/common'
describe('formatConcurrencyLimit', () => {
  it('provides the shared unlimited locale label', () => {
    expect(zhCommon.common.unlimited).toBe('\u65e0\u9650\u5236')
    expect(enCommon.common.unlimited).toBe('Unlimited')
  })
  it('shows non-positive and invalid values as unlimited', () => {
    expect(formatConcurrencyLimit(0, '无限制', '请求')).toBe('无限制')
    expect(formatConcurrencyLimit(-1, 'Unlimited', 'requests')).toBe('Unlimited')
    expect(formatConcurrencyLimit(undefined, 'Unlimited', 'requests')).toBe('Unlimited')
  })
  it('keeps positive concurrency as a request count', () => {
    expect(formatConcurrencyLimit(5, '无限制', '请求')).toBe('5 请求')
  })
})
