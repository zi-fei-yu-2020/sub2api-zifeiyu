<template>
  <div ref="tableRootRef" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          :sticky-first-column="true"
          ref="dataTableRef"
          :columns="cols"
          :data="accounts"
          :loading="loading"
          row-key="id"
          :server-side-sort="true"
          @sort="handleSort"
          default-sort-key="name"
          default-sort-order="asc"
          :sort-storage-key="ACCOUNT_SORT_STORAGE_KEY"
          :estimate-row-height="156"
          :overscan="5"
          :virtualize-threshold="50"
        >
          <template #header-select>
            <input
              type="checkbox"
              class="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              :checked="allVisibleSelected"
              @click.stop
              @change="toggleSelectAllVisible($event)"
            />
          </template>
          <template #cell-select="{ row }">
            <input type="checkbox" :checked="isSelected(row.id)" @change="toggleSel(row.id)" class="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          </template>
          <template #cell-id="{ value }">
            <span class="font-mono text-xs text-slate-400 dark:text-slate-400">#{{ value }}</span>
          </template>
          <template #cell-name="{ row, value }">
            <div class="flex items-center justify-between gap-2 min-w-0">
              <div class="flex flex-col min-w-0 flex-1">
                <HelpTooltip
                  v-if="accountHomepageUrl(row)"
                  :content="accountHomepageUrl(row)"
                  width-class="w-max max-w-sm break-all"
                  class="-ml-1 self-start"
                >
                  <template #trigger>
                    <a
                      :href="accountHomepageUrl(row)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="border-b border-dotted border-slate-300 font-medium text-slate-900 hover:text-primary-600 dark:border-slate-700 dark:text-white dark:hover:text-primary-400 transition-colors truncate max-w-[170px] sm:max-w-xs inline-block"
                    >
                      {{ value }}
                    </a>
                  </template>
                </HelpTooltip>
                <span v-else class="font-medium text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-xs">{{ value }}</span>
                <span
                  v-if="accountDisplayEmail(row)"
                  class="text-xs text-slate-400 dark:text-slate-400 truncate max-w-[170px] sm:max-w-xs"
                  :title="accountDisplayEmail(row) + (row.parent_chatgpt_account_id ? ' · ' + row.parent_chatgpt_account_id : '')"
                >
                  {{ accountDisplayEmail(row) }}
                </span>
              </div>
              <button
                type="button"
                @click.stop="handleTest(row)"
                class="inline-flex items-center gap-1 shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200/70 hover:bg-primary-600 hover:text-white transition-all shadow-2xs dark:bg-primary-950/40 dark:border-primary-800/60 dark:text-primary-300 dark:hover:bg-primary-600 dark:hover:text-white"
                :title="t('admin.accounts.testConnection')"
              >
                <Icon name="play" size="xs" :stroke-width="2.2" />
                <span>{{ t('admin.accounts.testConnection') || '测试' }}</span>
              </button>
            </div>
          </template>
          <template #cell-notes="{ value }">
            <span v-if="value" :title="value" class="block max-w-xs truncate text-sm text-slate-600 dark:text-gray-300">{{ value }}</span>
            <span v-else class="text-sm text-slate-400 dark:text-dark-500">-</span>
          </template>
          <template #cell-platform_type="{ row }">
            <div class="flex min-w-0 flex-col gap-1">
              <div class="flex flex-wrap items-center gap-1">
                <PlatformTypeBadge :platform="row.platform" :type="row.type"
                  :auth-mode="getOpenAIAuthMode(row)"
                  :plan-type="getAccountPlanType(row)"
                  :privacy-mode="row.extra?.privacy_mode || row.parent_privacy_mode"
                  :subscription-expires-at="row.credentials?.subscription_expires_at || row.parent_subscription_expires_at" />
                <span
                  v-if="getAntigravityTierLabel(row)"
                  :class="['inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', getAntigravityTierClass(row)]"
                >
                  {{ getAntigravityTierLabel(row) }}
                </span>
              </div>
              <div
                v-if="getOpenAICompactMeta(row)"
                :class="[
                  'inline-flex items-center gap-1.5 pl-0.5 text-[11px] font-medium leading-4',
                  getOpenAICompactMeta(row)?.className
                ]"
                :title="getOpenAICompactTitle(row)"
              >
                <span :class="['h-1.5 w-1.5 rounded-full', getOpenAICompactMeta(row)?.dotClass]" />
                <span>{{ getOpenAICompactMeta(row)?.label }}</span>
              </div>
            </div>
          </template>
          <template #cell-capacity="{ row }">
            <AccountCapacityCell :account="row" />
          </template>
          <template #cell-status="{ row }">
            <div class="flex items-center gap-2">
              <AccountStatusToggle
                :account="row"
                :loading="togglingStatus === row.id"
                @toggle="handleToggleStatus(row)"
              />
              <AccountStatusIndicator
                :account="row"
                hide-normal-status
                @show-temp-unsched="handleShowTempUnsched"
              />
            </div>
          </template>
          <template #cell-schedulable="{ row }">
            <AccountSchedulableToggle
              :account="row"
              :loading="togglingSchedulable === row.id"
              @toggle="handleToggleSchedulable(row)"
            />
          </template>
          <template #cell-today_stats="{ row }">
            <AccountTodayStatsCell
              :stats="todayStatsByAccountId[String(row.id)] ?? null"
              :loading="todayStatsLoading"
              :error="todayStatsError"
            />
          </template>
          <template #cell-groups="{ row }">
            <AccountGroupsCell :groups="row.groups" :max-display="4" />
          </template>
          <template #header-usage="{ column }">
            <div class="flex items-center">
              <span>{{ column.label }}</span>
              <HelpTooltip :content="t('admin.accounts.usageWindowsHint')" width-class="w-72" />
            </div>
          </template>
          <template #cell-usage="{ row }">
            <AccountUsageCell
              :account="row"
              :today-stats="todayStatsByAccountId[String(row.id)] ?? null"
              :today-stats-loading="todayStatsLoading"
              :manual-refresh-token="usageManualRefreshToken"
              :batched-usage="usageBatchByAccountId[String(row.id)] ?? null"
              :batched-usage-error="usageBatchErrorByAccountId[String(row.id)] ?? null"
              :batched-usage-loading="usageBatchLoadingByAccountId[String(row.id)] === true"
              :request-batched-usage="isDesktopViewport ? queueBatchedUsage : null"
              @account-updated="handleAccountUpdated"
              @usage-loaded="handleAccountUsageLoaded(row.id, $event)"
            />
          </template>
          <template #cell-proxy="{ row }">
            <div class="flex flex-col gap-1">
              <div v-if="row.proxy" class="flex items-center gap-2">
                <span class="text-sm text-slate-700 dark:text-gray-300">{{ row.proxy.name }}</span>
                <span v-if="row.proxy.country_code" class="text-xs text-slate-400 dark:text-slate-400">
                  ({{ row.proxy.country_code }})
                </span>
              </div>
              <span v-else class="text-sm text-slate-400 dark:text-dark-500">-</span>
              <div v-if="row.proxy && row.proxy.expires_at" class="flex items-center gap-2 text-xs">
                <span class="text-slate-600 dark:text-gray-300">{{ formatDateTime(row.proxy.expires_at) }}</span>
                <span :class="proxyExpiryBadge(row.proxy)">{{ proxyExpiryText(row.proxy) }}</span>
              </div>
              <div v-if="row.proxy_fallback_origin_id" class="flex items-center gap-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :title="t('admin.accounts.fallbackActiveTip', { origin: row.proxy_fallback_origin_name })">
                  {{ t('admin.accounts.fallbackActive') }}
                </span>
                <button class="text-xs px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-dark-700" @click="onRevertFallback(row)">{{ t('admin.accounts.revertProxy') }}</button>
              </div>
            </div>
          </template>
          <template #cell-rate_multiplier="{ row }">
            <span class="inline-flex items-center gap-1 text-sm font-mono text-slate-700 dark:text-gray-300">
              <span>{{ formatMultiplier(row.rate_multiplier ?? 1) }}x</span>
              <span
                v-if="row.extra?.upstream_billing_rate_sync_enabled === true"
                class="inline-flex cursor-help text-blue-600 dark:text-emerald-400"
                :aria-label="t('admin.accounts.upstreamBilling.syncedRateTooltip')"
                :title="t('admin.accounts.upstreamBilling.syncedRateTooltip')"
                data-testid="account-rate-sync-indicator"
              >
                <Icon name="sync" size="xs" />
              </span>
            </span>
          </template>
          <template #header-upstream_billing_rate="{ column }">
            <div class="flex items-center gap-1">
              <span>{{ column.label }}</span>
              <span @click.stop>
                <HelpTooltip :content="t('admin.accounts.upstreamBilling.trustWarning')" width-class="w-80" />
              </span>
            </div>
          </template>
          <template #cell-upstream_billing_rate="{ row }">
            <UpstreamBillingRateCell
              :account="row"
              :global-probe-enabled="upstreamBillingProbeGloballyEnabled"
              :now="upstreamBillingNow"
              :probing="probingUpstreamBilling.has(row.id)"
              @probe="handleProbeUpstreamBilling(row)"
            />
          </template>
          <template #cell-priority="{ value }">
            <span class="text-sm text-slate-700 dark:text-gray-300">{{ value }}</span>
          </template>
          <template #header-scheduler_score="{ column }">
            <div class="flex items-center">
              <span>{{ column.label }}</span>
              <HelpTooltip :content="t('admin.accounts.schedulerScore.hint')" width-class="w-80" />
            </div>
          </template>
          <template #cell-scheduler_score="{ row }">
            <div v-if="getSchedulerScoreRows(row).length" class="flex min-w-[7rem] flex-col gap-0.5 font-mono text-[11px] leading-4">
              <div
                v-for="score in getSchedulerScoreRows(row)"
                :key="String(score.group_id)"
                class="flex items-center gap-1 whitespace-nowrap text-slate-700 dark:text-gray-300"
                :title="`${formatSchedulerScoreGroup(score)} / ${formatSchedulerScore(score.base_score)} / ${formatStickySchedulerScore(score)}`"
              >
                <span class="max-w-[4.75rem] truncate text-slate-400 dark:text-dark-400">{{ formatSchedulerScoreGroup(score) }}</span>
                <span class="text-gray-300 dark:text-slate-600">/</span>
                <span>{{ formatSchedulerScore(score.base_score) }}</span>
                <span class="text-gray-300 dark:text-slate-600">/</span>
                <span class="text-primary-700 dark:text-primary-300">{{ formatStickySchedulerScore(score) }}</span>
              </div>
            </div>
            <span v-else class="text-sm text-slate-400 dark:text-dark-500">-</span>
          </template>
          <template #cell-last_used_at="{ value }">
            <span class="text-sm text-slate-400 dark:text-dark-400">{{ formatRelativeTime(value) }}</span>
          </template>
          <template #cell-created_at="{ value }">
            <span class="text-sm text-slate-400 dark:text-dark-400">{{ formatDateTime(value) }}</span>
          </template>
          <template #cell-expires_at="{ row, value }">
            <div class="flex flex-col items-start gap-1">
              <span class="text-sm text-slate-400 dark:text-dark-400">{{ formatExpiresAt(value) }}</span>
              <div v-if="isExpired(value) || (row.auto_pause_on_expired && value)" class="flex items-center gap-1">
                <span
                  v-if="isExpired(value)"
                  class="inline-flex items-center rounded-xl bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                >
                  {{ t('admin.accounts.expired') }}
                </span>
                <span
                  v-if="row.auto_pause_on_expired && value"
                  class="inline-flex items-center rounded-xl bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                >
                  {{ t('admin.accounts.autoPauseOnExpired') }}
                </span>
              </div>
            </div>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex items-center gap-1">
              <button @click="handleEdit(row)" class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                <span class="text-xs">{{ t('common.edit') }}</span>
              </button>
              <button @click="handleDelete(row)" class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                <span class="text-xs">{{ t('common.delete') }}</span>
              </button>
              <button @click="openMenu(row, $event)" class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-dark-700 dark:hover:text-white">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                <span class="text-xs">{{ t('common.more') }}</span>
              </button>
            </div>
          </template>
        </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from '@/components/common/DataTable.vue'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import PlatformTypeBadge from '@/components/common/PlatformTypeBadge.vue'
