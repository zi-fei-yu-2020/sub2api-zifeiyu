import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import AccountStatusToggle from '../AccountStatusToggle.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

describe('AccountStatusToggle', () => {
  it('shows active accounts as enabled and emits toggle', async () => {
    const wrapper = mount(AccountStatusToggle, {
      props: { account: { status: 'active' } },
    })
    const toggle = wrapper.get('[data-testid="account-status-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(toggle.classes()).toContain('bg-primary-500')
    expect(toggle.attributes('title')).toBe('admin.accounts.statusToggleDisable')
    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('shows disabled accounts as off and available for re-enable', () => {
    const wrapper = mount(AccountStatusToggle, {
      props: { account: { status: 'disabled' } },
    })
    const toggle = wrapper.get('[data-testid="account-status-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(toggle.classes()).toContain('bg-gray-200')
    expect(toggle.attributes('title')).toBe('admin.accounts.statusToggleEnable')
  })

  it('explains that error accounts will be recovered', () => {
    const wrapper = mount(AccountStatusToggle, {
      props: { account: { status: 'error' } },
    })
    expect(wrapper.get('[data-testid="account-status-toggle"]').attributes('title')).toBe(
      'admin.accounts.statusToggleRecover',
    )
  })
})
