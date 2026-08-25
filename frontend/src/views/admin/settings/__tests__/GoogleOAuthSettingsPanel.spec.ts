import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import GoogleOAuthSettingsPanel from '../GoogleOAuthSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'zh-CN' } }),
}))

function createForm() {
  return {
    google_oauth_enabled: true,
    google_oauth_client_id: '',
    google_oauth_client_secret: '',
    google_oauth_client_secret_configured: false,
    google_oauth_redirect_url: '',
    google_oauth_frontend_redirect_url: '/auth/oauth/callback',
  }
}

describe('GoogleOAuthSettingsPanel', () => {
  it('preserves the provider card and two-column credentials grid', () => {
    const wrapper = mount(GoogleOAuthSettingsPanel, {
      props: { form: createForm(), redirectUrlSuggestion: 'https://suggested/google' },
    })
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['rounded-xl', 'border', 'border-slate-200', 'p-4']),
    )
    expect(wrapper.get('.lg\\:grid-cols-2').classes()).toContain('gap-4')
    expect(wrapper.findAll('input')).toHaveLength(4)
  })

  it('keeps fields and quick-set event wired', async () => {
    const form = createForm()
    const wrapper = mount(GoogleOAuthSettingsPanel, {
      props: { form, redirectUrlSuggestion: 'https://suggested/google' },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('google-client')
    await inputs[1].setValue('google-secret')
    await inputs[2].setValue('https://callback/google')
    await inputs[3].setValue('/auth/google')
    await wrapper.get('button.btn-secondary').trigger('click')
    expect(form.google_oauth_client_id).toBe('google-client')
    expect(form.google_oauth_client_secret).toBe('google-secret')
    expect(wrapper.emitted('quickSet')).toHaveLength(1)
  })

  it('hides provider fields when disabled', () => {
    const form = createForm()
    form.google_oauth_enabled = false
    const wrapper = mount(GoogleOAuthSettingsPanel, {
      props: { form, redirectUrlSuggestion: '' },
    })
    expect(wrapper.find('input').exists()).toBe(false)
  })
})
