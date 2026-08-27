<template>
    <TablePageLayout>
      <template #filters>
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[260px_160px_144px_152px] 2xl:w-auto">
              <div class="min-w-0">
                <SearchInput
                  v-model="filters.taskName"
                  :placeholder="t('batchImage.filters.searchTaskName')"
                  class="w-full"
                  @search="applyFilters"
                />
              </div>
              <Select v-model="filters.apiKeyId" :options="apiKeyFilterOptions" class="w-full" @change="applyFilters" />
              <Select v-model="filters.status" :options="statusFilterOptions" class="w-full" @change="applyFilters" />
              <Select v-model="filters.downloaded" :options="downloadFilterOptions" class="w-full" @change="applyFilters" />
            </div>
            <div class="flex flex-wrap items-center justify-start gap-2 sm:justify-end 2xl:flex-shrink-0">
              <button type="button" class="btn btn-secondary" :disabled="loadingJobs" @click="resetFilters">
                {{ t('common.reset') }}
              </button>
              <button type="button" class="btn btn-secondary" :disabled="loadingKeys || loadingJobs" :title="t('common.refresh')" @click="refreshPage">
                <Icon name="refresh" size="md" :class="loadingKeys || loadingJobs ? 'animate-spin' : ''" />
              </button>
              <button type="button" data-testid="batch-image-open-guide" class="btn btn-secondary" @click="openGuide">
                <Icon name="book" size="md" class="mr-2" />
                {{ t('batchImage.actions.usageGuide') }}
              </button>
              <button type="button" data-testid="batch-image-open-create" class="btn btn-primary" @click="openCreateModal">
                <Icon name="plus" size="md" class="mr-2" />
                {{ t('batchImage.actions.createJob') }}
              </button>
            </div>
          </div>

          <div
            v-if="selectedJobIds.size"
            class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-dark-700 dark:bg-dark-800"
          >
            <i18n-t
              keypath="batchImage.list.selectedJobs"
              tag="span"
              scope="global"
              :plural="selectedJobIds.size"
              class="text-sm text-gray-600 dark:text-gray-300"
            >
              <template #count>
                <span class="font-medium text-gray-900 dark:text-white">{{ selectedJobIds.size }}</span>
              </template>
            </i18n-t>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="batch-image-download-selected"
                class="btn btn-secondary btn-sm"
                :disabled="bulkDownloading || selectedDownloadableRows.length === 0"
                @click="downloadSelectedJobs"
              >
                <Icon :name="bulkDownloading ? 'refresh' : 'download'" size="sm" class="mr-1.5" :class="bulkDownloading ? 'animate-spin' : ''" />
                {{ t('batchImage.actions.downloadSelected') }}
              </button>
              <button
                type="button"
                data-testid="batch-image-delete-selected"
                class="btn btn-secondary btn-sm text-red-600 hover:text-red-700 dark:text-red-400"
                :disabled="bulkDeleting"
                @click="deleteSelectedJobs"
              >
                <Icon :name="bulkDeleting ? 'refresh' : 'trash'" size="sm" class="mr-1.5" :class="bulkDeleting ? 'animate-spin' : ''" />
                {{ t('batchImage.actions.deleteRecords') }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <template #table>
        <DataTable
          :columns="columns"
          :data="visibleBatchJobs"
          :loading="loadingKeys || loadingJobs"
          :expandable-actions="false"
          row-key="id"
        >
          <template #header-select>
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              :checked="allVisibleSelected"
              :indeterminate="someVisibleSelected"
              @change="toggleAllVisible(($event.target as HTMLInputElement).checked)"
            />
          </template>

          <template #cell-select="{ row }">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              :checked="selectedJobIds.has(row.id)"
              @change="toggleJobSelection(row.id, ($event.target as HTMLInputElement).checked)"
              @click.stop
            />
          </template>

          <template #cell-id="{ row }">
	            <div class="flex w-[220px] items-start gap-1" :class="row.is_child ? 'pl-6' : ''">
	              <button
	                v-if="row.child_count > 0 && !row.is_child"
	                type="button"
	                class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-white"
	                :title="expandedParentIds.has(row.id) ? t('batchImage.list.collapseChildren') : t('batchImage.list.expandChildren', { n: row.child_count }, row.child_count)"
	                @click.stop="toggleChildRows(row.id)"
	              >
	                <Icon :name="expandedParentIds.has(row.id) ? 'chevronDown' : 'chevronRight'" size="xs" />
	              </button>
	              <span v-else class="w-6 flex-shrink-0" />
	              <button type="button" class="min-w-0 flex-1 rounded-md py-1 text-left transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:hover:bg-dark-700" @click="selectJob(row.id)">
	                <span
	                  class="flex min-w-0 items-center gap-2 text-sm font-medium"
	                  :class="row.task_name ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'"
                >
                  <span class="min-w-0 truncate">{{ row.task_name || defaultTaskName(row.created_at) }}</span>
                  <span v-if="row.child_count > 0 && !row.is_child" class="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600 dark:bg-dark-700 dark:text-gray-300">
                    {{ t('batchImage.list.childCount', { n: row.child_count }, row.child_count) }}
                  </span>
                  <span v-if="row.is_child" class="flex-shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                    {{ t('batchImage.list.childBadge') }}
                  </span>
	                </span>
	                <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
	                  <span>{{ formatDate(row.created_at) }}</span>
	                </span>
	              </button>
	            </div>
	          </template>

          <template #cell-model="{ row }">
	            <div class="mx-auto max-w-[180px] text-center">
	              <p class="truncate text-sm text-gray-700 dark:text-gray-300" :title="row.model">{{ row.model }}</p>
	            </div>
	          </template>

          <template #cell-api_key_name="{ value }">
            <span class="block truncate text-center text-sm text-gray-700 dark:text-gray-300">
              {{ value || t('batchImage.list.keyNotRecorded') }}
            </span>
          </template>

          <template #cell-status="{ row }">
            <div class="flex justify-center">
              <span :class="statusBadgeClass(displayJob(row))" class="badge">
                {{ statusLabel(displayJob(row)) }}
              </span>
            </div>
          </template>

          <template #cell-counts="{ row }">
            <div class="flex items-center justify-center gap-2 text-sm tabular-nums">
              <span class="text-blue-600 dark:text-emerald-300">{{ displayJob(row).success_count }}</span>
              <span class="text-gray-300 dark:text-dark-500">/</span>
              <span :class="displayJob(row).fail_count > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-400 dark:text-gray-500'">{{ displayJob(row).fail_count }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ t('batchImage.list.totalCount', { n: displayJob(row).item_count }) }}</span>
            </div>
          </template>

          <template #cell-cost="{ row }">
            <span class="block text-center text-sm text-gray-700 dark:text-gray-300">
              {{ costLabel(displayJob(row)) }}
            </span>
          </template>

          <template #cell-downloaded="{ row }">
            <span class="block text-center text-sm" :class="row.downloaded_at ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'">
              {{ row.downloaded_at ? formatDate(row.downloaded_at) : t('batchImage.list.notDownloaded') }}
            </span>
          </template>

	          <template #cell-actions="{ row }">
	            <div class="flex items-center justify-center gap-1">
              <button
                type="button"
                data-testid="batch-image-view-detail"
                class="batch-row-action flex flex-col items-center gap-0.5 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:hover:bg-dark-700 dark:hover:text-primary-400"
                :title="t('batchImage.actions.viewDetail')"
                @click="selectJob(row.id)"
              >
                <Icon name="eye" size="sm" />
                <span class="text-xs">{{ t('common.view') }}</span>
              </button>
              <button
                type="button"
                data-testid="batch-image-download-row"
                class="batch-row-action flex flex-col items-center gap-0.5 rounded-md p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                :class="canDownload(row) ? 'text-gray-500 hover:bg-blue-50 hover:text-primary-600 dark:hover:bg-blue-900/20 dark:hover:text-green-400' : 'text-gray-300 dark:text-dark-500'"
                :disabled="!canDownload(row) || downloading"
                :title="t('batchImage.actions.downloadZip')"
                @click="downloadJob(row)"
              >
                <Icon
                  :name="isDownloadingJob(row.id) ? 'refresh' : 'download'"
	                  size="sm"
	                  :class="isDownloadingJob(row.id) ? 'animate-spin' : ''"
	                />
                <span class="text-xs">{{ t('batchImage.actions.download') }}</span>
	              </button>
              <div v-if="canRetry(row) || canDeleteRecord(row)">
                <button
                  type="button"
                  class="batch-row-action flex flex-col items-center gap-0.5 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:hover:bg-dark-700 dark:hover:text-white"
                  :class="{ 'bg-gray-100 text-gray-900 dark:bg-dark-700 dark:text-white': openMoreJobId === row.id }"
                  :title="t('batchImage.actions.moreActions')"
                  @click.stop="toggleMoreMenu(row, $event)"
                >
                  <Icon name="more" size="sm" />
                  <span class="text-xs">{{ t('common.more') }}</span>
                </button>
              </div>
	            </div>
	          </template>

          <template #empty>
            <div class="flex min-h-[260px] flex-col items-center justify-center py-6 md:min-h-[300px]">
              <Icon name="sparkles" size="xl" class="mb-4 h-12 w-12 text-gray-400 dark:text-dark-500" />
              <p class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ t('batchImage.list.empty') }}</p>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ t('batchImage.list.emptyHint') }}
              </p>
            </div>
          </template>
        </DataTable>
      </template>

      <template #pagination>
        <div
          v-if="visibleBatchJobs.length > 0 || pagination.page > 1"
          class="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 dark:border-dark-700 dark:bg-dark-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <i18n-t keypath="batchImage.pagination.pageNumber" tag="span" scope="global">
              <template #page>
                <span class="font-medium">{{ pagination.page }}</span>
              </template>
            </i18n-t>
            <i18n-t keypath="batchImage.pagination.pageItems" tag="span" scope="global">
              <template #count>
                <span class="font-medium">{{ visibleBatchJobs.length }}</span>
              </template>
            </i18n-t>
            <div class="flex items-center gap-2">
              <span>{{ t('pagination.perPage') }}</span>
              <Select
                v-model="pagination.page_size"
                :options="batchPageSizeOptions"
                class="w-24"
                @change="handlePageSizeChange"
              />
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              :disabled="pagination.page <= 1 || loadingJobs"
              @click="handlePageChange(pagination.page - 1)"
            >
              <Icon name="chevronLeft" size="sm" class="mr-1" />
              {{ t('pagination.previous') }}
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              :disabled="!pagination.has_more || loadingJobs"
              @click="handlePageChange(pagination.page + 1)"
            >
              {{ t('pagination.next') }}
              <Icon name="chevronRight" size="sm" class="ml-1" />
            </button>
          </div>
        </div>
      </template>
    </TablePageLayout>

    <Teleport to="body">
      <div
        v-if="openMoreJobId"
        class="fixed z-[9999] w-44 overflow-hidden rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 dark:bg-dark-800 dark:ring-white/10"
        :style="moreMenuStyle"
        @click.stop
      >
        <template v-for="job in batchJobs" :key="job.id">
          <template v-if="job.id === openMoreJobId">
            <button
              v-if="canRetry(job)"
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:opacity-60 dark:text-gray-200 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
              :disabled="retryingBatchId === job.id"
              @click="retryFailedJob(job)"
            >
              <Icon name="refresh" size="sm" :class="retryingBatchId === job.id ? 'animate-spin' : ''" />
              {{ t('batchImage.actions.retryFailedItems') }}
            </button>
            <button
              v-if="canDeleteRecord(job)"
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/20"
              :disabled="deletingBatchId === job.id"
              @click="deleteJob(job)"
            >
              <Icon :name="deletingBatchId === job.id ? 'refresh' : 'trash'" size="sm" :class="deletingBatchId === job.id ? 'animate-spin' : ''" />
              {{ t('batchImage.actions.deleteRecords') }}
            </button>
          </template>
        </template>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="promptPopover.visible"
        class="batch-prompt-popover fixed z-[9999] rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-xl ring-1 ring-black/5 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-100 dark:ring-white/10"
        :style="promptPopover.style"
        @mouseenter="cancelPromptPopoverClose"
        @mouseleave="schedulePromptPopoverClose"
      >
        <div class="mb-2 flex items-center justify-between gap-3">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('batchImage.promptPopover.title') }}</span>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:text-primary-300 dark:hover:bg-primary-900/20"
            @click="copyPromptPopover"
          >
            {{ t('common.copy') }}
          </button>
        </div>
        <p class="max-h-48 overflow-y-auto whitespace-pre-wrap break-words leading-6 selection:bg-primary-100 selection:text-primary-900 dark:selection:bg-primary-900/60 dark:selection:text-primary-100">
          {{ promptPopover.text }}
        </p>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import DataTable from '@/components/common/DataTable.vue'
