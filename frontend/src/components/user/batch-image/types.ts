import type { CSSProperties } from 'vue'
import type {
  BatchImageItem,
  BatchImageJob,
  BatchImageReferenceImage,
} from '@/api/batchImage'

export type BatchImageJobRow = Pick<
  BatchImageJob,
  | 'id'
  | 'task_name'
  | 'parent_batch_id'
  | 'status'
  | 'model'
  | 'provider'
  | 'item_count'
  | 'success_count'
  | 'fail_count'
  | 'estimated_cost'
  | 'hold_amount'
  | 'actual_cost'
  | 'created_at'
  | 'downloaded_at'
> & {
  api_key_id: number
  api_key_name: string
  child_count: number
  is_child?: boolean
}

export type BatchImageDetailItem = BatchImageItem & {
  batch_id: string
  source_task_name: string
}

export type PromptRow = {
  localId: string
  custom_id: string
  prompt: string
  output_count: number
  reference_images: BatchImageReferenceImage[]
}

export type ReferenceImageDraft = BatchImageReferenceImage & {
  name: string
  size: number
}

export type BatchImageCreateForm = {
  taskName: string
  apiKeyId: number
  model: string
  responseMimeType: string
}

export type BatchImageFilters = {
  taskName: string
  apiKeyId: number | string
  status: string
  downloaded: string
}

export type BatchImagePagination = {
  page: number
  page_size: number
  has_more: boolean
}

export type BatchImagePromptPopover = {
  visible: boolean
  text: string
  style: CSSProperties
}

export type BatchImageTextKey =
  | 'loadKeysFailed'
  | 'loadModelsFailed'
  | 'loadJobsFailed'
  | 'selectApiKey'
  | 'noModelsForKey'
  | 'selectModel'
  | 'promptRequired'
  | 'submitted'
  | 'submitFailed'
  | 'refreshFailed'
  | 'cancelConfirm'
  | 'cancelled'
  | 'cancelFailed'
  | 'batchDownloadStarted'
  | 'downloadFailed'
  | 'retrySubmitted'
  | 'retryFailed'
  | 'retryMissingPrompts'
  | 'deleteConfirm'
  | 'deleteSelectedConfirm'
  | 'deleted'
  | 'deleteFailed'
  | 'loadItemsFailed'
  | 'loadPreviewFailed'
  | 'copiedInstruction'
  | 'loadingModels'
  | 'noModels'
  | 'noModelsHint'
  | 'noCompatibleAccount'
  | 'unsupportedProvider'
  | 'providerSubmitFailed'
  | 'vertexGcsBucketMissing'
  | 'queueFailed'
  | 'billingHoldFailed'
  | 'groupDisabled'
  | 'pricingMissing'
  | 'insufficientBalance'
  | 'invalidModel'
  | 'invalidItems'
  | 'duplicateCustomId'
  | 'promptTooLong'
  | 'invalidReferenceImage'
  | 'tooManyReferenceImages'
  | 'referenceImagesTooLarge'
  | 'tooManyOutputImages'
  | 'idempotencyConflict'
  | 'notReady'
  | 'outputDeleted'
  | 'resultMissing'
  | 'itemFailed'
  | 'itemImageIndexOutOfRange'
  | 'downloadLimited'
  | 'downloadTooLarge'
  | 'deleteNotReady'
  | 'disabled'
  | 'authRequired'
  | 'adminReference'
  | 'errorReference'
