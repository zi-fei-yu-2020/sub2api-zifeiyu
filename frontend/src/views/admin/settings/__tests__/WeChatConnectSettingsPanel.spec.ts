import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import WeChatConnectSettingsPanel from '../WeChatConnectSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'zh-CN' },
  }),
}))

function createForm() {
  return {
    wechat_connect_enabled: true,
    wechat_connect_open_enabled: true,
    wechat_connect_open_app_id: 'open-id',
    wechat_connect_open_app_secret: '',
    wechat_connect_open_app_secret_configured: true,
    wechat_connect_mp_enabled: true,
    wechat_connect_mp_app_id: 'mp-id',
    wechat_connect_mp_app_secret: '',
    wechat_connect_mp_app_secret_configured: true,
    wechat_connect_mobile_enabled: false,
    wechat_connect_mobile_app_id: '',
    wechat_connect_mobile_app_secret: '',
    wechat_connect_mobile_app_secret_configured: false,
    wechat_connect_redirect_url: 'https://callback/wechat',
    wechat_connect_frontend_redirect_url: '/auth/wechat/callback',
  }
}

describe('WeChatConnectSettingsPanel', () => {
  it('preserves the card and three capability sections', () => {
    const wrapper = mount(WeChatConnectSettingsPanel, {
      props: { form: createForm(), redirectUrlSuggestion: 'https://suggested/wechat' },
    })
    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.find('[data-testid="wechat-connect-open-app-id"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wechat-connect-mp-app-id"]').exists()).toBe(true)
    expect(wrapper.find('.border-amber-200').exists()).toBe(true)
  })

  it('forwards capability and quick-set events', async () => {
    const wrapper = mount(WeChatConnectSettingsPanel, {
      props: { form: createForm(), redirectUrlSuggestion: 'https://suggested/wechat' },
    })
    await wrapper.get('[data-testid="wechat-connect-open-enabled"]').trigger('click')
    await wrapper.get('[data-testid="wechat-connect-mp-enabled"]').trigger('click')
    await wrapper.get('[data-testid="wechat-connect-mobile-enabled"]').trigger('click')
    await wrapper.get('button.btn-secondary').trigger('click')
    expect(wrapper.emitted('openEnabledChange')).toEqual([[false]])
    expect(wrapper.emitted('mpEnabledChange')).toEqual([[false]])
    expect(wrapper.emitted('mobileEnabledChange')).toEqual([[true]])
    expect(wrapper.emitted('quickSet')).toHaveLength(1)
  })

  it('keeps field editing on the shared settings form', async () => {
    const form = createForm()
    const wrapper = mount(WeChatConnectSettingsPanel, {
      props: { form, redirectUrlSuggestion: '' },
    })
    await wrapper.get('[data-testid="wechat-connect-open-app-id"]').setValue('new-open-id')
    await wrapper.get('[data-testid="wechat-connect-redirect-url"]').setValue('https://new/wechat')
    await wrapper.get('[data-testid="wechat-connect-frontend-redirect-url"]').setValue('/new/wechat')
    expect(form.wechat_connect_open_app_id).toBe('new-open-id')
    expect(form.wechat_connect_redirect_url).toBe('https://new/wechat')
    expect(form.wechat_connect_frontend_redirect_url).toBe('/new/wechat')
  })
})
