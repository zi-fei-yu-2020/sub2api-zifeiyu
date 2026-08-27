<template>
<BaseDialog
  :show="inputDetailRow !== null"
  :title="t('admin.riskControl.inputDetailTitle')"
  width="wide"
  @close="closeInputDetail"
>
  <div v-if="inputDetailRow" class="space-y-5">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.time') }}</p>
        <p class="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{{ formatDateTime(inputDetailRow.created_at) }}</p>
      </div>
      <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.user') }}</p>
        <p class="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{{ inputDetailRow.user_email || '-' }}</p>
      </div>
      <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.result') }}</p>
        <span class="mt-1 inline-flex rounded-xl px-2 py-1 text-xs font-medium" :class="resultBadgeClass(inputDetailRow)">
          {{ resultLabel(inputDetailRow) }}
        </span>
      </div>
      <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.highest') }}</p>
        <p class="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
          {{ inputDetailRow.highest_category || '-' }} / {{ percent(inputDetailRow.highest_score) }}
        </p>
      </div>
      <div v-if="inputDetailRow.matched_keyword" class="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-900/20">
        <p class="text-xs font-medium text-red-500 dark:text-red-300">{{ t('admin.riskControl.matchedKeyword') }}</p>
        <p class="mt-1 truncate text-sm font-semibold text-red-700 dark:text-red-200" :title="inputDetailRow.matched_keyword">{{ inputDetailRow.matched_keyword }}</p>
      </div>
    </div>

    <div class="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ t('admin.riskControl.inputDetailContent') }}</p>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-400">
            {{ inputDetailRow.endpoint || '-' }} · {{ inputDetailRow.provider || '-' }} / {{ inputDetailRow.model || '-' }}
          </p>
        </div>
        <span v-if="inputDetailRow.group_name" class="inline-flex rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">
          {{ inputDetailRow.group_name }}
        </span>
      </div>
      <pre class="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-950 p-4 text-sm leading-6 text-gray-100 shadow-inner dark:bg-black/50">{{ inputDetailText }}</pre>
    </div>
  </div>

  <template #footer>
    <div class="flex justify-end">
      <button type="button" class="btn btn-secondary" @click="closeInputDetail">{{ t('common.close') }}</button>
    </div>
  </template>
</BaseDialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { useRiskControlContext } from './useRiskControlView'

export default defineComponent({
  name: 'RiskControlInputDetailDialog',
  components: {
    BaseDialog
  },
  setup() {
    return useRiskControlContext()
  },
})
</script>
