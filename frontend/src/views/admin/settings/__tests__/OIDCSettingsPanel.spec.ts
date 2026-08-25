import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import OIDCSettingsPanel from '../OIDCSettingsPanel.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function createForm() {
  return {
    oidc_connect_enabled: true,
    oidc_connect_provider_name: 'OIDC',
    oidc_connect_client_id: 'client-id',
    oidc_connect_client_secret: '',
    oidc_connect_client_secret_configured: true,
    oidc_connect_issuer_url: 'https://issuer',
    oidc_connect_discovery_url: '',
    oidc_connect_authorize_url: '',
    oidc_connect_token_url: '',
    oidc_connect_userinfo_url: '',
    oidc_connect_jwks_url: '',
    oidc_connect_scopes: 'openid email profile',
    oidc_connect_redirect_url: 'https://callback/oidc',
    oidc_connect_frontend_redirect_url: '/auth/oidc/callback',
    oidc_connect_token_auth_method: 'client_secret_post',
    oidc_connect_clock_skew_seconds: 120,
    oidc_connect_allowed_signing_algs: 'RS256',
    oidc_connect_use_pkce: false,
    oidc_connect_validate_id_token: false,
    oidc_connect_require_email_verified: false,
    oidc_connect_userinfo_email_path: '',
    oidc_connect_userinfo_id_path: '',
    oidc_connect_userinfo_username_path: '',
  }
}

describe('OIDCSettingsPanel', () => {
  it('preserves the card, grids and compatibility toggles', () => {
    const wrapper = mount(OIDCSettingsPanel, {
      props: { form: createForm(), redirectUrlSuggestion: 'https://suggested/oidc' },
    })
    expect(wrapper.classes()).toContain('card')
    expect(wrapper.find('[data-testid="oidc-connect-use-pkce"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="oidc-connect-validate-id-token"]').exists()).toBe(true)
    expect(wrapper.findAll('input').length).toBeGreaterThan(10)
  })

  it('keeps compatibility flags, fields and quick-set event wired', async () => {
    const form = createForm()
    const wrapper = mount(OIDCSettingsPanel, {
      props: { form, redirectUrlSuggestion: 'https://suggested/oidc' },
    })
    await wrapper.get('[data-testid="oidc-connect-use-pkce"]').trigger('click')
    await wrapper.get('[data-testid="oidc-connect-validate-id-token"]').trigger('click')
    const providerInput = wrapper.findAll('input').find((input) => input.attributes('type') === 'text')!
    await providerInput.setValue('Corporate SSO')
    await wrapper.get('button.btn-secondary').trigger('click')
    expect(form.oidc_connect_use_pkce).toBe(true)
    expect(form.oidc_connect_validate_id_token).toBe(true)
    expect(form.oidc_connect_provider_name).toBe('Corporate SSO')
    expect(wrapper.emitted('quickSet')).toHaveLength(1)
  })

  it('hides provider fields when disabled', async () => {
    const form = createForm()
    form.oidc_connect_enabled = false
    const wrapper = mount(OIDCSettingsPanel, { props: { form, redirectUrlSuggestion: '' } })
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
    await wrapper.get('[role="switch"]').trigger('click')
    expect(form.oidc_connect_enabled).toBe(true)
  })
})
