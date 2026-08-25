import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import DingTalkConnectSettingsPanel from '../DingTalkConnectSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'zh-CN' },
  }),
}))

function createForm() {
  return {
    dingtalk_connect_enabled: true,
    dingtalk_connect_client_id: 'ding-id',
    dingtalk_connect_client_secret: '',
    dingtalk_connect_client_secret_configured: true,
    dingtalk_connect_redirect_url: 'https://callback/dingtalk',
    dingtalk_connect_corp_restriction_policy: 'internal_only',
    dingtalk_connect_bypass_registration: false,
    dingtalk_connect_sync_display_name: true,
    dingtalk_connect_sync_display_name_attr_key: 'ding_name',
    dingtalk_connect_sync_display_name_attr_name: '????',
    dingtalk_connect_sync_corp_email: true,
    dingtalk_connect_sync_corp_email_attr_key: 'ding_email',
    dingtalk_connect_sync_corp_email_attr_name: '????',
    dingtalk_connect_sync_dept: true,
    dingtalk_connect_sync_dept_attr_key: 'ding_dept',
    dingtalk_connect_sync_dept_attr_name: '????',
  }
}

describe('DingTalkConnectSettingsPanel', () => {
  it('preserves the card and internal-only sync sections', () => {
    const wrapper = mount(DingTalkConnectSettingsPanel, { props: { form: createForm() } })
    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.text()).toContain('admin.settings.dingtalk.syncDisplayName')
    expect(wrapper.text()).toContain('admin.settings.dingtalk.syncCorpEmail')
    expect(wrapper.text()).toContain('admin.settings.dingtalk.syncDept')
  })

  it('keeps credentials, policy and sync fields wired', async () => {
    const form = createForm()
    const wrapper = mount(DingTalkConnectSettingsPanel, { props: { form } })
    const inputs = wrapper.findAll('input')
    const clientId = inputs.find((input) => input.attributes('type') === 'text')!
    await clientId.setValue('new-ding-id')
    const unrestrictedPolicy = wrapper.get('input[value="none"]')
    await unrestrictedPolicy.setValue(true)
    expect(form.dingtalk_connect_client_id).toBe('new-ding-id')
    expect(form.dingtalk_connect_corp_restriction_policy).toBe('none')
  })

  it('hides internal sync options outside internal-only mode', async () => {
    const form = createForm()
    form.dingtalk_connect_corp_restriction_policy = 'none'
    const wrapper = mount(DingTalkConnectSettingsPanel, { props: { form } })
    expect(wrapper.text()).not.toContain('admin.settings.dingtalk.syncDept')
    form.dingtalk_connect_enabled = false
    await wrapper.vm.$forceUpdate()
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })
})