import Select, { type SelectOption } from '@/components/common/Select.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import Icon from '@/components/icons/Icon.vue'
import type { Column } from '@/components/common/types'
import type { BatchImageJob, BatchImageStatus } from '@/api/batchImage'
import type {
  BatchImageFilters,
  BatchImageJobRow,
  BatchImagePagination,
  BatchImagePromptPopover,
} from './types'

const props = defineProps<{
  columns: Column[]
  filters: BatchImageFilters
  apiKeyFilterOptions: SelectOption[]
  statusFilterOptions: SelectOption[]
  downloadFilterOptions: SelectOption[]
  batchPageSizeOptions: SelectOption[]
  loadingJobs: boolean
  loadingKeys: boolean
  selectedJobIds: Set<string>
  selectedDownloadableRows: BatchImageJobRow[]
  bulkDownloading: boolean
  bulkDeleting: boolean
  visibleBatchJobs: BatchImageJobRow[]
  batchJobs: BatchImageJobRow[]
  allVisibleSelected: boolean
  someVisibleSelected: boolean
  expandedParentIds: Set<string>
  pagination: BatchImagePagination
  openMoreJobId: string
  moreMenuStyle: Record<string, string>
  retryingBatchId: string
  deletingBatchId: string
  promptPopover: BatchImagePromptPopover
  downloading: boolean
  applyFilters: () => void
  resetFilters: () => void
  refreshPage: () => void | Promise<void>
  openGuide: () => void
  openCreateModal: () => void
  downloadSelectedJobs: () => void | Promise<void>
  deleteSelectedJobs: () => void | Promise<void>
  toggleAllVisible: (checked: boolean) => void
  toggleJobSelection: (batchId: string, checked: boolean) => void
  hasChildJobs: (batchId: string) => boolean
  toggleChildRows: (batchId: string) => void
  showPromptPopover: (event: MouseEvent | FocusEvent, text: string) => void
  schedulePromptPopoverClose: () => void
  statusBadgeClass: (jobOrStatus: BatchImageStatus | Pick<BatchImageJob, 'status' | 'success_count' | 'fail_count'>) => string
  statusLabel: (jobOrStatus: BatchImageStatus | Pick<BatchImageJob, 'status' | 'success_count' | 'fail_count'>) => string
  displayJob: <T extends Pick<BatchImageJob, 'id' | 'parent_batch_id' | 'status' | 'item_count' | 'success_count' | 'fail_count' | 'estimated_cost' | 'hold_amount' | 'actual_cost'>>(job: T) => T
  costLabel: (job: Pick<BatchImageJob, 'status' | 'hold_amount' | 'actual_cost'>) => string
  formatDate: (timestamp: number) => string
  defaultTaskName: (timestamp?: number) => string
  selectJob: (batchId: string) => void
  canDownload: (job: Pick<BatchImageJob, 'status' | 'success_count'>) => boolean
  isDownloadingJob: (batchId: string) => boolean
  downloadJob: (job: BatchImageJobRow | Pick<BatchImageJob, 'id'>) => void | Promise<void>
  canRetry: (job: Pick<BatchImageJob, 'status' | 'fail_count'>) => boolean
  canDeleteRecord: (job: Pick<BatchImageJob, 'status'>) => boolean
  toggleMoreMenu: (job: BatchImageJobRow, event: MouseEvent) => void
  handlePageSizeChange: (value: string | number | boolean | null) => void
  handlePageChange: (page: number) => void
  retryFailedJob: (job: BatchImageJobRow | BatchImageJob) => void | Promise<void>
  deleteJob: (job: BatchImageJobRow) => void | Promise<void>
  cancelPromptPopoverClose: () => void
  copyPromptPopover: () => void | Promise<void>
}>()

const filters = computed(() => props.filters)
const pagination = computed(() => props.pagination)
const promptPopover = computed(() => props.promptPopover)
const { t } = useI18n()
</script>

<style scoped>
.batch-row-action {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 42px;
  line-height: 1;
  outline: none;
}

.batch-row-action:focus {
  outline: none;
}

.batch-row-action :deep(svg) {
  margin-right: 0 !important;
}

.batch-prompt-trigger:focus {
  outline: none;
  box-shadow: none;
}

.batch-prompt-popover {
  user-select: text;
}

.batch-prompt-popover p {
  scrollbar-width: thin;
}
</style>
