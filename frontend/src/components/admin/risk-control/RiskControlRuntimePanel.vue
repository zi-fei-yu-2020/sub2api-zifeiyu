<template>
<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
  <div
    v-for="item in overviewItems"
    :key="item.key"
    class="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    <div class="flex min-w-0 items-center gap-3">
      <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" :class="item.iconClass">
        <Icon :name="item.icon" size="sm" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-center justify-between gap-2">
          <p class="truncate text-xs font-medium text-slate-400 dark:text-slate-400">{{ item.label }}</p>
          <span
            v-if="item.badge"
            class="inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="item.badgeClass"
          >
            {{ item.badge }}
          </span>
        </div>
        <div class="mt-1 flex min-w-0 items-baseline gap-2">
          <p class="truncate text-xl font-semibold leading-7 text-slate-900 dark:text-white">{{ item.value }}</p>
          <p v-if="item.meta" class="truncate text-xs text-slate-400 dark:text-slate-400">{{ item.meta }}</p>
        </div>
      </div>
    </div>
  </div>
</div>

<div
  v-if="showPreBlockRuntimeCard"
  data-test="pre-block-runtime-cards"
  class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]"
>
  <div data-test="pre-block-sync-card" class="card">
    <div class="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ t('admin.riskControl.preBlockSyncStatus') }}</h2>
        <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.preBlockSyncHint') }}</p>
      </div>
      <span class="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-gray-300">
        {{ modeLabel(status?.mode ?? configForm.mode) }}
      </span>
    </div>

    <div class="p-6">
      <div data-test="pre-block-metric-grid" class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div
          v-for="item in preBlockMetricItems"
          :key="item.key"
          class="rounded-xl p-4"
          :class="item.class"
        >
          <p class="text-xs text-slate-400 dark:text-slate-400">{{ item.label }}</p>
          <p class="mt-2 truncate text-2xl font-semibold leading-8" :class="item.valueClass">{{ item.value }}</p>
          <p v-if="item.meta" class="mt-1 truncate text-xs text-slate-400 dark:text-slate-400">{{ item.meta }}</p>
        </div>
      </div>
    </div>
  </div>

  <div data-test="pre-block-api-key-load-card" class="card">
    <div class="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ t('admin.riskControl.preBlockAPIKeyLoad') }}</h2>
        <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
          {{ t('admin.riskControl.preBlockAPIKeyLoadHint') }}
        </p>
      </div>
      <span class="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-gray-300">
        {{ preBlockAPIKeyLoadSummaryText }}
      </span>
    </div>

    <div class="p-6">
      <div
        v-if="preBlockAPIKeyLoads.length > 0"
        data-test="pre-block-api-key-load-list"
        class="max-h-[280px] space-y-3 overflow-y-auto pr-1"
      >
        <div
          v-for="item in preBlockAPIKeyLoads"
          :key="item.key_hash || item.index"
          class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"
        >
          <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <span class="font-mono text-sm font-semibold text-slate-900 dark:text-white">#{{ item.index + 1 }}</span>
                <span class="truncate font-mono text-sm text-slate-700 dark:text-gray-200">{{ item.masked || '-' }}</span>
                <span class="h-2 w-2 flex-shrink-0 rounded-full" :class="apiKeyStatusDotClass(item.status)"></span>
              </div>
              <p class="mt-1 text-xs text-slate-400 dark:text-slate-400">
                {{ t('admin.riskControl.preBlockAPIKeyTotals', { total: formatNumber(item.total), success: formatNumber(item.success), errors: formatNumber(item.errors) }) }}
              </p>
            </div>
            <div class="grid grid-cols-4 gap-2 text-right text-xs text-slate-400 dark:text-slate-400 sm:min-w-[280px]">
              <div>
                <p>{{ t('admin.riskControl.preBlockKeyActiveShort') }}</p>
                <p class="mt-1 text-sm font-semibold text-sky-700 dark:text-sky-300">{{ formatNumber(item.active) }}</p>
              </div>
              <div>
                <p>{{ t('admin.riskControl.preBlockKeyTotalShort') }}</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatNumber(item.total) }}</p>
              </div>
              <div>
                <p>{{ t('admin.riskControl.preBlockKeyAvgShort') }}</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatNumber(item.avg_latency_ms) }} ms</p>
              </div>
              <div>
                <p>{{ t('admin.riskControl.preBlockKeyLastShort') }}</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatNumber(item.last_latency_ms) }} ms</p>
              </div>
            </div>
          </div>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white dark:bg-dark-900">
            <div class="h-full rounded-full bg-sky-500" :style="{ width: preBlockAPIKeyLoadWidth(item.total) }"></div>
          </div>
        </div>
      </div>
      <p v-else class="rounded-xl bg-slate-50 p-4 text-sm text-slate-400 dark:bg-slate-800/50 dark:text-slate-400">
        {{ t('admin.riskControl.preBlockAPIKeyLoadEmpty') }}
      </p>
    </div>
  </div>
</div>

<div v-if="showWorkerRuntimeCard" class="card">
  <div class="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ t('admin.riskControl.workerStatus') }}</h2>
      <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.workerStatusHint') }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2 text-sm text-slate-400 dark:text-slate-400">
      <span>{{ t('admin.riskControl.autoRefresh') }}</span>
      <span v-if="status?.last_cleanup_at">
        {{ t('admin.riskControl.lastCleanup', { time: formatDateTime(status.last_cleanup_at) }) }}
      </span>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[minmax(0,360px)_1fr]">
    <div class="space-y-4">
      <div class="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-900 dark:text-white">{{ t('admin.riskControl.queueUsage') }}</p>
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-400">
              {{ formatNumber(status?.queue_length ?? 0) }} / {{ formatNumber(status?.queue_size ?? configForm.queue_size) }}
            </p>
          </div>
          <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ queueUsagePercent }}</span>
        </div>
        <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div class="h-full rounded-full bg-primary-500 transition-all duration-300" :style="queueUsageStyle"></div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p class="text-xs text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.activeWorkers') }}</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{{ status?.active_workers ?? 0 }}</p>
        </div>
        <div class="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/10">
          <p class="text-xs text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.idleWorkers') }}</p>
          <p class="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{{ status?.idle_workers ?? configForm.worker_count }}</p>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p class="text-xs text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.processed') }}</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatNumber(status?.processed ?? 0) }}</p>
        </div>
        <div class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p class="text-xs text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.droppedErrors') }}</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatNumber((status?.dropped ?? 0) + (status?.errors ?? 0)) }}</p>
        </div>
      </div>
    </div>

    <div>
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-medium text-slate-900 dark:text-white">{{ t('admin.riskControl.workerPool') }}</p>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-400">
            {{ t('admin.riskControl.workerPoolMeta', { active: status?.active_workers ?? 0, idle: status?.idle_workers ?? configForm.worker_count, total: status?.worker_count ?? configForm.worker_count }) }}
          </p>
        </div>
        <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-gray-300">
          {{ modeLabel(status?.mode ?? configForm.mode) }}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        <div
          v-for="worker in workerSlots"
          :key="worker.id"
          class="flex h-12 items-center justify-between rounded-xl border px-3 transition-colors"
          :class="workerSlotClass(worker.state)"
          :title="worker.label"
        >
          <span class="text-sm font-semibold">#{{ worker.id }}</span>
          <span class="h-2.5 w-2.5 rounded-full" :class="workerDotClass(worker.state)"></span>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import { useRiskControlContext } from './useRiskControlView'

export default defineComponent({
  name: 'RiskControlRuntimePanel',
  components: {
    Icon
  },
  setup() {
    return useRiskControlContext()
  },
})
</script>
