import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountDataTable from '../AccountDataTable.vue'

vi.mock('vue-i18n', async importOriginal => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key })
  }
})

const DataTableStub = {
  props: ['stickyFirstColumn', 'columns', 'sortStorageKey'],
  emits: ['sort'],
  template: `
    <div
      data-test="data-table"
      :data-sticky-first-column="String(stickyFirstColumn)"
      :data-sort-storage-key="sortStorageKey"
    >
      <span v-for="column in columns" :key="column.key" :data-column="column.key" />
      <button data-test="sort" @click="$emit('sort', 'name', 'desc')" />
    </div>
  `
}

const stringDash = () => '-'

function mountTable() {
  return mount(AccountDataTable, {
    props: {
      cols: [
        { key: 'select', label: '' },
        { key: 'name', label: 'Name' },
        { key: 'actions', label: 'Actions' }
      ],
      accounts: [],
      loading: false,
      sortStorageKey: 'account-table-sort',
      allVisibleSelected: false,
      isSelected: () => false,
      togglingStatus: null,
      togglingSchedulable: null,
      todayStatsByAccountId: {},
      todayStatsLoading: false,
      todayStatsError: null,
      usageBatchByAccountId: {},
      usageBatchErrorByAccountId: {},
      usageBatchLoadingByAccountId: {},
      usageManualRefreshToken: 0,
      isDesktopViewport: true,
      queueBatchedUsage: null,
      upstreamBillingProbeGloballyEnabled: true,
      upstreamBillingNow: 0,
      probingUpstreamBilling: new Set<number>(),
      accountHomepageUrl: () => '',
      accountDisplayEmail: () => '',
      getOpenAIAuthMode: () => undefined,
      getAccountPlanType: () => undefined,
      getAntigravityTierLabel: () => null,
      getAntigravityTierClass: () => '',
      getOpenAICompactMeta: () => null,
      getOpenAICompactTitle: () => '',
      getSchedulerScoreRows: () => [],
      formatSchedulerScoreGroup: stringDash,
      formatSchedulerScore: stringDash,
      formatStickySchedulerScore: stringDash,
      formatExpiresAt: stringDash,
      isExpired: () => false,
      proxyExpiryBadge: () => '',
      proxyExpiryText: stringDash
    },
    global: {
      stubs: {
        DataTable: DataTableStub,
        HelpTooltip: true,
        PlatformTypeBadge: true,
        Icon: true,
        AccountStatusIndicator: true,
        AccountStatusToggle: true,
        AccountSchedulableToggle: true,
        AccountUsageCell: true,
        AccountTodayStatsCell: true,
        AccountGroupsCell: true,
        AccountCapacityCell: true,
        UpstreamBillingRateCell: true
      }
    }
  })
}

describe('AccountDataTable', () => {
  it('preserves the pinned leading columns and leaves actions in normal column flow', () => {
    const wrapper = mountTable()
    const table = wrapper.get('[data-test="data-table"]')

    expect(table.attributes('data-sticky-first-column')).toBe('true')
    expect(table.attributes('data-sort-storage-key')).toBe('account-table-sort')
    expect(wrapper.findAll('[data-column]').map(node => node.attributes('data-column'))).toEqual([
      'select',
      'name',
      'actions'
    ])
  })

  it('forwards server-side sorting without changing the payload', async () => {
    const wrapper = mountTable()
    await wrapper.get('[data-test="sort"]').trigger('click')
    expect(wrapper.emitted('sort')).toEqual([['name', 'desc']])
  })
})
