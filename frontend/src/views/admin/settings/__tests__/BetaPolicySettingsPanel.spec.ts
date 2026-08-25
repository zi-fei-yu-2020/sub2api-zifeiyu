import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import BetaPolicySettingsPanel from '../BetaPolicySettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const SelectStub = defineComponent({
  props: {
    modelValue: { type: [String, Number, Boolean], default: '' },
    options: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'select',
        {
          value: props.modelValue,
          onChange: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLSelectElement).value),
        },
        (props.options as Array<{ value: string; label: string }>).map((option) =>
          h('option', { value: option.value }, option.label),
        ),
      )
  },
})

function mountPanel(overrides: Record<string, unknown> = {}) {
  return mount(BetaPolicySettingsPanel, {
    props: {
      loading: false,
      saving: false,
      rules: [
        {
          beta_token: 'context-1m-2025-08-07',
          action: 'block',
          scope: 'all',
          error_message: 'blocked',
          model_whitelist: ['custom-model'],
          fallback_action: 'block',
          fallback_error_message: 'fallback blocked',
        },
      ],
      ...overrides,
    },
    global: { stubs: { Select: SelectStub } },
  })
}

describe('BetaPolicySettingsPanel', () => {
  it('preserves rule-card, grid, whitelist and fallback layout classes', () => {
    const wrapper = mountPanel()

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.get('.grid').classes()).toEqual(
      expect.arrayContaining(['grid-cols-1', 'gap-4', 'sm:grid-cols-2']),
    )
    expect(wrapper.get('input[type="text"]').classes()).toContain('input')
    expect(wrapper.findAll('select')).toHaveLength(3)
  })

  it('keeps presets, model patterns and save behavior wired to the model', async () => {
    const wrapper = mountPanel()
    const rules = wrapper.props('rules')

    const presetButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('admin.settings.betaPolicy.presetOpusOnly'))
    expect(presetButton).toBeDefined()
    await presetButton!.trigger('click')

    expect(rules[0]).toMatchObject({
      action: 'pass',
      model_whitelist: ['claude-opus-4-6'],
      fallback_action: 'filter',
    })

    const quickPatternButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'claude-sonnet-*')
    expect(quickPatternButton).toBeDefined()
    await quickPatternButton!.trigger('click')
    expect(rules[0].model_whitelist).toEqual(['claude-opus-4-6', 'claude-sonnet-*'])

    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('admin.settings.betaPolicy.addModelPattern'))
    expect(addButton).toBeDefined()
    await addButton!.trigger('click')
    expect(rules[0].model_whitelist?.at(-1)).toBe('')

    await wrapper.get('button.btn-primary').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('keeps loading and saving states equivalent', async () => {
    const wrapper = mountPanel({ loading: true })
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