import Icon from '@/components/icons/Icon.vue'
import AccountStatusIndicator from '@/components/account/AccountStatusIndicator.vue'
import AccountStatusToggle from '@/components/account/AccountStatusToggle.vue'
import AccountSchedulableToggle from '@/components/account/AccountSchedulableToggle.vue'
import AccountUsageCell from '@/components/account/AccountUsageCell.vue'
import AccountTodayStatsCell from '@/components/account/AccountTodayStatsCell.vue'
import AccountGroupsCell from '@/components/account/AccountGroupsCell.vue'
import AccountCapacityCell from '@/components/account/AccountCapacityCell.vue'
import UpstreamBillingRateCell from '@/components/account/UpstreamBillingRateCell.vue'
import { formatDateTime, formatRelativeTime } from '@/utils/format'
import { formatMultiplier } from '@/utils/formatters'
import type {
  Account,
  AccountSchedulerGroupScore,
  AccountUsageInfo,
  WindowStats
} from '@/types'

type AccountColumn = { key: string; label: string; sortable?: boolean }
type AccountSortOrder = 'asc' | 'desc'

type Props = {
  cols: AccountColumn[]
  accounts: Account[]
  loading: boolean
  sortStorageKey: string
  allVisibleSelected: boolean
  isSelected: (id: number) => boolean
  togglingStatus: number | null
  togglingSchedulable: number | null
  todayStatsByAccountId: Record<string, WindowStats>
  todayStatsLoading: boolean
  todayStatsError: string | null
  usageBatchByAccountId: Record<string, AccountUsageInfo | null>
  usageBatchErrorByAccountId: Record<string, string | null>
  usageBatchLoadingByAccountId: Record<string, boolean>
  usageManualRefreshToken: number
  isDesktopViewport: boolean
  queueBatchedUsage: ((account: Account, options?: { force?: boolean }) => void) | null
  upstreamBillingProbeGloballyEnabled?: boolean
  upstreamBillingNow: number
  probingUpstreamBilling: Set<number>
  accountHomepageUrl: (account: Account) => string
  accountDisplayEmail: (account: Account) => string
  getOpenAIAuthMode: (account: Account) => string | undefined
  getAccountPlanType: (account: Account) => string | undefined
  getAntigravityTierLabel: (account: Account) => string | null
  getAntigravityTierClass: (account: Account) => string
  getOpenAICompactMeta: (account: Account) => { label: string; className: string; dotClass: string } | null
  getOpenAICompactTitle: (account: Account) => string
  getSchedulerScoreRows: (account: Account) => AccountSchedulerGroupScore[]
  formatSchedulerScoreGroup: (score: AccountSchedulerGroupScore) => string
  formatSchedulerScore: (value: unknown) => string
  formatStickySchedulerScore: (score: AccountSchedulerGroupScore) => string
  formatExpiresAt: (value: number | null) => string
  isExpired: (value: number | null) => boolean
  proxyExpiryBadge: (proxy: NonNullable<Account['proxy']>) => string
  proxyExpiryText: (proxy: NonNullable<Account['proxy']>) => string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  sort: [key: string, order: AccountSortOrder]
  'toggle-select-all-visible': [event: Event]
  'toggle-selection': [accountId: number]
  test: [account: Account]
  'toggle-status': [account: Account]
  'show-temp-unsched': [account: Account]
  'toggle-schedulable': [account: Account]
  'account-updated': [account: Account]
  'usage-loaded': [accountId: number, usage: AccountUsageInfo]
  'revert-fallback': [account: Account]
  'probe-upstream-billing': [account: Account]
  edit: [account: Account]
  delete: [account: Account]
  'open-menu': [account: Account, event: MouseEvent]
}>()

