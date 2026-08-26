import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import CodexSettingsPanel from '../CodexSettingsPanel.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function mountPanel() {
  const form = reactive({
    min_codex_version: '1.0.0',
    max_codex_version: '2.0.0',
    codex_cli_only_allow_app_server_clients: false,
  })
  const fingerprintRows = reactive([{ type: 'header_prefix' as const, match: 'x-codex-', required: true }])
  const blacklistRows = reactive([{ originator: 'bad-client', uaContains: 'curl' }])
  const whitelistRows = reactive([{ originator: 'trusted', uaContains: 'codex', skipEngineFingerprint: false }])
  const wrapper = mount(CodexSettingsPanel, {
    props: { form, fingerprintRows, fingerprintNoRequired: false, blacklistRows, whitelistRows },
  })
  return { wrapper, form, fingerprintRows, blacklistRows, whitelistRows }
}

describe('CodexSettingsPanel', () => {
  it('preserves the card, rule sections and core controls', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.classes()).toContain('card')
    expect(wrapper.findAll('select')).toHaveLength(1)
    expect(wrapper.findAll('input')).toHaveLength(9)
    expect(wrapper.findAll('button')).toHaveLength(7)
    expect(wrapper.text()).toContain('admin.settings.gatewayForwarding.codexFingerprintSignals')
    expect(wrapper.text()).toContain('admin.settings.gatewayForwarding.codexBlacklist')
    expect(wrapper.text()).toContain('admin.settings.gatewayForwarding.codexWhitelist')
  })

  it('keeps version, fingerprint and whitelist fields directly bound', async () => {
    const { wrapper, form, fingerprintRows, whitelistRows } = mountPanel()
    const textInputs = wrapper.findAll('input[type="text"]')
    await textInputs[0].setValue('1.5.0')
    await textInputs[1].setValue('2.5.0')
    await textInputs[2].setValue('x-codex-session')
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)
    expect(form.min_codex_version).toBe('1.5.0')
    expect(form.max_codex_version).toBe('2.5.0')
    expect(fingerprintRows[0].match).toBe('x-codex-session')
    expect(whitelistRows[0].skipEngineFingerprint).toBe(true)
  })

  it('forwards all row add and remove events', async () => {
    const { wrapper } = mountPanel()
    const removeButtons = wrapper.findAll('button').filter((button) =>
      button.text().includes('admin.settings.gatewayForwarding.codexRemoveRow'),
    )
    const addButtons = wrapper.findAll('button').filter((button) =>
      button.text().includes('admin.settings.gatewayForwarding.codexAddRow'),
    )
    await removeButtons[0].trigger('click')
    await addButtons[0].trigger('click')
    await removeButtons[1].trigger('click')
    await addButtons[1].trigger('click')
    await removeButtons[2].trigger('click')
    await addButtons[2].trigger('click')
    expect(wrapper.emitted('removeFingerprintRow')).toEqual([[0]])
    expect(wrapper.emitted('addFingerprintRow')).toHaveLength(1)
    expect(wrapper.emitted('removeBlacklistRow')).toEqual([[0]])
    expect(wrapper.emitted('addBlacklistRow')).toHaveLength(1)
    expect(wrapper.emitted('removeWhitelistRow')).toEqual([[0]])
    expect(wrapper.emitted('addWhitelistRow')).toHaveLength(1)
  })
})
