<template>
<div class="card">
  <div class="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ t('admin.riskControl.records') }}</h2>
        <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.recordsHint') }}</p>
      </div>
      <button type="button" class="btn btn-secondary inline-flex items-center gap-2" :disabled="logsLoading" @click="loadLogs">
        <Icon name="refresh" size="sm" :class="logsLoading ? 'animate-spin' : ''" />
        {{ t('admin.riskControl.refresh') }}
      </button>
    </div>

    <div class="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-dark-900/30 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
        <Icon name="filter" size="sm" class="flex-shrink-0 text-slate-400" />
        <span class="font-medium">{{ t('admin.riskControl.modelFilter') }}</span>
        <span class="truncate text-slate-400 dark:text-slate-400">{{ modelFilterSummary }}</span>
      </div>
      <div v-if="modelFilterPreviewModels.length > 0" class="flex flex-wrap gap-1.5">
        <span
          v-for="model in modelFilterPreviewModels"
          :key="model"
          class="inline-flex max-w-[180px] items-center truncate rounded-xl bg-white px-2 py-1 font-mono text-xs text-slate-600 shadow-sm dark:bg-slate-900 dark:text-gray-300"
        >
          {{ model }}
        </span>
        <span v-if="hiddenModelFilterModelCount > 0" class="inline-flex rounded-xl bg-white px-2 py-1 text-xs text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          +{{ hiddenModelFilterModelCount }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
      <AppSelect v-model="filters.result" :options="resultOptions" @change="reloadLogsFromFirstPage" />
      <AppSelect v-model="filters.group_id" :options="groupFilterOptions" @change="reloadLogsFromFirstPage" />
      <AppSelect v-model="filters.endpoint" :options="endpointOptions" @change="reloadLogsFromFirstPage" />
      <input v-model.trim="filters.search" type="search" class="input" :placeholder="t('admin.riskControl.filters.search')" @keyup.enter="reloadLogsFromFirstPage" />
      <input v-model="filters.from" type="datetime-local" class="input" :title="t('admin.riskControl.filters.from')" @change="reloadLogsFromFirstPage" />
      <input v-model="filters.to" type="datetime-local" class="input" :title="t('admin.riskControl.filters.to')" @change="reloadLogsFromFirstPage" />
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
      <thead class="bg-slate-50 dark:bg-slate-900">
        <tr>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.time') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.group') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.user') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.apiKey') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.endpoint') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.result') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.highest') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.actionMeta') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.latency') }}</th>
          <th class="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.table.input') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white dark:divide-dark-800 dark:bg-slate-900">
        <tr v-if="logsLoading">
          <td colspan="10" class="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-400">{{ t('common.loading') }}</td>
        </tr>
        <tr v-else-if="logs.length === 0">
          <td colspan="10" class="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.emptyLogs') }}</td>
        </tr>
        <template v-else>
          <tr v-for="row in logs" :key="row.id" class="hover:bg-slate-50 dark:hover:bg-dark-700/60">
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">{{ formatDateTime(row.created_at) }}</td>
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">{{ row.group_name || '-' }}</td>
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">
              <div>{{ row.user_email || '-' }}</div>
              <div v-if="row.user_id" class="text-xs text-slate-400">UID {{ row.user_id }}</div>
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">{{ row.api_key_name || '-' }}</td>
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">
              <div>{{ row.endpoint || '-' }}</div>
              <div class="text-xs text-slate-400">{{ row.provider || '-' }} / {{ row.model || '-' }}</div>
            </td>
            <td class="whitespace-nowrap px-5 py-4">
              <span class="inline-flex rounded-xl px-2 py-1 text-xs font-medium" :class="resultBadgeClass(row)">
                {{ resultLabel(row) }}
              </span>
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">
              <div>{{ row.highest_category || '-' }}</div>
              <div class="text-xs text-slate-400">{{ percent(row.highest_score) }}</div>
              <div v-if="row.matched_keyword" class="mt-0.5 text-xs font-medium text-red-600 dark:text-red-300" :title="t('admin.riskControl.matchedKeyword') + ': ' + row.matched_keyword">
                {{ t('admin.riskControl.matchedKeyword') }}: {{ row.matched_keyword }}
              </div>
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">
              <div>{{ violationCountText(row) }}</div>
              <div class="text-xs text-slate-400">
                {{ row.email_sent ? t('admin.riskControl.emailSent') : t('admin.riskControl.emailNotSent') }}
                <span v-if="row.auto_banned"> / {{ t('admin.riskControl.autoBanned') }}</span>
              </div>
              <button
                v-if="canUnbanRow(row)"
                type="button"
                class="mt-2 inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                :disabled="unbanningUserID === row.user_id"
                @click="unbanUser(row)"
              >
                <Icon name="checkCircle" size="xs" :class="unbanningUserID === row.user_id ? 'animate-spin' : ''" />
                {{ unbanningUserID === row.user_id ? t('common.processing') : t('admin.riskControl.unbanUser') }}
              </button>
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-gray-300">
              <div>{{ latencyText(row.upstream_latency_ms) }}</div>
              <div v-if="row.queue_delay_ms !== null && row.queue_delay_ms !== undefined" class="text-xs text-slate-400">
                {{ t('admin.riskControl.queueDelay', { ms: row.queue_delay_ms }) }}
              </div>
            </td>
            <td class="w-[320px] max-w-sm px-5 py-4 text-sm text-slate-700 dark:text-gray-300">
              <button
                type="button"
                class="group flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-dark-700"
                :title="inputSummaryText(row)"
                @click="openInputDetail(row)"
              >
                <span class="min-w-0 flex-1 truncate">{{ inputSummaryText(row) }}</span>
                <Icon name="eye" size="xs" class="flex-shrink-0 text-gray-300 transition-colors group-hover:text-primary-500 dark:text-slate-400" />
              </button>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>

  <Pagination
    v-if="pagination.total > 0"
    :page="pagination.page"
    :total="pagination.total"
    :page-size="pagination.page_size"
    @update:page="onPageChange"
    @update:pageSize="onPageSizeChange"
  />
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import AppSelect from '@/components/common/Select.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useRiskControlContext } from './useRiskControlView'

export default defineComponent({
  name: 'RiskControlAuditRecords',
  components: {
    Icon,
    AppSelect,
    Pagination
  },
  setup() {
    return useRiskControlContext()
  },
})
</script>
