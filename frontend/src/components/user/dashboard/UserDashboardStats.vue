<template>
  <div class="space-y-4">
    <!-- Row 1: Core Stats (Blue Accent Top Border & Glow) -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <!-- Balance -->
      <div v-if="!isSimple" class="card relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400"></div>
        <div class="flex items-center gap-3.5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('dashboard.balance') }}</p>
            <p class="mt-1 text-2xl font-black tracking-tight text-primary-600 dark:text-blue-400">${{ formatBalance(balance) }}</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ t('common.available') }}</p>
          </div>
        </div>
      </div>

      <!-- API Keys -->
      <div class="card relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400"></div>
        <div class="flex items-center gap-3.5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <Icon name="key" size="md" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('dashboard.apiKeys') }}</p>
            <p class="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{{ stats?.total_api_keys || 0 }}</p>
            <p class="text-[11px] font-medium text-primary-600 dark:text-blue-400">{{ stats?.active_api_keys || 0 }} {{ t('common.active') }}</p>
          </div>
        </div>
      </div>

      <!-- Today Requests -->
      <div class="card relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400"></div>
        <div class="flex items-center gap-3.5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <Icon name="chart" size="md" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('dashboard.todayRequests') }}</p>
            <p class="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{{ stats?.today_requests || 0 }}</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ t('common.total') }}: {{ formatNumber(stats?.total_requests || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Today Cost -->
      <div class="card relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400"></div>
        <div class="flex items-center gap-3.5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <Icon name="dollar" size="md" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">{{ t('dashboard.todayCost') }}</p>
            <p class="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              <span>${{ formatCost(stats?.today_actual_cost || 0) }}</span>
              <span class="text-xs font-normal text-slate-400 dark:text-slate-500"> / ${{ formatCost(stats?.today_cost || 0) }}</span>
            </p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">
              <span>{{ t('common.total') }}: </span>
              <span class="font-medium text-slate-600 dark:text-slate-300">${{ formatCost(stats?.total_actual_cost || 0) }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: Token Stats & Performance -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <!-- Today Tokens -->
      <div class="card p-5 transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <Icon name="cube" size="md" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('dashboard.todayTokens') }}</p>
            <p class="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{{ formatTokens(stats?.today_tokens || 0) }}</p>
            <p class="truncate text-xs text-slate-400 dark:text-slate-500">{{ t('dashboard.input') }}: {{ formatTokens(stats?.today_input_tokens || 0) }} / {{ t('dashboard.output') }}: {{ formatTokens(stats?.today_output_tokens || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Total Tokens -->
      <div class="card p-5 transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <Icon name="database" size="md" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('dashboard.totalTokens') }}</p>
            <p class="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{{ formatTokens(stats?.total_tokens || 0) }}</p>
            <p class="truncate text-xs text-slate-400 dark:text-slate-500">{{ t('dashboard.input') }}: {{ formatTokens(stats?.total_input_tokens || 0) }} / {{ t('dashboard.output') }}: {{ formatTokens(stats?.total_output_tokens || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Performance (RPM/TPM) -->
      <div class="card p-5 transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <Icon name="bolt" size="md" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('dashboard.performance') }}</p>
            <div class="mt-0.5 flex items-baseline gap-2">
              <span class="text-xl font-bold text-slate-900 dark:text-white">{{ formatTokens(stats?.rpm || 0) }}</span>
              <span class="text-xs text-slate-400">RPM</span>
            </div>
            <p class="text-xs text-primary-600 dark:text-blue-400 font-medium">{{ formatTokens(stats?.tpm || 0) }} TPM</p>
          </div>
        </div>
      </div>

      <!-- Avg Response Time -->
      <div class="card p-5 transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
            <Icon name="clock" size="md" :stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('dashboard.avgResponse') }}</p>
            <p class="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{{ formatDuration(stats?.average_duration_ms || 0) }}</p>
            <p class="text-xs text-slate-400">{{ t('dashboard.avgDuration') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { PlatformQuotaItem } from '@/types'
import type { UserDashboardStats as UserStatsType } from '@/api/usage'
import {
  formatCostFixed as formatCost,
  formatNumberLocaleString as formatNumber,
  formatTokensK as formatTokens
} from '@/utils/format'

defineProps<{
  stats: UserStatsType | null
  balance: number
  isSimple: boolean
  platformQuotas?: PlatformQuotaItem[] | null
}>()

const { t } = useI18n()

const formatBalance = (val: number) => {
  return (val || 0).toFixed(2)
}

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
</script>