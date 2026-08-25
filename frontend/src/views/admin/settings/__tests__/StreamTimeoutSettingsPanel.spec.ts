import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import StreamTimeoutSettingsPanel from '../StreamTimeoutSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const baseProps = {
  loading: false,
  saving: false,
  enabled: true,
  action: 'temp_unsched' as const,
  tempUnschedMinutes: 5,
  thresholdCount: 3,
  thresholdWindowMinutes: 10,
}

describe('StreamTimeoutSettingsPanel', () => {
  it('preserves the card layout and numeric input constraints', () => {
    const wrapper = mount(StreamTimeoutSettingsPanel, { props: baseProps })

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.get('select').classes()).toEqual(expect.arrayContaining(['input', 'w-64']))
    expect(wrapper.findAll('input').map((input) => input.attributes())).toEqual([
      expect.objectContaining({ type: 'number', min: '1', max: '60' }),
      expect.objectContaining({ type: 'number', min: '1', max: '10' }),
      expect.objectContaining({ type: 'number', min: '1', max: '60' }),
    ])
  })

  it('forwards toggle, action, numeric and save events', async () => {
    const wrapper = mount(StreamTimeoutSettingsPanel, { props: baseProps })

    await wrapper.get('[role="switch"]').trigger('click')
    await wrapper.get('select').setValue('error')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('8')
    await inputs[1].setValue('4')
    await inputs[2].setValue('12')
    await wrapper.get('button.btn-primary').trigger('click')

    expect(wrapper.emitted('update:enabled')).toEqual([[false]])
    expect(wrapper.emitted('update:action')).toEqual([['error']])
    expect(wrapper.emitted('update:tempUnschedMinutes')).toEqual([[8]])
    expect(wrapper.emitted('update:thresholdCount')).toEqual([[4]])
    expect(wrapper.emitted('update:thresholdWindowMinutes')).toEqual([[12]])
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('keeps conditional, loading and saving states equivalent', async () => {
    const wrapper = mount(StreamTimeoutSettingsPanel, { props: baseProps })
    expect(wrapper.text()).toContain('admin.settings.streamTimeout.tempUnschedMinutes')

    await wrapper.setProps({ action: 'error' })
    expect(wrapper.text()).not.toContain('admin.settings.streamTimeout.tempUnschedMinutes')

    await wrapper.setProps({ loading: true })
    expect(wrapper.get('.animate-spin').classes()).toEqual(
      expect.arrayContaining(['h-4', 'w-4', 'rounded-full', 'border-b-2', 'border-primary-600']),
    )
    expect(wrapper.find('button').exists()).toBe(false)

    await wrapper.setProps({ loading: false, saving: true })
    const button = wrapper.get('button.btn-primary')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('common.saving')
  })
})
