import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ApiKeyAclSettingsPanel from '../ApiKeyAclSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.header ? `${key}:${params.header}` : key,
  }),
}))

function mountPanel(overrides: Record<string, unknown> = {}) {
  return mount(ApiKeyAclSettingsPanel, {
    props: {
      trustForwardedIp: true,
      headers: ['Cf-Connecting-Ip', 'X-Real-Ip'],
      draft: '',
      ...overrides,
    },
    global: { stubs: { Icon: true } },
  })
}

describe('ApiKeyAclSettingsPanel', () => {
  it('preserves the card, tag container and input layout classes', () => {
    const wrapper = mountPanel()

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.findAll('[data-testid="forwarded-client-ip-header-tag"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="forwarded-client-ip-headers-input"]').classes()).toEqual(
      expect.arrayContaining(['w-full', 'bg-transparent', 'text-sm', 'font-mono']),
    )
  })

  it('forwards toggle, draft, remove and keyboard lifecycle events', async () => {
    const wrapper = mountPanel()
    const input = wrapper.get('[data-testid="forwarded-client-ip-headers-input"]')

    await wrapper.get('[role="switch"]').trigger('click')
    await input.setValue('x-client-ip')
    await input.trigger('keydown', { key: 'Enter' })
    await input.trigger('blur')
    await input.trigger('paste', {
      clipboardData: { getData: () => 'X-Forwarded-For' },
    })
    await wrapper
      .findAll('[data-testid="forwarded-client-ip-header-tag"]')[0]
      .get('button')
      .trigger('click')

    expect(wrapper.emitted('update:trustForwardedIp')).toEqual([[false]])
    expect(wrapper.emitted('update:draft')).toEqual([['x-client-ip']])
    expect(wrapper.emitted('keydown')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
    expect(wrapper.emitted('paste')).toHaveLength(1)
    expect(wrapper.emitted('removeHeader')).toEqual([['Cf-Connecting-Ip']])
  })

  it('keeps the forwarded-header editor conditional on the trust switch', async () => {
    const wrapper = mountPanel({ trustForwardedIp: false })
    expect(wrapper.find('[data-testid="forwarded-client-ip-headers-input"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Cf-Connecting-Ip')

    await wrapper.setProps({ trustForwardedIp: true })
    expect(wrapper.find('[data-testid="forwarded-client-ip-headers-input"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cf-Connecting-Ip')
  })
})
