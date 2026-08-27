import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BatchImageDetailDialog from '../BatchImageDetailDialog.vue'
import type { BatchImageDetailItem } from '../types'
import type { BatchImageJob } from '@/api/batchImage'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const BaseDialogStub = {
  props: ['show', 'title'],
  emits: ['close'],
  template: '<section><button data-testid="dialog-close" @click="$emit(\'close\')">close</button><slot /><slot name="footer" /></section>'
}

const job = {
  id: 'batch-1',
  task_name: 'Task one',
  parent_batch_id: '',
  status: 'completed',
  model: 'gemini-image',
  provider: 'gemini',
  item_count: 1,
  success_count: 1,
  fail_count: 0,
  estimated_cost: 1,
  hold_amount: 1,
  actual_cost: 0.8,
  created_at: 1_787_788_800,
  downloaded_at: null
} as BatchImageJob

const item = {
  batch_id: 'batch-1',
  source_task_name: 'Task one',
  custom_id: 'img_001',
  prompt: 'A mountain',
  prompt_preview: 'A mountain',
  status: 'completed',
  image_count: 1,
  error: null
} as BatchImageDetailItem

describe('BatchImageDetailDialog', () => {
  it('keeps detail refresh, prompt popover and preview actions wired to the selected item', async () => {
    const refreshDetail = vi.fn()
    const showPromptPopover = vi.fn()
    const loadItemPreview = vi.fn()
    const closeDetail = vi.fn()
    const wrapper = mount(BatchImageDetailDialog, {
      props: {
        currentJob: job,
        currentDisplayJob: job,
        items: [item],
        loadingItems: false,
        refreshing: false,
        cancelling: false,
        retryingBatchId: '',
        downloading: false,
        previewImageItem: null,
        previewImageUrl: '',
        itemPreviewUrls: {},
        previewLoadingIds: new Set<string>(),
        previewErrorIds: new Set<string>(),
        recoveredOriginalCustomIds: new Set<string>(),
        closeDetail,
        statusBadgeClass: () => 'badge-success',
        statusLabel: () => 'completed',
        hasChildJobs: () => false,
        costLabel: () => '$0.80',
        formatDate: () => '2026-08-27',
        refreshDetail,
        schedulePromptPopoverOpen: vi.fn(),
        schedulePromptPopoverClose: vi.fn(),
        showPromptPopover,
        detailItemRowClass: () => '',
        isRecoveredOriginalFailure: () => false,
        itemDisplayStatusBadgeClass: () => 'badge-success',
        itemDisplayStatusLabel: () => 'completed',
        friendlyItemError: () => '',
        itemPreviewKey: () => 'batch-1:img_001',
        openImagePreview: vi.fn(),
        canLoadItemPreview: () => true,
        loadItemPreview,
        handlePreviewError: vi.fn(),
        itemResultClass: () => 'text-green-600',
        itemResultLabel: () => '1 image',
        canCancel: () => false,
        cancelSelected: vi.fn(),
        canRetry: () => false,
        retrySelected: vi.fn(),
        canDownload: () => true,
        downloadSelected: vi.fn(),
        isDownloadingJob: () => false,
        closeImagePreview: vi.fn()
      },
      global: { stubs: { BaseDialog: BaseDialogStub, Icon: true } }
    })

    const buttons = wrapper.findAll('button')
    await buttons.find(button => button.text().includes('common.refresh'))!.trigger('click')
    await wrapper.get('.batch-prompt-trigger').trigger('click')
    await buttons.find(button => button.attributes('title') === 'batchImage.detail.previewLoad')!.trigger('click')
    await wrapper.get('[data-testid="dialog-close"]').trigger('click')

    expect(refreshDetail).toHaveBeenCalledTimes(1)
    expect(showPromptPopover).toHaveBeenCalledWith(expect.anything(), 'A mountain')
    expect(loadItemPreview).toHaveBeenCalledWith(item)
    expect(closeDetail).toHaveBeenCalledTimes(1)
  })
})
