import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GroupSortOrderModal from '../GroupSortOrderModal.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const BaseDialogStub = {
  props: ['show'],
  template: '<div v-if="show"><slot /><slot name="footer" /></div>'
}

describe('GroupSortOrderModal', () => {
  it('preserves the existing cancel and save actions', async () => {
    const wrapper = mount(GroupSortOrderModal, {
      props: {
        show: true,
        submitting: false,
        groups: [{ id: 1, name: 'A', platform: 'openai', sort_order: 1 }]
      },
      global: {
        stubs: {
          BaseDialog: BaseDialogStub,
          VueDraggable: { props: ['modelValue'], template: '<div><slot /></div>' },
          Icon: true
        }
      }
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
