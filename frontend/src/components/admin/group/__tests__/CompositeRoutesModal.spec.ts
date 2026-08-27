import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CompositeRoutesModal from '../CompositeRoutesModal.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const BaseDialogStub = {
  props: ['show'],
  template: '<div v-if="show"><slot /><slot name="footer" /></div>'
}

const SelectStub = {
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>'
}

describe('CompositeRoutesModal', () => {
  it('keeps form editing and submit actions connected to the parent state', async () => {
    const form = {
      public_model: '',
      match_type: 'exact' as const,
      target_platform: 'openai' as const,
      upstream_model: '',
      endpoint: 'any' as const,
      priority: 100,
      enabled: true,
      notes: ''
    }
    const wrapper = mount(CompositeRoutesModal, {
      props: {
        show: true,
        group: { id: 9, name: 'Composite', platform: 'composite' },
        routes: [],
        loading: false,
        saving: false,
        editingId: null,
        previewModel: '',
        previewEndpoint: 'any',
        previewLoading: false,
        previewDecision: null,
        form
      },
      global: { stubs: { BaseDialog: BaseDialogStub, Select: SelectStub, Icon: true, PlatformIcon: true } }
    })

    const textInputs = wrapper.findAll('input[type="text"]')
    await textInputs[0].setValue('openrouter/gpt-5')
    await wrapper.get('form').trigger('submit')

    expect(form.public_model).toBe('openrouter/gpt-5')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('forwards reload and close without changing the dialog workflow', async () => {
    const wrapper = mount(CompositeRoutesModal, {
      props: {
        show: true,
        group: { id: 9, name: 'Composite', platform: 'composite' },
        routes: [],
        loading: false,
        saving: false,
        editingId: null,
        previewModel: '',
        previewEndpoint: 'any',
        previewLoading: false,
        previewDecision: null,
        form: { public_model: '', match_type: 'exact', target_platform: 'openai', upstream_model: '', endpoint: 'any', priority: 100, enabled: true, notes: '' }
      },
      global: { stubs: { BaseDialog: BaseDialogStub, Select: SelectStub, Icon: true, PlatformIcon: true } }
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons.at(-1)!.trigger('click')

    expect(wrapper.emitted('reload')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
