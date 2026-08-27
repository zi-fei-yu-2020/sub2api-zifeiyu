import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GroupTable from '../GroupTable.vue'
import type { AdminGroup } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const group: AdminGroup = {
  id: 7,
  name: 'Composite Group',
  description: null,
  platform: 'composite',
  rate_multiplier: 1,
  rpm_limit: 0,
  is_exclusive: false,
  status: 'active',
  subscription_type: 'standard',
  daily_limit_usd: null,
  weekly_limit_usd: null,
  monthly_limit_usd: null,
  allow_image_generation: false,
  image_rate_independent: false,
  image_rate_multiplier: 1,
  image_price_1k: null,
  image_price_2k: null,
  image_price_4k: null,
  claude_code_only: false,
  fallback_group_id: null,
  fallback_group_id_on_invalid_request: null,
  allow_messages_dispatch: false,
  default_mapped_model: '',
  require_oauth_only: false,
  require_privacy_set: false,
  created_at: '2026-08-27T00:00:00Z',
  updated_at: '2026-08-27T00:00:00Z',
  model_routing: null,
  model_routing_enabled: false,
  mcp_xml_inject: true,
  supported_model_scopes: [],
  account_count: 0,
  active_account_count: 0,
  rate_limited_account_count: 0,
  sort_order: 1
}

const DataTableStub = {
  props: ['data', 'columns'],
  emits: ['sort'],
  template: `
    <div>
      <button data-test="sort" @click="$emit('sort', 'name', 'desc')">sort</button>
      <div v-for="row in data" :key="row.id">
        <slot name="cell-actions" :row="row" />
      </div>
      <slot v-if="data.length === 0" name="empty" />
    </div>
  `
}

describe('GroupTable', () => {
  it('forwards table sorting and all row actions without changing their payloads', async () => {
    const wrapper = mount(GroupTable, {
      props: {
        columns: [{ key: 'name', label: 'Name' }],
        groups: [group],
        loading: false,
        usageLoading: false,
        usageMap: new Map(),
        capacityMap: new Map(),
        duplicatingGroupIds: new Set()
      },
      global: {
        stubs: {
          DataTable: DataTableStub,
          EmptyState: true,
          PlatformIcon: true,
          GroupCapacityBadge: true,
          Icon: true
        }
      }
    })

    await wrapper.get('[data-test="sort"]').trigger('click')
    await wrapper.get('[data-testid="group-duplicate"]').trigger('click')
    const actionButtons = wrapper.findAll('button').filter((button) => button.attributes('data-test') !== 'sort')
    await actionButtons[0].trigger('click')
    await actionButtons[2].trigger('click')
    await actionButtons[3].trigger('click')
    await actionButtons[4].trigger('click')
    await actionButtons[5].trigger('click')

    expect(wrapper.emitted('sort')?.[0]).toEqual(['name', 'desc'])
    expect(wrapper.emitted('duplicate')?.[0]).toEqual([group])
    expect(wrapper.emitted('edit')?.[0]).toEqual([group])
    expect(wrapper.emitted('compositeRoutes')?.[0]).toEqual([group])
    expect(wrapper.emitted('rateMultipliers')?.[0]).toEqual([group])
    expect(wrapper.emitted('rpmOverrides')?.[0]).toEqual([group])
    expect(wrapper.emitted('delete')?.[0]).toEqual([group])
  })

  it('keeps the duplicate action disabled while the group is in flight', () => {
    const wrapper = mount(GroupTable, {
      props: {
        columns: [],
        groups: [group],
        loading: false,
        usageLoading: false,
        usageMap: new Map(),
        capacityMap: new Map(),
        duplicatingGroupIds: new Set([group.id])
      },
      global: { stubs: { DataTable: DataTableStub, EmptyState: true, PlatformIcon: true, GroupCapacityBadge: true, Icon: true } }
    })

    expect(wrapper.get('[data-testid="group-duplicate"]').attributes('disabled')).toBeDefined()
  })
})
