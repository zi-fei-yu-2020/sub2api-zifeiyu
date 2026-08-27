<template>
    <BaseDialog :show="showCreateModal" :title="t('batchImage.create.title')" width="wide" @close="closeCreateModal">
      <form class="space-y-5" @submit.prevent="submitJob">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="input-label">{{ t('batchImage.create.taskName') }}</label>
            <input
              v-model="form.taskName"
              type="text"
              maxlength="255"
              class="input"
              :placeholder="t('batchImage.create.taskNamePlaceholder')"
            />
          </div>

          <div class="md:col-span-2">
            <label class="input-label">API Key</label>
            <select v-model.number="form.apiKeyId" class="input" :disabled="loadingKeys">
              <option :value="0">{{ loadingKeys ? t('batchImage.create.loadingKeys') : t('batchImage.create.selectKeyPlaceholder') }}</option>
              <option v-for="key in geminiApiKeys" :key="key.id" :value="key.id">
                {{ key.name }} · {{ key.group?.name || 'Gemini' }}
              </option>
            </select>
            <p v-if="!loadingKeys && geminiApiKeys.length === 0" class="input-hint text-amber-600 dark:text-amber-400">
              {{ t('batchImage.create.noKeysHint') }}
            </p>
          </div>

          <div>
            <label class="input-label">{{ t('batchImage.create.model') }}</label>
            <select v-model="form.model" class="input" :disabled="loadingModels || availableBatchImageModels.length === 0">
              <option v-if="loadingModels" value="">{{ batchImageText('loadingModels') }}</option>
              <option v-else-if="availableBatchImageModels.length === 0" value="">{{ batchImageText('noModels') }}</option>
              <option v-for="model in availableBatchImageModels" :key="model.value" :value="model.value">
                {{ model.label }}
              </option>
            </select>
            <p v-if="modelLoadError" class="input-hint text-amber-600 dark:text-amber-400">
              {{ modelLoadError }}
            </p>
            <p v-else-if="selectedApiKey && !loadingModels && availableBatchImageModels.length === 0" class="input-hint text-amber-600 dark:text-amber-400">
              {{ batchImageText('noModelsHint') }}
            </p>
          </div>

          <div>
            <label class="input-label">{{ t('batchImage.create.imageSize') }}</label>
            <div class="input flex items-center bg-gray-50 text-gray-600 dark:bg-dark-900 dark:text-gray-300">
              1K
            </div>
            <p class="input-hint">{{ t('batchImage.create.imageSizeHint') }}</p>
          </div>

          <div>
            <label class="input-label">{{ t('batchImage.create.outputFormat') }}</label>
            <select v-model="form.responseMimeType" class="input">
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>

          <div>
            <label class="input-label">{{ t('batchImage.create.estimatedOutput') }}</label>
            <div class="input flex items-center bg-gray-50 text-gray-600 dark:bg-dark-900 dark:text-gray-300">
              {{ t('batchImage.create.estimatedOutputValue', { images: estimatedOutputCount, prompts: promptRows.length }) }}
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <label class="input-label mb-0">Prompt</label>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ t('batchImage.create.promptAdded', { count: promptRows.length }) }}</span>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-dark-700">
            <textarea
              v-model="promptDraft"
              rows="3"
              class="h-[76px] w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-dark-600 dark:bg-dark-900 dark:text-gray-100 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
              :placeholder="t('batchImage.create.promptPlaceholder')"
            />
            <div class="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_112px_132px_112px] md:items-center">
              <input
                v-model="customIdDraft"
                type="text"
                maxlength="255"
                class="input h-9 text-sm"
                :placeholder="t('batchImage.create.customIdPlaceholder')"
              />
              <select
                v-model.number="outputCountDraft"
                class="batch-output-count-select input h-9 text-sm"
                :title="t('batchImage.create.outputCountPerPrompt')"
                :aria-label="t('batchImage.create.outputCountPerPrompt')"
              >
                <option v-for="count in outputCountOptions" :key="count" :value="count">
                  {{ t('batchImage.create.outputCountOption', { n: count }, count) }}
                </option>
              </select>
              <label
                class="btn btn-secondary h-9 cursor-pointer justify-center text-sm"
                :class="referenceImageDrafts.length >= selectedModelReferenceLimit ? 'pointer-events-none opacity-60' : ''"
              >
                <Icon name="upload" size="sm" class="mr-1.5" />
                {{ t('batchImage.create.referenceImage') }}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  class="hidden"
                  :disabled="referenceImageDrafts.length >= selectedModelReferenceLimit"
                  @change="handleReferenceImageFiles"
                />
              </label>
              <button type="button" class="btn btn-secondary h-9 justify-center whitespace-nowrap px-4 text-sm" :disabled="!promptDraft.trim()" @click="addPromptRow">
                <Icon name="plus" size="sm" class="mr-1.5" />
                {{ t('common.add') }}
              </button>
            </div>
            <div v-if="referenceImageDrafts.length" class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="(ref, refIndex) in referenceImageDrafts"
                :key="`${ref.name}-${refIndex}`"
                class="inline-flex max-w-full items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-200"
              >
                <span class="max-w-[180px] truncate">{{ ref.name }}</span>
                <button type="button" class="text-gray-400 hover:text-red-600" :title="t('batchImage.create.removeReferenceImage')" @click="removeReferenceImageDraft(refIndex)">
                  <Icon name="x" size="xs" />
                </button>
              </span>
            </div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {{ t('batchImage.create.limitsHint', { maxPerItem: maxOutputsPerItem, maxPerJob: maxOutputsPerJob, refLimit: selectedModelReferenceLimit }) }}
            </p>
          </div>
          <div v-if="promptRows.length" class="overflow-hidden rounded-md border border-gray-200 dark:border-dark-700">
            <div
              v-for="(row, index) in promptRows"
              :key="row.localId"
              class="flex items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 dark:border-dark-700"
            >
              <span class="w-20 flex-shrink-0 font-mono text-xs text-gray-500 dark:text-gray-400">{{ row.custom_id }}</span>
              <p class="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-100">{{ row.prompt }}</p>
              <span v-if="row.output_count > 1" class="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                x{{ row.output_count }}
              </span>
              <span v-if="row.reference_images.length" class="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {{ t('batchImage.create.referenceCount', { n: row.reference_images.length }, row.reference_images.length) }}
              </span>
              <button type="button" class="btn-ghost btn-icon flex-shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" :title="t('common.delete')" @click="removePromptRow(index)">
                <Icon name="trash" size="sm" />
              </button>
            </div>
          </div>
          <div v-else class="rounded-md border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-dark-700 dark:text-gray-400">
            {{ t('batchImage.create.noPrompts') }}
          </div>
        </div>

	        <div class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
	          {{ t('batchImage.create.cancelNotice') }}
	        </div>
	        <div v-if="submitting" class="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
	          {{ t('batchImage.create.submittingNotice') }}
	        </div>
	      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button type="button" class="btn btn-secondary" :disabled="submitting" @click="closeCreateModal">{{ t('common.cancel') }}</button>
	          <button type="button" class="btn btn-primary inline-flex min-w-[120px] justify-center" :disabled="submitting || loadingModels || (parsedItems.length === 0 && !promptDraft.trim()) || !selectedApiKey || !form.model" @click="submitJob">
            <Icon v-if="submitting" name="refresh" size="sm" class="mr-2 animate-spin" />
            {{ submitting ? t('common.submitting') : t('batchImage.actions.submitJob') }}
          </button>
        </div>
      </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import type { BatchImageSubmitItem } from '@/api/batchImage'
