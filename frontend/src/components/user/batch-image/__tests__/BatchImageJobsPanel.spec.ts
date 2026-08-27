import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BatchImageJobsPanel from '../BatchImageJobsPanel.vue'
import type { BatchImageJobRow } from '../types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const row: BatchImageJobRow = {
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
  downloaded_at: null,
  api_key_id: 7,
  api_key_name: 'Gemini key',
  child_count: 0
}

const DataTableStub = {
  props: ['data'],
  template: `
    <div>
      <slot name="header-select" />
      <div v-for="row in data" :key="row.id">
        <slot name="cell-id" :row="row" />
        <slot name="cell-actions" :row="row" />
      </div>
    </div>
  `
}

const SelectStub = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<button data-testid="select" @click="$emit(\'change\', modelValue)">select</button>'
}

const SearchInputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'search'],
  template: '<button data-testid="search" @click="$emit(\'search\')">search</button>'
}

function createProps() {
  return {
    columns: [],
    filters: { taskName: '', apiKeyId: '', status: '', downloaded: '' },
    apiKeyFilterOptions: [],
    statusFilterOptions: [],
    downloadFilterOptions: [],
    batchPageSizeOptions: [],
    loadingJobs: false,
    loadingKeys: false,
    selectedJobIds: new Set(['batch-1']),
    selectedDownloadableRows: [row],
    bulkDownloading: false,
    bulkDeleting: false,
    visibleBatchJobs: [row],
    batchJobs: [row],
    allVisibleSelected: true,
    someVisibleSelected: false,
    expandedParentIds: new Set<string>(),
    pagination: { page: 1, page_size: 20, has_more: true },
    openMoreJobId: '',
    moreMenuStyle: {},
    retryingBatchId: '',
    deletingBatchId: '',
    promptPopover: { visible: false, text: '', style: {} },
    downloading: false,
    applyFilters: vi.fn(),
    resetFilters: vi.fn(),
    refreshPage: vi.fn(),
    openGuide: vi.fn(),
    openCreateModal: vi.fn(),
    downloadSelectedJobs: vi.fn(),
    deleteSelectedJobs: vi.fn(),
    toggleAllVisible: vi.fn(),
    toggleJobSelection: vi.fn(),
    hasChildJobs: vi.fn(() => false),
    toggleChildRows: vi.fn(),
    showPromptPopover: vi.fn(),
    schedulePromptPopoverClose: vi.fn(),
    statusBadgeClass: vi.fn(() => 'badge-success'),
    statusLabel: vi.fn(() => 'completed'),
    displayJob: vi.fn((job: BatchImageJobRow) => job),
    costLabel: vi.fn(() => '$0.80'),
    formatDate: vi.fn(() => '2026-08-27'),
    defaultTaskName: vi.fn(() => 'Default task'),
    selectJob: vi.fn(),
    canDownload: vi.fn(() => true),
    isDownloadingJob: vi.fn(() => false),
    downloadJob: vi.fn(),
    canRetry: vi.fn(() => false),
    canDeleteRecord: vi.fn(() => false),
    toggleMoreMenu: vi.fn(),
    handlePageSizeChange: vi.fn(),
    handlePageChange: vi.fn(),
    retryFailedJob: vi.fn(),
    deleteJob: vi.fn(),
    cancelPromptPopoverClose: vi.fn(),
    copyPromptPopover: vi.fn()
  }
}

describe('BatchImageJobsPanel', () => {
  it('forwards list toolbar, selection, detail and download actions without changing row payloads', async () => {
    const props = createProps()
    const wrapper = mount(BatchImageJobsPanel, {
      props,
      global: {
        stubs: {
          TablePageLayout: { template: '<section><slot name="filters"/><slot name="table"/><slot name="pagination"/></section>' },
          DataTable: DataTableStub,
          Select: SelectStub,
          SearchInput: SearchInputStub,
          Icon: true,
          Teleport: true,
          'i18n-t': { template: '<span><slot name="count" /></span>' }
        }
      }
    })

    await wrapper.get('[data-testid="batch-image-open-guide"]').trigger('click')
    await wrapper.get('[data-testid="batch-image-open-create"]').trigger('click')
    await wrapper.get('[data-testid="batch-image-download-selected"]').trigger('click')
    await wrapper.get('[data-testid="batch-image-delete-selected"]').trigger('click')
    await wrapper.get('[data-testid="batch-image-view-detail"]').trigger('click')
    await wrapper.get('[data-testid="batch-image-download-row"]').trigger('click')

    expect(props.openGuide).toHaveBeenCalledTimes(1)
    expect(props.openCreateModal).toHaveBeenCalledTimes(1)
    expect(props.downloadSelectedJobs).toHaveBeenCalledTimes(1)
    expect(props.deleteSelectedJobs).toHaveBeenCalledTimes(1)
    expect(props.selectJob).toHaveBeenCalledWith('batch-1')
    expect(props.downloadJob).toHaveBeenCalledWith(row)
  })
})
