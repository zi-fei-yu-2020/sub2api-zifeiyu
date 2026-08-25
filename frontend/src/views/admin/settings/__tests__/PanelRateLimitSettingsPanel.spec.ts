import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import PanelRateLimitSettingsPanel from '../PanelRateLimitSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const baseProps = {
  loading: false,
  saving: false,
  enabled: true,
  userRpm: 240,
  heavyRpm: 60,
  publicIpRpm: 300,
  exemptAdmin: true,
}

describe('PanelRateLimitSettingsPanel', () => {
  it('preserves the card, notice, grid and numeric input layout', () => {
    const wrapper = mount(PanelRateLimitSettingsPanel, {
      props: baseProps,
      global: { stubs: { Icon: true } },
    })

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.get('.grid').classes()).toEqual(
      expect.arrayContaining(['grid-cols-1', 'gap-6', 'sm:grid-cols-2']),
    )
    const inputs = wrapper.findAll('input[type="number"]')
    expect(inputs).toHaveLength(3)
    expect(inputs.every((input) => input.attributes('min') === '0')).toBe(true)
    expect(inputs.every((input) => input.attributes('max') === '100000')).toBe(true)
  })

  it('forwards both toggles, all RPM fields and save events', async () => {
    const wrapper = mount(PanelRateLimitSettingsPanel, {
      props: baseProps,
      global: { stubs: { Icon: true } },
    })
    const switches = wrapper.findAll('[role="switch"]')
    const inputs = wrapper.findAll('input[type="number"]')

    await switches[0].trigger('click')
    await switches[1].trigger('click')
    await inputs[0].setValue('120')
    await inputs[1].setValue('30')
    await inputs[2].setValue('180')
    await wrapper.get('[data-testid="panel-rate-limit-save"]').trigger('click')

    expect(wrapper.emitted('update:enabled')).toEqual([[false]])
    expect(wrapper.emitted('update:exemptAdmin')).toEqual([[false]])
    expect(wrapper.emitted('update:userRpm')).toEqual([[120]])
    expect(wrapper.emitted('update:heavyRpm')).toEqual([[30]])
    expect(wrapper.emitted('update:publicIpRpm')).toEqual([[180]])
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('keeps conditional, loading and saving states equivalent', async () => {
    const wrapper = mount(PanelRateLimitSettingsPanel, {
      props: { ...baseProps, enabled: false },
      global: { stubs: { Icon: true } },
    })
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(1)

    await wrapper.setProps({ loading: true })
    expect(wrapper.get('.animate-spin').classes()).toEqual(
      expect.arrayContaining(['h-4', 'w-4', 'rounded-full', 'border-b-2', 'border-primary-600']),
    )
    expect(wrapper.find('button.btn-primary').exists()).toBe(false)

    await wrapper.setProps({ loading: false, saving: true, enabled: true })
    const saveButton = wrapper.get('[data-testid="panel-rate-limit-save"]')
    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(saveButton.text()).toContain('common.saving')
  })
})
