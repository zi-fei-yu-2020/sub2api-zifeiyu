import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { buildAuthSourceDefaultsState, normalizePlatformQuotasMap } from '@/api/admin/settings'
import DefaultUserSettingsPanel from '../DefaultUserSettingsPanel.vue'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

function mountPanel() {
  const form = reactive({
    default_balance: 0,
    default_concurrency: 1,
    default_user_rpm_limit: 0,
    default_subscriptions: [{ group_id: 7, validity_days: 30 }],
    default_platform_quotas: normalizePlatformQuotasMap(),
    force_email_on_third_party_signup: false,
  })
  const authSourceDefaults = reactive(buildAuthSourceDefaultsState({}))
  authSourceDefaults.email.grant_on_signup = true
  authSourceDefaults.email.subscriptions = [{ group_id: 7, validity_days: 30 }]
  const wrapper = mount(DefaultUserSettingsPanel, {
    props: {
      form,
      subscriptionGroups: [{ id: 7, name: 'Pro', description: 'Plan', platform: 'openai', subscription_type: 'subscription', rate_multiplier: 1, status: 'active' }] as never,
      defaultSubscriptionGroupOptions: [{ value: 7, label: 'Pro', description: 'Plan', platform: 'openai', subscriptionType: 'subscription', rate: 1 }],
      authSourceDefaults,
      authSourceDefaultsMeta: [{ source: 'email', title: 'Email', description: 'Email signup' }],
    },
    global: { stubs: { GroupBadge: true, GroupOptionItem: true } },
  })
  return { wrapper, form, authSourceDefaults }
}

describe('DefaultUserSettingsPanel', () => {
  it('preserves both cards, tables and form controls', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.findAll('.card')).toHaveLength(2)
    expect(wrapper.findAll('table')).toHaveLength(2)
    expect(wrapper.text()).toContain('admin.settings.defaults.title')
    expect(wrapper.text()).toContain('admin.settings.authSourceDefaults.title')
    expect(wrapper.findAll('input').length).toBeGreaterThan(20)
  })

  it('keeps default values and source defaults directly bound', async () => {
    const { wrapper, form, authSourceDefaults } = mountPanel()
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('12.5')
    await inputs[1].setValue('8')
    expect(form.default_balance).toBe(12.5)
    expect(form.default_concurrency).toBe(8)

    await wrapper.get('[role="switch"]').trigger('click')
    expect(form.force_email_on_third_party_signup).toBe(true)
    expect(authSourceDefaults.email.grant_on_signup).toBe(true)
  })

  it('forwards default and auth-source subscription events', async () => {
    const { wrapper } = mountPanel()
    const addButtons = wrapper.findAll('button').filter((button) =>
      button.text().includes('admin.settings.defaults.addDefaultSubscription'),
    )
    await addButtons[0].trigger('click')
    await addButtons[1].trigger('click')
    const deleteButtons = wrapper.findAll('button').filter((button) => button.text() === 'common.delete')
    await deleteButtons[0].trigger('click')
    await deleteButtons[1].trigger('click')

    expect(wrapper.emitted('addDefaultSubscription')).toHaveLength(1)
    expect(wrapper.emitted('addAuthSourceDefaultSubscription')).toEqual([['email']])
    expect(wrapper.emitted('removeDefaultSubscription')).toEqual([[0]])
    expect(wrapper.emitted('removeAuthSourceDefaultSubscription')).toEqual([['email', 0]])
  })
})
