import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import GitHubOAuthSettingsPanel from '../GitHubOAuthSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'zh-CN' } }),
}))

function createForm() {
  return {
    github_oauth_enabled: true,
    github_oauth_client_id: '',
    github_oauth_client_secret: '',
    github_oauth_client_secret_configured: true,
    github_oauth_redirect_url: '',
    github_oauth_frontend_redirect_url: '/auth/oauth/callback',
  }
}

describe('GitHubOAuthSettingsPanel', () => {
  it('preserves the provider card and GitHub guide link', () => {
    const wrapper = mount(GitHubOAuthSettingsPanel, {
      props: { form: createForm(), redirectUrlSuggestion: 'https://suggested/github' },
    })
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['rounded-xl', 'border', 'border-slate-200', 'p-4']),
    )
    const link = wrapper.get('[data-testid="github-oauth-apps-guide-link"]')
    expect(link.attributes('href')).toBe('https://github.com/settings/developers')
    expect(wrapper.findAll('input')).toHaveLength(4)
  })

  it('keeps fields and quick-set event wired', async () => {
    const form = createForm()
    const wrapper = mount(GitHubOAuthSettingsPanel, {
      props: { form, redirectUrlSuggestion: 'https://suggested/github' },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('gh-client')
    await inputs[1].setValue('gh-secret')
    await inputs[2].setValue('https://callback/github')
    await inputs[3].setValue('/auth/github')
    await wrapper.get('button.btn-secondary').trigger('click')
    expect(form.github_oauth_client_id).toBe('gh-client')
    expect(form.github_oauth_client_secret).toBe('gh-secret')
    expect(wrapper.emitted('quickSet')).toHaveLength(1)
  })

  it('hides provider fields when disabled', () => {
    const form = createForm()
    form.github_oauth_enabled = false
    const wrapper = mount(GitHubOAuthSettingsPanel, {
      props: { form, redirectUrlSuggestion: '' },
    })
    expect(wrapper.find('input').exists()).toBe(false)
  })
})
