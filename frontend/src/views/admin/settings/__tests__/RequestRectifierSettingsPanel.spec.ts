import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import RequestRectifierSettingsPanel from '../RequestRectifierSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const baseProps = {
  loading: false,
  saving: false,
  enabled: true,
  thinkingSignatureEnabled: true,
  thinkingBudgetEnabled: true,
  apiKeySignatureEnabled: true,
  apiKeySignaturePatterns: ['alpha', 'beta'],
}

describe('RequestRectifierSettingsPanel', () => {
  it('preserves the card, toggle and pattern layout classes', () => {
    const wrapper = mount(RequestRectifierSettingsPanel, { props: baseProps })

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(4)
    expect(wrapper.findAll('input')).toHaveLength(2)
    expect(wrapper.get('input').classes()).toEqual(
      expect.arrayContaining(['input', 'input-sm', 'flex-1']),
    )
  })

  it('forwards toggles, pattern edits and save events without mutating props', async () => {
    const wrapper = mount(RequestRectifierSettingsPanel, { props: baseProps })
    const switches = wrapper.findAll('[role="switch"]')

    await switches[0].trigger('click')
    await switches[1].trigger('click')
    await switches[2].trigger('click')
    await switches[3].trigger('click')
    await wrapper.findAll('input')[0].setValue('updated')
    await wrapper.get('button.text-red-500').trigger('click')
    await wrapper.get('button.text-primary-600').trigger('click')
    await wrapper.get('button.btn-primary').trigger('click')

    expect(wrapper.emitted('update:enabled')).toEqual([[false]])
    expect(wrapper.emitted('update:thinkingSignatureEnabled')).toEqual([[false]])
    expect(wrapper.emitted('update:thinkingBudgetEnabled')).toEqual([[false]])
    expect(wrapper.emitted('update:apiKeySignatureEnabled')).toEqual([[false]])
    expect(wrapper.emitted('update:apiKeySignaturePatterns')).toEqual([
      [['updated', 'beta']],
      [['beta']],
      [['alpha', 'beta', '']],
    ])
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(baseProps.apiKeySignaturePatterns).toEqual(['alpha', 'beta'])
  })

  it('keeps conditional, loading and saving states equivalent', async () => {
    const wrapper = mount(RequestRectifierSettingsPanel, { props: baseProps })
    expect(wrapper.text()).toContain('admin.settings.rectifier.apikeyPatterns')

    await wrapper.setProps({ apiKeySignatureEnabled: false })
    expect(wrapper.text()).not.toContain('admin.settings.rectifier.apikeyPatterns')

    await wrapper.setProps({ enabled: false })
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(1)

    await wrapper.setProps({ loading: true })
    expect(wrapper.get('.animate-spin').classes()).toEqual(
      expect.arrayContaining(['h-4', 'w-4', 'rounded-full', 'border-b-2', 'border-primary-600']),
    )
    expect(wrapper.find('button').exists()).toBe(false)

    await wrapper.setProps({ loading: false, saving: true })
    const saveButton = wrapper.get('button.btn-primary')
    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(saveButton.text()).toContain('common.saving')
  })
})
