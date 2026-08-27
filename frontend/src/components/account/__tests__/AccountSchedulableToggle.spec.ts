import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import AccountSchedulableToggle from '../AccountSchedulableToggle.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

describe('AccountSchedulableToggle', () => {
  it('shows and emits the configured state for an active account', async () => {
    const wrapper = mount(AccountSchedulableToggle, {
      props: { account: { status: 'active', schedulable: true } },
    })

    const toggle = wrapper.get('[data-testid="account-schedulable-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(toggle.attributes('disabled')).toBeUndefined()
    expect(toggle.classes()).toContain('bg-primary-500')

    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('shows a disabled account as effectively off while preserving its resume preference', async () => {
    const wrapper = mount(AccountSchedulableToggle, {
      props: { account: { status: 'disabled', schedulable: true } },
    })

    const toggle = wrapper.get('[data-testid="account-schedulable-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(toggle.attributes('disabled')).toBeDefined()
    expect(toggle.classes()).toContain('bg-gray-200')
    expect(toggle.attributes('title')).toBe('admin.accounts.schedulableUnavailableWillResume')

    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('explains inactive accounts whose scheduling preference is also off', () => {
    const wrapper = mount(AccountSchedulableToggle, {
      props: { account: { status: 'error', schedulable: false } },
    })

    expect(wrapper.get('[data-testid="account-schedulable-toggle"]').attributes('title')).toBe(
      'admin.accounts.schedulableUnavailable',
    )
  })
})
