<template>
    <BaseDialog :show="showGuideModal" :title="t('batchImage.guide.title')" width="wide" @close="closeGuide">
	      <div class="space-y-5">
	        <section class="space-y-3">
	          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('batchImage.guide.uiTitle') }}</h3>
	          <div class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:border-dark-700 dark:bg-dark-900/50 dark:text-gray-200">
	            <p>{{ t('batchImage.guide.step1') }}</p>
	            <p>{{ t('batchImage.guide.step2') }}</p>
	            <p>{{ t('batchImage.guide.step3') }}</p>
	            <p>{{ t('batchImage.guide.step4') }}</p>
	          </div>
	        </section>
	        <section class="space-y-3">
	          <div class="flex flex-wrap items-center justify-between gap-3">
	            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('batchImage.guide.skillTitle') }}</h3>
	            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('batchImage.guide.skillDesc') }}</p>
	          </div>
	        <textarea
	          :value="agentInstruction"
	          readonly
	          class="min-h-[420px] w-full resize-y rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-sm leading-6 text-gray-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-dark-600 dark:bg-dark-900 dark:text-gray-100 dark:focus:border-primary-500 dark:focus:ring-primary-900/40"
	        />
	        </section>
	      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button type="button" class="btn btn-secondary" @click="closeGuide">{{ t('common.close') }}</button>
          <button type="button" class="btn btn-primary" @click="copyInstruction">
            <Icon name="copy" size="sm" class="mr-2" />
            {{ t('batchImage.actions.copyInstruction') }}
          </button>
        </div>
      </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'

defineProps<{
  showGuideModal: boolean
  agentInstruction: string
  closeGuide: () => void
  copyInstruction: () => void | Promise<void>
}>()

const { t } = useI18n()
</script>
