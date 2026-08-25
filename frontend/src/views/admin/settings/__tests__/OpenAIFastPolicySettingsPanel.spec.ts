import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import OpenAIFastPolicySettingsPanel from '../OpenAIFastPolicySettingsPanel.vue'


vi.mock('@/views/admin/settings/OpenAIFastPolicyUserSelector.vue', () => ({
  default: {
    name: 'OpenAIFastPolicyUserSelector',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      `<button class="user-selector-stub" @click="$emit('update:modelValue', [9])">select user</button>`,
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.index ? `${key}:${params.index}` : key,
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

function mountPanel(rules = [{
  service_tier: 'all' as const,
  action: 'filter' as const,
  scope: 'all' as const,
  user_ids: [1],
  error_message: '',
  model_whitelist: ['gpt-5.6-sol'],
  fallback_action: 'pass' as const,
  fallback_error_message: '',
}]) {
  return mount(OpenAIFastPolicySettingsPanel, {
    props: { rules },
    global: {
      stubs: {
        Select: SelectStub,
      },
    },
  })
}

describe('OpenAIFastPolicySettingsPanel', () => {
  it('preserves the card, summary and three-column rule layout', () => {
    const wrapper = mountPanel()

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.get('.grid').classes()).toEqual(
      expect.arrayContaining(['grid-cols-1', 'gap-4', 'md:grid-cols-3']),
    )
    const summary = wrapper.get('[data-testid="openai-fast-policy-summary-0"]')
    expect(summary.text()).toContain('admin.settings.openaiFastPolicy.summaryTargetModels')
    expect(summary.text()).toContain('admin.settings.openaiFastPolicy.summaryOtherModels')
    expect(wrapper.findAll('select')).toHaveLength(4)
  })

  it('keeps rule, user and model editing wired to the shared model', async () => {
    const wrapper = mountPanel()
    const rules = wrapper.props('rules')

    await wrapper.get('.user-selector-stub').trigger('click')
    expect(rules[0].user_ids).toEqual([9])

    const addPatternButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('admin.settings.openaiFastPolicy.addModelPattern'))
    expect(addPatternButton).toBeDefined()
    await addPatternButton!.trigger('click')
    expect(rules[0].model_whitelist).toEqual(['gpt-5.6-sol', ''])

    const removePatternButtons = wrapper.findAll('button.shrink-0')
    await removePatternButtons[0].trigger('click')
    expect(rules[0].model_whitelist).toEqual([''])

    const addRuleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('admin.settings.openaiFastPolicy.addRule'))
    expect(addRuleButton).toBeDefined()
    await addRuleButton!.trigger('click')
    expect(rules).toHaveLength(2)
    expect(rules[1]).toMatchObject({
      service_tier: 'priority',
      action: 'filter',
      scope: 'all',
      user_ids: [],
      model_whitelist: [],
    })

    await wrapper.get('button[title="admin.settings.openaiFastPolicy.removeRule"]').trigger('click')
    expect(rules).toHaveLength(1)
  })

  it('keeps the empty state and add-rule action equivalent', async () => {
    const wrapper = mountPanel([])
    const rules = wrapper.props('rules')

    expect(wrapper.text()).toContain('admin.settings.openaiFastPolicy.empty')
    const addRuleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('admin.settings.openaiFastPolicy.addRule'))
    await addRuleButton!.trigger('click')

    expect(rules).toHaveLength(1)
    expect(wrapper.text()).not.toContain('admin.settings.openaiFastPolicy.empty')
  })
})
