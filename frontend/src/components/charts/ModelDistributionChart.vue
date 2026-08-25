<template>
  <div class="card p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
        {{ !enableRankingView || activeView === 'model_distribution'
          ? t('admin.dashboard.modelDistribution')
          : t('admin.dashboard.spendingRankingTitle') }}
      </h3>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <div
          v-if="showSourceToggle"
          class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="source === 'requested'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="emit('update:source', 'requested')"
          >
            {{ t('usage.requestedModel') }}
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="source === 'upstream'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="emit('update:source', 'upstream')"
          >
            {{ t('usage.upstreamModel') }}
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="source === 'mapping'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="emit('update:source', 'mapping')"
          >
            {{ t('usage.mapping') }}
          </button>
        </div>
        <div
          v-if="showMetricToggle"
          class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="metric === 'tokens'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="emit('update:metric', 'tokens')"
          >
            {{ t('admin.dashboard.metricTokens') }}
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="metric === 'actual_cost'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="emit('update:metric', 'actual_cost')"
          >
            {{ t('admin.dashboard.metricActualCost') }}
          </button>
        </div>
        <div v-if="enableRankingView" class="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="
              activeView === 'model_distribution'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            "
            @click="activeView = 'model_distribution'"
          >
            {{ t('admin.dashboard.viewModelDistribution') }}
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="
              activeView === 'spending_ranking'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            "
            @click="activeView = 'spending_ranking'"
          >
            {{ t('admin.dashboard.viewSpendingRanking') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="activeView === 'model_distribution' && loading" class="flex h-52 items-center justify-center">
      <LoadingSpinner />
    </div>

    <!-- Model Distribution - Has Data -->
    <div
      v-else-if="activeView === 'model_distribution' && displayModelStats && displayModelStats.length > 0 && chartData"
      class="flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
    >
      <div class="h-48 w-48 shrink-0">
        <Doughnut :data="chartData" :options="doughnutOptions" />
      </div>
      <div class="max-h-48 w-full min-w-0 flex-1 overflow-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-slate-400 dark:text-slate-400">
              <th class="pb-2 text-left font-medium">{{ t('admin.dashboard.model') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('admin.dashboard.requests') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('admin.dashboard.tokens') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('admin.dashboard.actual') }}</th>
              <th v-if="showAccountCost" class="pb-2 text-right font-medium">{{ t('admin.dashboard.accountCost') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('admin.dashboard.standard') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="model in displayModelStats" :key="model.model">
              <tr
                class="border-t border-slate-100 transition-colors dark:border-slate-800"
                :class="enableBreakdown ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''"
                @click="enableBreakdown && toggleBreakdown('model', model.model)"
              >
                <td
                  class="max-w-[100px] truncate py-1.5 font-medium"
                  :class="enableBreakdown ? 'text-primary-600 hover:text-primary-700 dark:text-primary-400' : 'text-slate-900 dark:text-white'"
                  :title="model.model"
                >
                  <span class="inline-flex items-center gap-1">
                    <svg v-if="enableBreakdown && expandedKey === `model-${model.model}`" class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    <svg v-else-if="enableBreakdown" class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    {{ model.model }}
                  </span>
                </td>
                <td class="py-1.5 text-right text-slate-600 dark:text-slate-400">
                  {{ formatNumber(model.requests) }}
                </td>
                <td class="py-1.5 text-right text-slate-600 dark:text-slate-400">
                  {{ formatTokens(model.total_tokens) }}
                </td>
                <td class="py-1.5 text-right font-medium text-blue-600 dark:text-emerald-400">
                  ${{ formatCost(model.actual_cost) }}
                </td>
                <td v-if="showAccountCost" class="py-1.5 text-right text-amber-600 dark:text-amber-400">
                  ${{ formatCost(model.account_cost) }}
                </td>
                <td class="py-1.5 text-right text-slate-400 dark:text-slate-500">
                  ${{ formatCost(model.cost) }}
                </td>
              </tr>
              <tr v-if="expandedKey === `model-${model.model}`">
                <td :colspan="distributionColspan" class="p-0">
                  <UserBreakdownSubTable
                    :items="breakdownItems"
                    :loading="breakdownLoading"
                    :show-account-cost="showAccountCost"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Model Distribution - Empty State -->
    <div
      v-else-if="activeView === 'model_distribution'"
      class="flex h-52 flex-col items-center justify-center text-center"
    >
      <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
      </div>
      <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('admin.dashboard.noDataAvailable') }}</p>
    </div>

    <!-- Spending Ranking - Loading -->
    <div v-else-if="rankingLoading" class="flex h-52 items-center justify-center">
      <LoadingSpinner />
    </div>

    <!-- Spending Ranking - Error -->
    <div
      v-else-if="rankingError"
      class="flex h-52 items-center justify-center text-xs text-rose-500"
    >
      {{ t('admin.dashboard.failedToLoad') }}
    </div>

    <!-- Spending Ranking - Has Data -->
    <div v-else-if="activeView === 'spending_ranking' && rankingDisplayItems.length > 0 && rankingChartData" class="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div class="h-48 w-48 shrink-0">
        <Doughnut :data="rankingChartData" :options="rankingDoughnutOptions" />
      </div>
      <div class="max-h-48 w-full min-w-0 flex-1 overflow-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-slate-400 dark:text-slate-400">
              <th class="pb-2 text-left font-medium">{{ t('admin.dashboard.spendingRankingUser') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('admin.dashboard.spendingRankingRequests') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('admin.dashboard.spendingRankingTokens') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('admin.dashboard.spendingRankingSpend') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in rankingDisplayItems"
              :key="item.isOther ? 'others' : `${item.user_id}-${index}`"
              class="border-t border-slate-100 transition-colors dark:border-slate-800"
              :class="item.isOther ? 'bg-slate-50/70 dark:bg-slate-800/20' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40'"
              @click="item.isOther ? undefined : handleRankingClick(item)"
            >
              <td class="py-1.5">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {{ item.isOther ? '•' : `#${index + 1}` }}
                  </span>
                  <span
                    class="block max-w-[140px] truncate font-medium text-slate-900 dark:text-white"
                    :title="getRankingRowLabel(item)"
                  >
                    {{ getRankingRowLabel(item) }}
                  </span>
                </div>
              </td>
              <td class="py-1.5 text-right text-slate-600 dark:text-slate-400">
                {{ formatNumber(item.requests || 0) }}
              </td>
              <td class="py-1.5 text-right text-slate-600 dark:text-slate-400">
                {{ formatTokens(item.tokens || 0) }}
              </td>
              <td class="py-1.5 text-right font-medium text-blue-600 dark:text-emerald-400">
                ${{ formatCost(item.actual_cost) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Spending Ranking - Empty -->
    <div
      v-else-if="activeView === 'spending_ranking'"
      class="flex h-52 flex-col items-center justify-center text-center"
    >
      <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
      </div>
      <p class="text-xs font-medium text-slate-400 dark:text-slate-400">{{ t('admin.dashboard.noDataAvailable') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import UserBreakdownSubTable from '@/components/charts/UserBreakdownSubTable.vue'
import type { ModelStat, UserSpendingRankingItem } from '@/types'
import { getUserBreakdown } from '@/api/admin/dashboard'

ChartJS.register(ArcElement, Tooltip, Legend)

interface RankingDisplayItem extends Partial<UserSpendingRankingItem> {
  isOther?: boolean
  actual_cost?: number
  requests?: number
  tokens?: number
}

interface Props {
  modelStats: ModelStat[]
  enableRankingView?: boolean
  rankingItems?: UserSpendingRankingItem[]
  rankingTotalActualCost?: number
  rankingTotalRequests?: number
  rankingTotalTokens?: number
  loading?: boolean
  rankingLoading?: boolean
  rankingError?: boolean
  source?: 'requested' | 'upstream' | 'mapping'
  metric?: 'tokens' | 'actual_cost'
  showSourceToggle?: boolean
  showMetricToggle?: boolean
  showAccountCost?: boolean
  enableBreakdown?: boolean
  startDate?: string
  endDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  enableRankingView: false,
  rankingItems: () => [],
  rankingTotalActualCost: 0,
  rankingTotalRequests: 0,
  rankingTotalTokens: 0,
  loading: false,
  rankingLoading: false,
  rankingError: false,
  source: 'requested',
  metric: 'tokens',
  showSourceToggle: false,
  showMetricToggle: false,
  showAccountCost: true,
  enableBreakdown: false,
  startDate: '',
  endDate: ''
})

const emit = defineEmits<{
  'update:source': [value: 'requested' | 'upstream' | 'mapping']
  'update:metric': [value: 'tokens' | 'actual_cost']
  'ranking-click': [item: UserSpendingRankingItem]
}>()

const { t } = useI18n()

const activeView = ref<'model_distribution' | 'spending_ranking'>('model_distribution')

// Breakdown state
const expandedKey = ref<string | null>(null)
const breakdownItems = ref<any[]>([])
const breakdownLoading = ref(false)

const distributionColspan = computed(() => (props.showAccountCost ? 6 : 5))

const handleRankingClick = (item: RankingDisplayItem) => {
  if (item.user_id !== undefined) {
    emit('ranking-click', item as UserSpendingRankingItem)
  }
}

const toggleBreakdown = async (type: 'model', key: string) => {
  const itemKey = `${type}-${key}`
  if (expandedKey.value === itemKey) {
    expandedKey.value = null
    breakdownItems.value = []
    return
  }

  expandedKey.value = itemKey
  breakdownLoading.value = true
  try {
    const res = await getUserBreakdown({
      model: key,
      start_date: props.startDate,
      end_date: props.endDate,
      model_source: props.source
    })
    breakdownItems.value = res.users || []
  } catch (e) {
    console.error('Failed to load breakdown:', e)
    breakdownItems.value = []
  } finally {
    breakdownLoading.value = false
  }
}

// Chart Colors: Blue-White SaaS Theme
const chartColors = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#84cc16'
]

const displayModelStats = computed(() => {
  if (!props.modelStats?.length) return []
  return [...props.modelStats].sort((a, b) => {
    const valA = toFiniteNumber(props.metric === 'actual_cost' ? a.actual_cost : a.total_tokens)
    const valB = toFiniteNumber(props.metric === 'actual_cost' ? b.actual_cost : b.total_tokens)
    return valB - valA
  })
})

const chartData = computed(() => {
  if (!displayModelStats.value.length) return null

  return {
    labels: displayModelStats.value.map((m) => m.model),
    datasets: [
      {
        data: displayModelStats.value.map((m) => toFiniteNumber(props.metric === 'actual_cost' ? m.actual_cost : m.total_tokens)),
        backgroundColor: chartColors.slice(0, displayModelStats.value.length),
        borderWidth: 0
      }
    ]
  }
})

const rankingChartData = computed(() => {
  if (!props.rankingItems?.length) return null

  const labels = props.rankingItems.map((item, index) => `#${index + 1} ${getRankingUserLabel(item)}`)
  const data = props.rankingItems.map((item) => toFiniteNumber(item.actual_cost))
  const backgroundColor = chartColors.slice(0, props.rankingItems.length)

  if (otherRankingItem.value) {
    labels.push(t('admin.dashboard.spendingRankingOther'))
    data.push(otherRankingItem.value.actual_cost || 0)
    backgroundColor.push('#94a3b8')
  }

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderWidth: 0
      }
    ]
  }
})

const otherRankingItem = computed<RankingDisplayItem | null>(() => {
  if (!props.rankingItems?.length) return null

  const rankedActualCost = props.rankingItems.reduce((sum, item) => sum + toFiniteNumber(item.actual_cost), 0)
  const rankedRequests = props.rankingItems.reduce((sum, item) => sum + toFiniteNumber(item.requests), 0)
  const rankedTokens = props.rankingItems.reduce((sum, item) => sum + toFiniteNumber(item.tokens), 0)

  const otherActualCost = Math.max((props.rankingTotalActualCost || 0) - rankedActualCost, 0)
  const otherRequests = Math.max((props.rankingTotalRequests || 0) - rankedRequests, 0)
  const otherTokens = Math.max((props.rankingTotalTokens || 0) - rankedTokens, 0)

  if (otherActualCost <= 0.000001 && otherRequests <= 0 && otherTokens <= 0) return null

  return {
    user_id: 0,
    email: '',
    username: '',
    actual_cost: otherActualCost,
    requests: otherRequests,
    tokens: otherTokens,
    isOther: true
  }
})

const rankingDisplayItems = computed<RankingDisplayItem[]>(() => {
  if (!props.rankingItems?.length) return []
  return otherRankingItem.value
    ? [...props.rankingItems, otherRankingItem.value]
    : [...props.rankingItems]
})

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.raw as number
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          const formattedValue = props.metric === 'actual_cost'
            ? `$${formatCost(value)}`
            : formatTokens(value)
          return `${context.label}: ${formattedValue} (${percentage}%)`
        }
      }
    }
  }
}))

const rankingDoughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.raw as number
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${context.label}: $${formatCost(value)} (${percentage}%)`
        }
      }
    }
  }
}))

const formatTokens = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toLocaleString()
}

const formatNumber = (value: number): string => {
  return toFiniteNumber(value).toLocaleString()
}

const getRankingUserLabel = (item: UserSpendingRankingItem): string => {
  if (item.username?.trim()) return item.username.trim()
  if (item.email?.trim()) return item.email.trim()
  return t('admin.redeem.userPrefix', { id: item.user_id })
}

const getRankingRowLabel = (item: RankingDisplayItem): string => {
  if (item.isOther) return t('admin.dashboard.spendingRankingOther')
  return getRankingUserLabel(item as UserSpendingRankingItem)
}

const toFiniteNumber = (value: unknown): number => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const formatCost = (value: number | null | undefined): string => {
  const safeValue = toFiniteNumber(value)
  if (safeValue >= 1000) {
    return (safeValue / 1000).toFixed(2) + 'K'
  } else if (safeValue >= 1) {
    return safeValue.toFixed(2)
  } else if (safeValue >= 0.01) {
    return safeValue.toFixed(3)
  }
  return safeValue.toFixed(4)
}
</script>