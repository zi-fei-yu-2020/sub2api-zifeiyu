import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import type { Account } from '@/types'
import AccountsView from '../AccountsView.vue'

const { listAccounts, updateAccount, recoverState } = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  updateAccount: vi.fn(),
  recoverState: vi.fn(),
}))

vi.mock('@/api/admin', () => ({
  adminAPI: {
    accounts: {
      list: listAccounts,
      listWithEtag: vi.fn().mockResolvedValue({ notModified: true, etag: null, data: null }),
      getBatchTodayStats: vi.fn().mockResolvedValue({ stats: {} }),
      getUpstreamBillingProbeSettings: vi.fn().mockResolvedValue({ enabled: true, interval_minutes: 30 }),
      update: updateAccount,
      recoverState,
      delete: vi.fn(),
      batchClearError: vi.fn(),
      batchRefresh: vi.fn(),
      toggleSchedulable: vi.fn(),
    },
    proxies: { getAll: vi.fn().mockResolvedValue([]) },
    groups: { getAll: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ token: 'test-token', isSimpleMode: false }),
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

const DataTableStub = {
  props: ['data', 'stickyColumnKey', 'stickyActionsColumn'],
  template: `
    <div
      data-test="data-table"
      :data-sticky-column="stickyColumnKey || ''"
      :data-sticky-actions="String(Boolean(stickyActionsColumn))"
    >
      <div v-for="row in data" :key="row.id" :data-test="'status-row-' + row.id">
        <slot name="cell-status" :row="row" />
      </div>
    </div>
  `,
}

const baseAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'account',
  platform: 'openai',
  type: 'apikey',
  proxy_id: null,
  concurrency: 1,
  priority: 0,
  status: 'active',
  schedulable: true,
  error_message: null,
  last_used_at: null,
  expires_at: null,
  auto_pause_on_expired: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  rate_limited_at: null,
  rate_limit_reset_at: null,
  overload_until: null,
  temp_unschedulable_until: null,
  temp_unschedulable_reason: null,
  ...overrides,
})

function mountView(account: Account) {
  listAccounts.mockResolvedValue({ items: [account], total: 1, page: 1, page_size: 10, pages: 1 })
  return mount(AccountsView, {
    global: {
      stubs: {
        AppLayout: { template: '<div><slot /></div>' },
        TablePageLayout: { template: '<div><slot name="filters" /><slot name="table" /></div>' },
        DataTable: DataTableStub,
        AccountStatusIndicator: true,
        AccountTableActions: { template: '<div><slot name="beforeCreate" /><slot name="after" /></div>' },
        AccountTableFilters: true,
        AccountBulkActionsBar: true,
        Pagination: true,
        ConfirmDialog: true,
        AccountActionMenu: true,
        ImportDataModal: true,
        ReAuthAccountModal: true,
        AccountTestModal: true,
        AccountStatsModal: true,
        ScheduledTestsPanel: true,
        SyncFromCrsModal: true,
        TempUnschedStatusModal: true,
        ErrorPassthroughRulesModal: true,
        TLSFingerprintProfilesModal: true,
        CreateAccountModal: true,
        EditAccountModal: true,
        BulkEditAccountModal: true,
        PlatformTypeBadge: true,
        AccountCapacityCell: true,
        AccountTodayStatsCell: true,
        AccountGroupsCell: true,
        AccountUsageCell: true,
        AccountSchedulableToggle: true,
        HelpTooltip: true,
        Icon: true,
        Teleport: true,
      },
    },
  })
}

describe('admin AccountsView status switch', () => {
  beforeEach(() => {
    localStorage.clear()
    listAccounts.mockReset()
    updateAccount.mockReset()
    recoverState.mockReset()
  })

  it('pins only the name column and leaves the actions column scrollable', async () => {
    const wrapper = mountView(baseAccount())
    await flushPromises()
    expect(wrapper.get('[data-test="data-table"]').attributes('data-sticky-column')).toBe('name')
    expect(wrapper.get('[data-test="data-table"]').attributes('data-sticky-actions')).toBe('false')
  })

  it('disables an active account through the status switch', async () => {
    const account = baseAccount()
    updateAccount.mockResolvedValue({ ...account, status: 'disabled' })
    const wrapper = mountView(account)
    await flushPromises()

    await wrapper.get('[data-testid="account-status-toggle"]').trigger('click')
    await flushPromises()

    expect(updateAccount).toHaveBeenCalledWith(1, { status: 'disabled' })
    expect(recoverState).not.toHaveBeenCalled()
  })

  it('enables a disabled account through the status switch', async () => {
    const account = baseAccount({ status: 'disabled' })
    updateAccount.mockResolvedValue({ ...account, status: 'active' })
    const wrapper = mountView(account)
    await flushPromises()

    await wrapper.get('[data-testid="account-status-toggle"]').trigger('click')
    await flushPromises()

    expect(updateAccount).toHaveBeenCalledWith(1, { status: 'active' })
  })

  it('uses recover-state for an account in error state', async () => {
    const account = baseAccount({ status: 'error', error_message: 'failed' })
    recoverState.mockResolvedValue({ ...account, status: 'active', error_message: null })
    const wrapper = mountView(account)
    await flushPromises()

    await wrapper.get('[data-testid="account-status-toggle"]').trigger('click')
    await flushPromises()

    expect(recoverState).toHaveBeenCalledWith(1)
    expect(updateAccount).not.toHaveBeenCalled()
  })
})
