import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import OverloadCooldownSettingsPanel from '../OverloadCooldownSettingsPanel.vue'
import RateLimit429CooldownSettingsPanel from '../RateLimit429CooldownSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('Gateway cooldown settings panels', () => {
  it('preserves the 529 card layout and forwards model/save events', async () => {
    const wrapper = mount(OverloadCooldownSettingsPanel, {
      props: {
        loading: false,
        saving: false,
        enabled: true,
        cooldownMinutes: 10,
      },
    })

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.get('input').classes()).toEqual(expect.arrayContaining(['input', 'w-32']))

    await wrapper.get('[role="switch"]').trigger('click')
    await wrapper.get('input').setValue('25')
    await wrapper.get('button.btn-primary').trigger('click')

    expect(wrapper.emitted('update:enabled')).toEqual([[false]])
    expect(wrapper.emitted('update:cooldownMinutes')).toEqual([[25]])
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('preserves the 429 card layout and forwards model/save events', async () => {
    const wrapper = mount(RateLimit429CooldownSettingsPanel, {
      props: {
        loading: false,
        saving: false,
        enabled: true,
        cooldownSeconds: 5,
      },
    })

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('input').attributes()).toMatchObject({
      type: 'number',
      min: '1',
      max: '7200',
    })

    await wrapper.get('[role="switch"]').trigger('click')
    await wrapper.get('input').setValue('45')
    await wrapper.get('button.btn-primary').trigger('click')

    expect(wrapper.emitted('update:enabled')).toEqual([[false]])
    expect(wrapper.emitted('update:cooldownSeconds')).toEqual([[45]])
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('keeps loading and saving states visually and behaviorally equivalent', () => {
    const loadingWrapper = mount(OverloadCooldownSettingsPanel, {
      props: {
        loading: true,
        saving: false,
        enabled: true,
        cooldownMinutes: 10,
      },
    })
    expect(loadingWrapper.get('.animate-spin').classes()).toEqual(
      expect.arrayContaining(['h-4', 'w-4', 'rounded-full', 'border-b-2', 'border-primary-600']),
    )
    expect(loadingWrapper.find('button').exists()).toBe(false)

    const savingWrapper = mount(RateLimit429CooldownSettingsPanel, {
      props: {
        loading: false,
        saving: true,
        enabled: true,
        cooldownSeconds: 5,
      },
    })
    const saveButton = savingWrapper.get('button.btn-primary')
    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(saveButton.text()).toContain('common.saving')
    expect(saveButton.get('svg').classes()).toEqual(
      expect.arrayContaining(['mr-1', 'h-4', 'w-4', 'animate-spin']),
    )
  })
})
