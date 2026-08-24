<template>
  <div class="card p-5">
    <div class="border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ t('dashboard.quickActions') }}</h2>
    </div>
    <div class="space-y-3">
      <!-- 1. Create API Key -->
      <button @click="router.push('/keys')" class="group flex w-full items-center gap-3.5 rounded-xl bg-slate-50 p-3.5 text-left transition-all duration-150 hover:bg-blue-50/70 dark:bg-slate-800/50 dark:hover:bg-blue-950/40">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
          <Icon name="key" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-blue-400">{{ t('dashboard.createApiKey') }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('dashboard.generateNewKey') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="sm"
          class="text-slate-400 transition-colors group-hover:text-primary-600 dark:text-slate-500"
        />
      </button>

      <!-- 2. View Usage -->
      <button @click="router.push('/usage')" class="group flex w-full items-center gap-3.5 rounded-xl bg-slate-50 p-3.5 text-left transition-all duration-150 hover:bg-blue-50/70 dark:bg-slate-800/50 dark:hover:bg-blue-950/40">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
          <Icon name="chart" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-blue-400">{{ t('dashboard.viewUsage') }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('dashboard.checkDetailedLogs') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="sm"
          class="text-slate-400 transition-colors group-hover:text-primary-600 dark:text-slate-500"
        />
      </button>

      <!-- 3. Batch Image -->
      <button v-if="canUseBatchImage" @click="router.push('/batch-image')" class="group flex w-full items-center gap-3.5 rounded-xl bg-slate-50 p-3.5 text-left transition-all duration-150 hover:bg-blue-50/70 dark:bg-slate-800/50 dark:hover:bg-blue-950/40">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
          <Icon name="sparkles" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-blue-400">{{ t('dashboard.batchImageAgent') }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('dashboard.batchImageAgentDesc') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="sm"
          class="text-slate-400 transition-colors group-hover:text-primary-600 dark:text-slate-500"
        />
      </button>

      <!-- 4. Redeem Code -->
      <button @click="router.push('/redeem')" class="group flex w-full items-center gap-3.5 rounded-xl bg-slate-50 p-3.5 text-left transition-all duration-150 hover:bg-blue-50/70 dark:bg-slate-800/50 dark:hover:bg-blue-950/40">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
          <Icon name="gift" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-blue-400">{{ t('dashboard.redeemCode') }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('dashboard.addBalanceWithCode') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="sm"
          class="text-slate-400 transition-colors group-hover:text-primary-600 dark:text-slate-500"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'
const router = useRouter()
const { t } = useI18n()
const { canUseBatchImage, refreshBatchImageAccess } = useBatchImageAccess()

onMounted(() => {
  void refreshBatchImageAccess()
})
</script>