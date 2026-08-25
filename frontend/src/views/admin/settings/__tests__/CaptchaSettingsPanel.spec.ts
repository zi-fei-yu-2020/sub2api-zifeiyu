import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import CaptchaSettingsPanel from '../CaptchaSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

function createForm() {
  return {
    turnstile_site_key: 'site-key',
    turnstile_secret_key: '',
    turnstile_secret_key_configured: true,
    tencent_captcha_region: 'cn',
    tencent_captcha_app_id: '',
    tencent_captcha_app_secret_key: '',
    tencent_captcha_app_secret_key_configured: false,
    tencent_captcha_cloud_secret_id: '',
    tencent_captcha_cloud_secret_id_configured: false,
    tencent_captcha_cloud_secret_key: '',
    tencent_captcha_cloud_secret_key_configured: false,
    aliyun_captcha_region: 'cn',
    aliyun_captcha_prefix: '',
    aliyun_captcha_scene_id: '',
    aliyun_captcha_access_key_id: '',
    aliyun_captcha_access_key_secret: '',
    aliyun_captcha_access_key_secret_configured: false,
  }
}

function mountPanel(overrides: Record<string, unknown> = {}) {
  return mount(CaptchaSettingsPanel, {
    props: {
      form: createForm(),
      masterEnabled: true,
      providerSelection: 'turnstile',
      tencentLinks: {
        console: 'https://console.example/captcha',
        cloudKeys: 'https://console.example/keys',
        webDocs: 'https://docs.example/captcha',
      },
      ...overrides,
    },
  })
}

describe('CaptchaSettingsPanel', () => {
  it('preserves the card, provider selector and Turnstile field layout', () => {
    const wrapper = mountPanel()

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.get('.grid-cols-3').classes()).toEqual(
      expect.arrayContaining(['gap-2', 'rounded-xl', 'bg-slate-100', 'p-1']),
    )
    expect(wrapper.text()).toContain('admin.settings.turnstile.siteKey')
    expect(wrapper.findAll('input')).toHaveLength(2)
  })

  it('forwards the master switch and provider selection events', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[role="switch"]').trigger('click')
    await wrapper.get('[data-testid="captcha-provider-tencent"]').trigger('click')
    await wrapper.get('[data-testid="captcha-provider-aliyun"]').trigger('click')

    expect(wrapper.emitted('update:masterEnabled')).toEqual([[false]])
    expect(wrapper.emitted('selectProvider')).toEqual([['tencent'], ['aliyun']])
  })

  it('keeps Tencent and Aliyun fields, region controls and links equivalent', async () => {
    const form = createForm()
    const wrapper = mountPanel({ form })

    await wrapper.setProps({ providerSelection: 'tencent' })
    expect(wrapper.get('a[href="https://console.example/captcha"]').exists()).toBe(true)
    expect(wrapper.get('a[href="https://console.example/keys"]').exists()).toBe(true)
    expect(wrapper.get('a[href="https://docs.example/captcha"]').exists()).toBe(true)
    await wrapper.get('[data-testid="tencent-captcha-region-intl"]').trigger('click')
    expect(form.tencent_captcha_region).toBe('intl')
    const tencentInputs = wrapper.findAll('input')
    await tencentInputs[0].setValue('123456')
    expect(form.tencent_captcha_app_id).toBe('123456')

    await wrapper.setProps({ providerSelection: 'aliyun' })
    expect(wrapper.text()).toContain('admin.settings.aliyunCaptcha.sceneId')
    const aliyunInputs = wrapper.findAll('input')
    await aliyunInputs[0].setValue('prefix-1')
    await aliyunInputs[1].setValue('scene-1')
    expect(form.aliyun_captcha_prefix).toBe('prefix-1')
    expect(form.aliyun_captcha_scene_id).toBe('scene-1')

    await wrapper.setProps({ masterEnabled: false })
    expect(wrapper.find('[data-testid="captcha-provider-turnstile"]').exists()).toBe(false)
  })
})
