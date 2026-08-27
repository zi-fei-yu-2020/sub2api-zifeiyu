import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BatchImageCreateDialog from '../BatchImageCreateDialog.vue'
import type { ApiKey } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => params ? `${key}:${JSON.stringify(params)}` : key
  })
}))

const BaseDialogStub = {
  props: ['show', 'title'],
  emits: ['close'],
  template: '<section><button data-testid="dialog-close" @click="$emit(\'close\')">close</button><slot /><slot name="footer" /></section>'
}

const apiKey = {
  id: 7,
  name: 'Gemini key',
  status: 'active',
  group: { name: 'Gemini', platform: 'gemini', allow_batch_image_generation: true }
} as unknown as ApiKey

describe('BatchImageCreateDialog', () => {
  it('keeps form mutations, draft models and prompt actions connected to the parent state', async () => {
    const form = { taskName: '', apiKeyId: 7, model: 'gemini-2.5-flash-image', responseMimeType: 'image/png' }
    const addPromptRow = vi.fn()
    const removePromptRow = vi.fn()
    const closeCreateModal = vi.fn()
    const wrapper = mount(BatchImageCreateDialog, {
      props: {
        showCreateModal: true,
        form,
        loadingKeys: false,
        geminiApiKeys: [apiKey],
        loadingModels: false,
        availableBatchImageModels: [{ value: 'gemini-2.5-flash-image', label: 'Gemini Image' }],
        modelLoadError: '',
        selectedApiKey: apiKey,
        estimatedOutputCount: 2,
        promptRows: [{ localId: 'row-1', custom_id: 'img_001', prompt: 'A mountain', output_count: 2, reference_images: [] }],
        promptDraft: 'Initial prompt',
        customIdDraft: 'img_002',
        outputCountDraft: 1,
        outputCountOptions: [1, 2, 3, 4],
        referenceImageDrafts: [],
        selectedModelReferenceLimit: 3,
        maxOutputsPerItem: 4,
        maxOutputsPerJob: 200,
        parsedItems: [{ custom_id: 'img_001', prompt: 'A mountain', output_count: 2, reference_images: [] }],
        submitting: false,
        closeCreateModal,
        submitJob: vi.fn(),
        batchImageText: (key: string) => key,
        handleReferenceImageFiles: vi.fn(),
        removeReferenceImageDraft: vi.fn(),
        addPromptRow,
        removePromptRow
      },
      global: { stubs: { BaseDialog: BaseDialogStub, Icon: true } }
    })

    await wrapper.get('input[maxlength="255"]').setValue('New task')
    await wrapper.get('textarea').setValue('Updated prompt')
    const addButton = wrapper.findAll('button').find(button => button.text().includes('common.add'))!
    await addButton.trigger('click')
    const deleteButton = wrapper.findAll('button').find(button => button.attributes('title') === 'common.delete')!
    await deleteButton.trigger('click')
    await wrapper.get('[data-testid="dialog-close"]').trigger('click')

    expect(form.taskName).toBe('New task')
    expect(wrapper.emitted('update:promptDraft')?.at(-1)).toEqual(['Updated prompt'])
    expect(addPromptRow).toHaveBeenCalledTimes(1)
    expect(removePromptRow).toHaveBeenCalledWith(0)
    expect(closeCreateModal).toHaveBeenCalledTimes(1)
  })
})
