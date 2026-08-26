import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const readView = (name: string) => readFileSync(resolve(here, `../${name}`), 'utf8')

describe('admin list surface layout contracts', () => {
  it('keeps proxy filters and actions in a balanced responsive toolbar', () => {
    const source = readView('ProxiesView.vue')
    expect(source).toContain('flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between')
    expect(source).toContain("selectedCount > 0 ? 'btn-danger' : 'btn-secondary'")
  })

  it('uses a proportional channel dialog instead of the analytics-sized dialog', () => {
    const source = readView('ChannelsView.vue')
    expect(source).toContain('width="wide"')
    expect(source).not.toContain('width="extra-wide"')
    expect(source).toContain('height: min(68vh, 640px)')
  })

  it('routes every reported list page through the shared rounded table shell', () => {
    const tableViews = [
      'UsersView.vue',
      'AccountsView.vue',
      'GroupsView.vue',
      'ChannelsView.vue',
      'ChannelMonitorView.vue',
      'ProxiesView.vue',
      'SubscriptionsView.vue',
      'RedeemView.vue',
      'PromoCodesView.vue',
      'AnnouncementsView.vue',
      'AuditLogView.vue',
      'affiliates/AdminAffiliateRecordsTable.vue',
      '../user/KeysView.vue',
      '../user/AvailableChannelsView.vue'
    ]

    for (const view of tableViews) {
      expect(readView(view), view).toContain('<TablePageLayout')
    }
  })

  it('keeps the v2 channel monitor form cards explicitly rounded', () => {
    const source = readFileSync(
      resolve(here, '../../../features/channel-monitor-v2/MonitorSettingsPanel.vue'),
      'utf8'
    )
    expect(source).toContain('!rounded-3xl')
  })

})
