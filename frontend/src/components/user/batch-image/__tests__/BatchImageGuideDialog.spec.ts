import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BatchImageGuideDialog from '../BatchImageGuideDialog.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const BaseDialogStub = {
  props: ['show', 'title'],
  emits: ['close'],
  template: '<section><button data-testid="dialog-close" @click="$emit(\'close\')">close</button><slot /><slot name="footer" /></section>'
}

describe('BatchImageGuideDialog', () => {
  it('keeps the generated agent instruction intact and forwards copy and close actions', async () => {
    const copyInstruction = vi.fn()
    const closeGuide = vi.fn()
    const instruction = 'name: sub2api-batch-image\nNever store API keys in resume files.'
    const wrapper = mount(BatchImageGuideDialog, {
      props: { showGuideModal: true, agentInstruction: instruction, copyInstruction, closeGuide },
      global: { stubs: { BaseDialog: BaseDialogStub, Icon: true } }
    })

    expect(wrapper.get('textarea').element.value).toBe(instruction)
    await wrapper.get('[data-testid="dialog-close"]').trigger('click')
    await wrapper.findAll('button').at(-1)!.trigger('click')

    expect(closeGuide).toHaveBeenCalledTimes(1)
    expect(copyInstruction).toHaveBeenCalledTimes(1)
  })
})
