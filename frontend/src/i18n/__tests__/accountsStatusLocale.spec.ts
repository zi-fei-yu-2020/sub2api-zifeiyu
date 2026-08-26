import { describe, expect, it } from 'vitest'

import enAdmin from '../locales/en/admin/accounts'
import zhAdmin from '../locales/zh/admin/accounts'

describe('account status locales', () => {
  it('translates disabled account status in both supported locales', () => {
    expect(zhAdmin.accounts.status.disabled).toBe('\u5df2\u7981\u7528')
    expect(enAdmin.accounts.status.disabled).toBe('Disabled')
  })
})