const { t } = useI18n()
const tableRootRef = ref<HTMLElement | null>(null)
const dataTableRef = ref<InstanceType<typeof DataTable> | null>(null)

const {
  cols,
  accounts,
  loading,
  sortStorageKey: ACCOUNT_SORT_STORAGE_KEY,
  allVisibleSelected,
  isSelected,
  togglingStatus,
  togglingSchedulable,
  todayStatsByAccountId,
  todayStatsLoading,
  todayStatsError,
  usageBatchByAccountId,
  usageBatchErrorByAccountId,
  usageBatchLoadingByAccountId,
  usageManualRefreshToken,
  isDesktopViewport,
  queueBatchedUsage,
  upstreamBillingProbeGloballyEnabled,
  upstreamBillingNow,
  probingUpstreamBilling,
  accountHomepageUrl,
  accountDisplayEmail,
  getOpenAIAuthMode,
  getAccountPlanType,
  getAntigravityTierLabel,
  getAntigravityTierClass,
  getOpenAICompactMeta,
  getOpenAICompactTitle,
  getSchedulerScoreRows,
  formatSchedulerScoreGroup,
  formatSchedulerScore,
  formatStickySchedulerScore,
  formatExpiresAt,
  isExpired,
  proxyExpiryBadge,
  proxyExpiryText
} = toRefs(props)

const handleSort = (key: string, order: AccountSortOrder) => emit('sort', key, order)
const toggleSelectAllVisible = (event: Event) => emit('toggle-select-all-visible', event)
const toggleSel = (accountId: number) => emit('toggle-selection', accountId)
const handleTest = (account: Account) => emit('test', account)
const handleToggleStatus = (account: Account) => emit('toggle-status', account)
const handleShowTempUnsched = (account: Account) => emit('show-temp-unsched', account)
const handleToggleSchedulable = (account: Account) => emit('toggle-schedulable', account)
const handleAccountUpdated = (account: Account) => emit('account-updated', account)
const handleAccountUsageLoaded = (accountId: number, usage: AccountUsageInfo) => emit('usage-loaded', accountId, usage)
const onRevertFallback = (account: Account) => emit('revert-fallback', account)
const handleProbeUpstreamBilling = (account: Account) => emit('probe-upstream-billing', account)
const handleEdit = (account: Account) => emit('edit', account)
const handleDelete = (account: Account) => emit('delete', account)
const openMenu = (account: Account, event: MouseEvent) => emit('open-menu', account, event)

defineExpose({ tableRootRef, dataTableRef })
</script>