import type { ApiKey } from '@/types'
import type {
  BatchImageCreateForm,
  BatchImageTextKey,
  PromptRow,
  ReferenceImageDraft,
} from './types'

const props = defineProps<{
  showCreateModal: boolean
  form: BatchImageCreateForm
  loadingKeys: boolean
  geminiApiKeys: ApiKey[]
  loadingModels: boolean
  availableBatchImageModels: Array<{ value: string; label: string }>
  modelLoadError: string
  selectedApiKey: ApiKey | null
  estimatedOutputCount: number
  promptRows: PromptRow[]
  outputCountOptions: number[]
  referenceImageDrafts: ReferenceImageDraft[]
  selectedModelReferenceLimit: number
  maxOutputsPerItem: number
  maxOutputsPerJob: number
  parsedItems: BatchImageSubmitItem[]
  submitting: boolean
  closeCreateModal: () => void
  submitJob: () => void | Promise<void>
  batchImageText: (key: BatchImageTextKey) => string
  handleReferenceImageFiles: (event: Event) => void | Promise<void>
  removeReferenceImageDraft: (index: number) => void
  addPromptRow: () => void
  removePromptRow: (index: number) => void
}>()

const promptDraft = defineModel<string>('promptDraft', { required: true })
const customIdDraft = defineModel<string>('customIdDraft', { required: true })
const outputCountDraft = defineModel<number>('outputCountDraft', { required: true })
const form = computed(() => props.form)
const { t } = useI18n()
</script>

<style scoped>
.batch-output-count-select {
  height: 36px;
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
  padding-left: 14px;
  padding-right: 34px;
  line-height: 36px;
}
</style>
