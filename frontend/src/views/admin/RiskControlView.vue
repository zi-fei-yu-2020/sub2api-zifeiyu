<template>
  <AppLayout>
    <div class="space-y-6">
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>

      <template v-else>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">{{ t('admin.riskControl.title') }}</h1>
            <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">{{ t('admin.riskControl.description') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn btn-secondary inline-flex items-center gap-2" :disabled="statusLoading" @click="loadStatus(false)">
              <Icon name="refresh" size="sm" :class="statusLoading ? 'animate-spin' : ''" />
              {{ t('admin.riskControl.refreshStatus') }}
            </button>
            <button type="button" class="btn btn-primary inline-flex items-center gap-2" @click="openSettings">
              <Icon name="cog" size="sm" />
              {{ t('admin.riskControl.openSettings') }}
            </button>
          </div>
        </div>

        <RiskControlRuntimePanel />
        <RiskControlAuditRecords />
      </template>

      <RiskControlSettingsDialog />
      <RiskControlInputDetailDialog />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import RiskControlAuditRecords from '@/components/admin/risk-control/RiskControlAuditRecords.vue'
import RiskControlInputDetailDialog from '@/components/admin/risk-control/RiskControlInputDetailDialog.vue'
import RiskControlRuntimePanel from '@/components/admin/risk-control/RiskControlRuntimePanel.vue'
import RiskControlSettingsDialog from '@/components/admin/risk-control/RiskControlSettingsDialog.vue'
import { provideRiskControlContext, useRiskControlView } from '@/components/admin/risk-control/useRiskControlView'

const riskControl = useRiskControlView()
provideRiskControlContext(riskControl)

const { t, loading, statusLoading, loadStatus, openSettings } = riskControl
</script>
