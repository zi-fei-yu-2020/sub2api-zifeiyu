<template>
    <BaseDialog :show="!!currentJob" :title="t('batchImage.detail.title')" width="extra-wide" @close="closeDetail">
      <div v-if="currentJob" class="space-y-4">
        <div class="rounded-md border border-gray-200 bg-gray-50/70 px-4 py-3 dark:border-dark-700 dark:bg-dark-900/40">
          <div class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="min-w-0 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('common.status') }}</p>
              <div class="mt-1 flex justify-center">
                <span :class="statusBadgeClass(currentDisplayJob || currentJob)" class="badge whitespace-nowrap">
                  {{ statusLabel(currentDisplayJob || currentJob) }}
                </span>
              </div>
            </div>
            <div class="min-w-0 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ hasChildJobs(currentJob.id) ? t('batchImage.detail.aggregatedResult') : t('batchImage.detail.result') }}</p>
              <p class="mt-1 flex items-center justify-center gap-2 font-medium tabular-nums">
              <span class="text-blue-600 dark:text-emerald-300">{{ (currentDisplayJob || currentJob).success_count }}</span>
              <span class="text-gray-300 dark:text-dark-500">/</span>
              <span :class="(currentDisplayJob || currentJob).fail_count > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-400 dark:text-gray-500'">{{ (currentDisplayJob || currentJob).fail_count }}</span>
            </p>
            </div>
            <div class="min-w-0 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('batchImage.detail.cost') }}</p>
              <p class="mt-1 truncate font-medium text-gray-900 dark:text-white">{{ costLabel(currentDisplayJob || currentJob) }}</p>
            </div>
            <div class="min-w-0 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('batchImage.detail.downloadStatus') }}</p>
              <p class="mt-1 truncate font-medium text-gray-900 dark:text-white">
              {{ currentJob.downloaded_at ? formatDate(currentJob.downloaded_at) : t('batchImage.list.notDownloaded') }}
            </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('batchImage.detail.items') }}</h3>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="refreshing || loadingItems" @click="refreshDetail">
            <Icon name="refresh" size="sm" class="mr-1.5" :class="refreshing || loadingItems ? 'animate-spin' : ''" />
            {{ t('common.refresh') }}
          </button>
        </div>

        <div v-if="items.length" class="overflow-x-auto rounded-md border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-900">
          <table class="w-full min-w-[860px] table-fixed divide-y divide-gray-200 text-sm dark:divide-dark-700">
            <colgroup>
              <col class="w-[18%]" />
              <col class="w-[34%]" />
              <col class="w-[12%]" />
              <col class="w-[10%]" />
              <col class="w-[26%]" />
            </colgroup>
            <thead class="bg-gray-50 dark:bg-dark-800/80">
              <tr>
                <th class="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Custom ID</th>
                <th class="px-3 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Prompt</th>
                <th class="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('common.status') }}</th>
                <th class="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('batchImage.detail.preview') }}</th>
                <th class="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('batchImage.detail.result') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
              <tr
                v-for="item in items"
                :key="itemPreviewKey(item)"
                class="align-middle"
                :class="detailItemRowClass(item)"
              >
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="block min-w-0 truncate font-mono text-sm"
                    :class="isRecoveredOriginalFailure(item) ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'"
                    :title="item.custom_id"
                  >
                    {{ item.custom_id }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-left" :class="isRecoveredOriginalFailure(item) ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'">
                  <div
                    class="batch-prompt-trigger cursor-default truncate rounded px-1 text-sm leading-6 focus:outline-none"
                    tabindex="0"
                    @pointerenter="schedulePromptPopoverOpen($event, item.prompt_preview || '-')"
                    @pointerleave="schedulePromptPopoverClose"
                    @mouseenter="schedulePromptPopoverOpen($event, item.prompt_preview || '-')"
                    @mouseleave="schedulePromptPopoverClose"
                    @click="showPromptPopover($event, item.prompt_preview || '-')"
                    @focus="showPromptPopover($event, item.prompt_preview || '-')"
                    @focusin="showPromptPopover($event, item.prompt_preview || '-')"
                    @blur="schedulePromptPopoverClose"
                  >
                    {{ item.prompt_preview || '-' }}
                  </div>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span :class="itemDisplayStatusBadgeClass(item)" class="badge max-w-full truncate whitespace-nowrap" :title="itemDisplayStatusLabel(item)">
                    {{ itemDisplayStatusLabel(item) }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <div class="mx-auto h-12 w-12 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-dark-700 dark:bg-dark-800">
                    <button
                      v-if="itemPreviewUrls[itemPreviewKey(item)] && !previewErrorIds.has(itemPreviewKey(item))"
                      type="button"
                      class="block h-full w-full overflow-hidden"
                      :title="t('batchImage.detail.previewZoom', { id: item.custom_id })"
                      @click="openImagePreview(item)"
                    >
                      <img
                        :src="itemPreviewUrls[itemPreviewKey(item)]"
                        class="h-full w-full object-cover"
                        alt=""
                        @error="handlePreviewError(itemPreviewKey(item))"
                      />
                    </button>
                    <button
                      v-else-if="canLoadItemPreview(item)"
                      type="button"
                      class="flex h-full w-full items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 disabled:cursor-wait disabled:opacity-70 dark:text-gray-400 dark:hover:bg-dark-700"
                      :disabled="previewLoadingIds.has(itemPreviewKey(item))"
                      :title="previewErrorIds.has(itemPreviewKey(item)) ? t('batchImage.detail.previewReload') : t('batchImage.detail.previewLoad')"
                      @click="loadItemPreview(item)"
                    >
                      <Icon :name="previewLoadingIds.has(itemPreviewKey(item)) ? 'refresh' : 'eye'" size="sm" :class="previewLoadingIds.has(itemPreviewKey(item)) ? 'animate-spin' : ''" />
                    </button>
                    <div v-else class="flex h-full w-full items-center justify-center text-gray-400" :title="item.image_count > 0 ? t('batchImage.detail.previewUnavailable') : t('batchImage.detail.noImage')">
                      <Icon name="document" size="sm" />
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex max-w-full items-center justify-center truncate rounded-md px-2.5 py-1 text-xs font-medium leading-5 ring-1 ring-inset"
                    :class="itemResultClass(item)"
                    :title="itemResultLabel(item)"
                  >
                    {{ itemResultLabel(item) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="rounded-md border border-dashed border-gray-200 py-10 text-center dark:border-dark-700">
          <Icon name="refresh" size="lg" class="mx-auto mb-3 text-gray-400" :class="loadingItems ? 'animate-spin' : ''" />
          <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
            {{ loadingItems ? t('batchImage.detail.loadingItems') : t('batchImage.detail.noItems') }}
          </p>
          <p v-if="!loadingItems" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ t('batchImage.detail.noItemsHint') }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
	          <button type="button" class="btn btn-secondary" :disabled="!currentJob || !canCancel(currentJob) || cancelling" @click="cancelSelected">
	            <Icon v-if="cancelling" name="refresh" size="sm" class="mr-2 animate-spin" />
	            {{ t('batchImage.actions.cancelJob') }}
	          </button>
	          <button
	            v-if="currentJob && currentDisplayJob && canRetry(currentDisplayJob)"
	            type="button"
	            class="btn btn-secondary inline-flex min-w-[116px] items-center justify-center"
	            :disabled="retryingBatchId === currentJob.id"
	            @click="retrySelected"
	          >
	            <Icon name="refresh" size="sm" class="mr-2" :class="currentJob && retryingBatchId === currentJob.id ? 'animate-spin' : ''" />
	            {{ t('batchImage.actions.retryFailedItems') }}
	          </button>
	          <button
            type="button"
            class="btn btn-primary inline-flex min-w-[112px] items-center justify-center"
            :disabled="!currentJob || !canDownload(currentJob) || downloading"
            @click="downloadSelected"
          >
            <Icon
              :name="currentJob && isDownloadingJob(currentJob.id) ? 'refresh' : 'download'"
              size="sm"
              class="mr-2"
              :class="currentJob && isDownloadingJob(currentJob.id) ? 'animate-spin' : ''"
            />
            {{ t('batchImage.actions.downloadZip') }}
          </button>
        </div>
      </template>
    </BaseDialog>

    <BaseDialog :show="!!previewImageItem" :title="previewImageItem?.custom_id || t('batchImage.imagePreview.title')" width="extra-wide" :z-index="60" @close="closeImagePreview">
      <div class="space-y-3">
        <div class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          {{ t('batchImage.imagePreview.notice') }}
        </div>
        <div class="flex min-h-[420px] items-center justify-center rounded-md bg-gray-50 p-4 dark:bg-dark-900">
          <img
            v-if="previewImageUrl"
            :src="previewImageUrl"
            class="max-h-[70vh] max-w-full rounded-md object-contain"
            :alt="previewImageItem?.custom_id || ''"
          />
        </div>
      </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import type { BatchImageItem, BatchImageJob, BatchImageStatus } from '@/api/batchImage'
import type { BatchImageDetailItem, BatchImageJobRow } from './types'

defineProps<{
  currentJob: BatchImageJob | null
  currentDisplayJob: BatchImageJobRow | BatchImageJob | null
  items: BatchImageDetailItem[]
  loadingItems: boolean
  refreshing: boolean
  cancelling: boolean
  retryingBatchId: string
  downloading: boolean
  previewImageItem: BatchImageItem | null
  previewImageUrl: string
  itemPreviewUrls: Record<string, string>
  previewLoadingIds: Set<string>
  previewErrorIds: Set<string>
  recoveredOriginalCustomIds: Set<string>
  closeDetail: () => void
  statusBadgeClass: (jobOrStatus: BatchImageStatus | Pick<BatchImageJob, 'status' | 'success_count' | 'fail_count'>) => string
  statusLabel: (jobOrStatus: BatchImageStatus | Pick<BatchImageJob, 'status' | 'success_count' | 'fail_count'>) => string
  hasChildJobs: (batchId: string) => boolean
  costLabel: (job: Pick<BatchImageJob, 'status' | 'hold_amount' | 'actual_cost'>) => string
  formatDate: (timestamp: number) => string
  refreshDetail: () => void | Promise<void>
  schedulePromptPopoverOpen: (event: MouseEvent | PointerEvent, text: string) => void
  schedulePromptPopoverClose: () => void
  showPromptPopover: (event: MouseEvent | FocusEvent, text: string) => void
  detailItemRowClass: (item: BatchImageDetailItem) => string
  isRecoveredOriginalFailure: (item: BatchImageDetailItem) => boolean
  itemDisplayStatusBadgeClass: (item: BatchImageDetailItem) => string
  itemDisplayStatusLabel: (item: BatchImageDetailItem) => string
  friendlyItemError: (error: BatchImageItem['error']) => string
  itemPreviewKey: (item: Pick<BatchImageItem, 'batch_id' | 'custom_id'>) => string
  openImagePreview: (item: BatchImageItem) => void
  canLoadItemPreview: (item: BatchImageItem) => boolean
  loadItemPreview: (item: BatchImageItem) => void | Promise<void>
  handlePreviewError: (customID: string) => void
  itemResultClass: (item: BatchImageDetailItem) => string
  itemResultLabel: (item: BatchImageDetailItem) => string
  canCancel: (job: Pick<BatchImageJob, 'status'>) => boolean
  cancelSelected: () => void | Promise<void>
  canRetry: (job: Pick<BatchImageJob, 'status' | 'fail_count'>) => boolean
  retrySelected: () => void | Promise<void>
  canDownload: (job: Pick<BatchImageJob, 'status' | 'success_count'>) => boolean
  downloadSelected: () => void | Promise<void>
  isDownloadingJob: (batchId: string) => boolean
  closeImagePreview: () => void
}>()

const { t } = useI18n()
</script>
