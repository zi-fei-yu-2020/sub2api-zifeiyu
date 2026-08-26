import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import RegistrationSecuritySettingsPanel from '../RegistrationSecuritySettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

function createForm(overrides: Record<string, unknown> = {}) {
  return {
    registration_enabled: true,
    email_verify_enabled: true,
    registration_email_domain_quota_enabled: false,
    promo_code_enabled: true,
    invitation_code_enabled: false,
    password_reset_enabled: true,
    frontend_url: 'https://panel.example.com',
    totp_enabled: false,
    totp_encryption_key_configured: true,
    passkey_enabled: true,
    passkey_configured: true,
    passkey_rp_id: 'panel.example.com',
    passkey_rp_origins: ['https://panel.example.com'],
    step_up_enabled: true,
    session_binding_enabled: false,
    audit_log_retention_days: 180,
    ...overrides,
  }
}

function mountPanel(options: {
  form?: Record<string, unknown>
  tags?: string[]
  draft?: string
} = {}) {
  const form = reactive(createForm(options.form))
  const tags = ref(options.tags ?? ['example.com'])
  const draft = ref(options.draft ?? '')

  const Host = defineComponent({
    setup() {
      return () =>
        h(RegistrationSecuritySettingsPanel, {
          form: form as never,
          emailSuffixTags: tags.value,
          emailSuffixDraft: draft.value,
          'onUpdate:emailSuffixTags': (value: string[]) => {
            tags.value = value
          },
          'onUpdate:emailSuffixDraft': (value: string) => {
            draft.value = value
          },
        })
    },
  })

  const wrapper = mount(Host, {
    global: { stubs: { Icon: true } },
  })

  return {
    wrapper,
    panel: () => wrapper.findComponent(RegistrationSecuritySettingsPanel),
    form,
    tags,
    draft,
  }
}

function findToggleRow(panel: ReturnType<ReturnType<typeof mountPanel>['panel']>, text: string) {
  return panel
    .findAll('.flex.items-center.justify-between')
    .find((row) => row.text().includes(text))
}

describe('RegistrationSecuritySettingsPanel', () => {
  it('preserves the registration card structure and all configured controls', () => {
    const { panel } = mountPanel()
    const component = panel()

    expect(component.classes()).toContain('card')
    expect(component.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(component.findAll('[role="switch"]')).toHaveLength(10)
    expect(component.findAll('input')).toHaveLength(3)
    expect(component.get('[data-testid="passkey-settings"]').exists()).toBe(true)
    expect(component.get('[data-testid="passkey-config-status"]').text()).toContain(
      'admin.settings.security.passkeyConfigured',
    )
  })

  it('keeps email verification and password reset conditional fields wired', async () => {
    const { panel, form } = mountPanel({
      form: { email_verify_enabled: false, password_reset_enabled: false },
    })
    const component = panel()

    expect(component.find('input[type="url"]').exists()).toBe(false)
    expect(component.findAll('[role="switch"]')).toHaveLength(9)

    const emailRow = findToggleRow(component, 'admin.settings.registration.emailVerification')
    expect(emailRow).toBeDefined()
    await emailRow!.get('[role="switch"]').trigger('click')
    await nextTick()

    expect(form.email_verify_enabled).toBe(true)
    expect(component.findAll('[role="switch"]')).toHaveLength(10)

    const resetRow = findToggleRow(component, 'admin.settings.registration.passwordReset')
    expect(resetRow).toBeDefined()
    await resetRow!.get('[role="switch"]').trigger('click')
    await nextTick()

    expect(form.password_reset_enabled).toBe(true)
    expect(component.get('input[type="url"]').exists()).toBe(true)
  })

  it('normalizes, deduplicates, pastes and removes email suffix tags', async () => {
    const { panel, tags, draft } = mountPanel({ tags: [] })
    const component = panel()
    const input = component.get('input.font-mono')

    await input.setValue('@Example.COM')
    await nextTick()
    expect(draft.value).toBe('example.com')

    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(tags.value).toEqual(['example.com'])
    expect(draft.value).toBe('')

    await input.trigger('paste', {
      clipboardData: { getData: () => '*.Corp.Example, example.com, foo.test' },
    })
    await nextTick()
    expect(tags.value).toEqual(['example.com', '*.corp.example', 'foo.test'])

    const firstTag = component.findAll('span.inline-flex')[0]
    await firstTag.get('button').trigger('click')
    await nextTick()
    expect(tags.value).toEqual(['*.corp.example', 'foo.test'])

    await input.trigger('keydown', { key: 'Backspace' })
    await nextTick()
    expect(tags.value).toEqual(['*.corp.example'])
  })

  it('preserves TOTP, passkey and audit retention constraints', async () => {
    const { panel, form } = mountPanel({
      form: {
        totp_encryption_key_configured: false,
        passkey_configured: false,
        passkey_enabled: false,
      },
    })
    const component = panel()

    const totpRow = findToggleRow(component, 'admin.settings.registration.totp')
    expect(totpRow).toBeDefined()
    expect(totpRow!.get('[role="switch"]').attributes('disabled')).toBeDefined()
    expect(component.get('[data-testid="passkey-toggle"]').attributes('disabled')).toBeDefined()
    expect(component.get('[data-testid="passkey-config-status"]').text()).toContain(
      'admin.settings.security.passkeyNotConfigured',
    )

    const auditInput = component.get('input[type="number"]')
    await auditInput.setValue('45')
    expect(form.audit_log_retention_days).toBe(45)
  })
})
