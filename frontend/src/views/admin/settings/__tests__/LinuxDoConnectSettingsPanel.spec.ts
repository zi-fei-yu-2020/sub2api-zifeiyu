import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import LinuxDoConnectSettingsPanel from '../LinuxDoConnectSettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

function createForm() {
  return {
    linuxdo_connect_enabled: true,
    linuxdo_connect_client_id: 'client-id',
    linuxdo_connect_client_secret: '',
    linuxdo_connect_client_secret_configured: true,
    linuxdo_connect_redirect_url: 'https://example.com/linuxdo',
  }
}

describe('LinuxDoConnectSettingsPanel', () => {
  it('preserves the card and credential layout', () => {
    const wrapper = mount(LinuxDoConnectSettingsPanel, {
      props: { form: createForm(), redirectUrlSuggestion: 'https://suggested/linuxdo' },
    })
    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.findAll('input')).toHaveLength(3)
    expect(wrapper.text()).toContain('admin.settings.linuxdo.clientSecretConfiguredHint')
  })

  it('keeps field editing and quick-set event behavior', async () => {
    const form = createForm()
    const wrapper = mount(LinuxDoConnectSettingsPanel, {
      props: { form, redirectUrlSuggestion: 'https://suggested/linuxdo' },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('new-client')
    await inputs[1].setValue('new-secret')
    await inputs[2].setValue('https://new/linuxdo')
    await wrapper.get('button.btn-secondary').trigger('click')

    expect(form).toMatchObject({
      linuxdo_connect_client_id: 'new-client',
      linuxdo_connect_client_secret: 'new-secret',
      linuxdo_connect_redirect_url: 'https://new/linuxdo',
    })
    expect(wrapper.emitted('quickSet')).toHaveLength(1)
  })

  it('keeps credential fields conditional on the enable switch', async () => {
    const form = createForm()
    form.linuxdo_connect_enabled = false
    const wrapper = mount(LinuxDoConnectSettingsPanel, {
      props: { form, redirectUrlSuggestion: '' },
    })
    expect(wrapper.find('input').exists()).toBe(false)
    await wrapper.get('[role="switch"]').trigger('click')
    expect(form.linuxdo_connect_enabled).toBe(true)
  })
})
