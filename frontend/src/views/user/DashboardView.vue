<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Top Stats Section (with graceful skeleton/loading) -->
      <UserDashboardStats
        :stats="stats"
        :balance="user?.balance || 0"
        :is-simple="authStore.isSimpleMode"
        :platform-quotas="platformQuotas"
      />

      <!-- Charts Section (independent async refresh) -->
      <UserDashboardCharts
        v-model:startDate="startDate"
        v-model:endDate="endDate"
        v-model:granularity="granularity"
        :loading="loadingCharts"
        :trend="trendData"
        :models="modelStats"
        @dateRangeChange="loadCharts"
        @granularityChange="loadCharts"
        @refresh="refreshChartsOnly"
      />

      <!-- Bottom Grids: Recent Usage & Quick Actions -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <UserDashboardRecentUsage :data="recentUsage" :loading="loadingUsage" />
        </div>
        <div class="lg:col-span-1">
          <UserDashboardQuickActions />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usageAPI, type UserDashboardStats as UserStatsType } from '@/api/usage'
import AppLayout from '@/components/layout/AppLayout.vue'
import UserDashboardStats from '@/components/user/dashboard/UserDashboardStats.vue'
import UserDashboardCharts from '@/components/user/dashboard/UserDashboardCharts.vue'
import UserDashboardRecentUsage from '@/components/user/dashboard/UserDashboardRecentUsage.vue'
import UserDashboardQuickActions from '@/components/user/dashboard/UserDashboardQuickActions.vue'
import type { UsageLog, TrendDataPoint, ModelStat, PlatformQuotaItem } from '@/types'
import { getMyPlatformQuotas } from '@/api/user'
import { formatDateLocalInput } from '@/utils/format'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const stats = ref<UserStatsType | null>(null)
const loadingStats = ref(false)
const loadingUsage = ref(false)
const loadingCharts = ref(false)

const trendData = ref<TrendDataPoint[]>([])
const modelStats = ref<ModelStat[]>([])
const recentUsage = ref<UsageLog[]>([])
const platformQuotas = ref<PlatformQuotaItem[] | null>(null)

const startDate = ref(formatDateLocalInput(new Date(Date.now() - 6 * 86400000)))
const endDate = ref(formatDateLocalInput(new Date()))
const granularity = ref('day')

// Load top card stats without blocking whole page
const loadStats = async () => {
  loadingStats.value = true
  try {
    await authStore.refreshUser()
    stats.value = await usageAPI.getDashboardStats()
  } catch (error) {
    console.error('Failed to load dashboard stats:', error)
  } finally {
    loadingStats.value = false
  }
}

// Load middle charts (trend & models distribution) independently
const loadCharts = async () => {
  loadingCharts.value = true
  try {
    const [trendRes, modelsRes] = await Promise.all([
      usageAPI.getDashboardTrend({
        start_date: startDate.value,
        end_date: endDate.value,
        granularity: granularity.value as any
      }),
      usageAPI.getDashboardModels({
        start_date: startDate.value,
        end_date: endDate.value
      })
    ])
    trendData.value = trendRes.trend || []
    modelStats.value = modelsRes.models || []
  } catch (error) {
    console.error('Failed to load charts:', error)
  } finally {
    loadingCharts.value = false
  }
}

// Load bottom recent logs
const loadRecent = async () => {
  loadingUsage.value = true
  try {
    const res = await usageAPI.getByDateRange(startDate.value, endDate.value)
    recentUsage.value = res.items.slice(0, 5)
  } catch (error) {
    console.error('Failed to load recent usage:', error)
  } finally {
    loadingUsage.value = false
  }
}

const loadPlatformQuotas = async () => {
  try {
    const data = await getMyPlatformQuotas()
    platformQuotas.value = data.platform_quotas ?? []
  } catch (error) {
    console.warn('Failed to load platform quotas:', error)
    platformQuotas.value = []
  }
}

// Refresh button inside the chart filter bar only refreshes chart & table data
const refreshChartsOnly = async () => {
  await Promise.all([loadCharts(), loadStats(), loadRecent()])
}

onMounted(() => {
  loadStats()
  loadCharts()
  loadRecent()
  loadPlatformQuotas()
})
</script>