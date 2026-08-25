import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import AdminApiKeySettingsPanel from '../AdminApiKeySettingsPanel.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

function mountPanel(props: Partial<{
  loading: boolean
  exists: boolean
  maskedKey: string
  operating: boolean
  newKey: string
}> = {}) {
  return mount(AdminApiKeySettingsPanel, {
    props: {
      loading: false,
      exists: false,
      maskedKey: '',
      operating: false,
      newKey: '',
      ...props,
    },
    global: { stubs: { Icon: true } },
  })
}

describe('AdminApiKeySettingsPanel', () => {
  it('preserves the existing card and loading-state layout classes', () => {
    const wrapper = mountPanel({ loading: true })

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.get('.border-b').classes()).toEqual(
      expect.arrayContaining(['border-slate-100', 'px-6', 'py-4', 'dark:border-slate-800']),
    )
    expect(wrapper.get('.animate-spin').classes()).toEqual(
      expect.arrayContaining(['h-4', 'w-4', 'rounded-full', 'border-b-2', 'border-primary-600']),
    )
  })

  it('emits create from the unconfigured state', async () => {
    const wrapper = mountPanel()
    const button = wrapper.get('button')

    expect(button.text()).toContain('admin.settings.adminApiKey.create')
    await button.trigger('click')
    expect(wrapper.emitted('create')).toHaveLength(1)
  })

  it('renders the masked and newly generated keys and forwards all actions', async () => {
    const wrapper = mountPanel({
      exists: true,
      maskedKey: 'sk-admin-****1234',
      newKey: 'sk-admin-secret',
    })

    expect(wrapper.text()).toContain('sk-admin-****1234')
    expect(wrapper.text()).toContain('sk-admin-secret')

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('regenerate')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('copy')).toHaveLength(1)
  })

  it('keeps action buttons disabled while an operation is running', () => {
    const wrapper = mountPanel({ exists: true, operating: true })
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(buttons[0].text()).toContain('admin.settings.adminApiKey.regenerating')
  })
})
