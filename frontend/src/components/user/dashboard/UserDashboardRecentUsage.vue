<template>
  <div class="card p-5">
    <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ t('dashboard.recentUsage') }}</h2>
      <span class="badge badge-neutral">{{ t('dashboard.last7Days') }}</span>
    </div>
    <div>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
      <div v-else-if="data.length === 0" class="py-8">
        <EmptyState :title="t('dashboard.noUsageRecords')" :description="t('dashboard.startUsingApi')" />
      </div>
      <div v-else class="space-y-3">
        <div v-for="log in data" :key="log.id" class="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 transition-colors hover:bg-blue-50/50 dark:bg-slate-800/50 dark:hover:bg-slate-800">
          <div class="flex items-center gap-3.5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
              <Icon name="beaker" size="md" />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-900 dark:text-white">{{ log.model }}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">{{ formatDateTime(log.created_at) }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold">
              <span class="text-primary-600 dark:text-blue-400" :title="t('dashboard.actual')">${{ formatCost(log.actual_cost) }}</span>
              <span class="font-normal text-slate-400 dark:text-slate-500" :title="t('dashboard.standard')"> / ${{ formatCost(log.total_cost) }}</span>
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ (log.input_tokens + log.output_tokens).toLocaleString() }} tokens</p>
          </div>
        </div>

        <router-link to="/usage" class="flex items-center justify-center gap-1.5 pt-3 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700 dark:text-blue-400 dark:hover:text-blue-300">
          {{ t('dashboard.viewAllUsage') }}
          <Icon name="chevronRight" size="xs" />
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Icon from '@/components/icons/Icon.vue'
import { formatDateTime } from '@/utils/format'
import type { UsageLog } from '@/types'

defineProps<{
  data: UsageLog[]
  loading: boolean
}>()
const { t } = useI18n()
const formatCost = (c: number) => c.toFixed(4)
</script>