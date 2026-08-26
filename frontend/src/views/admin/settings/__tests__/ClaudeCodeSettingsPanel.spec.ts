import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ClaudeCodeSettingsPanel from '../ClaudeCodeSettingsPanel.vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
describe('ClaudeCodeSettingsPanel', () => {
  it('preserves the card, field order and styling', () => {
    const form = reactive({ min_claude_code_version: '1.2.3', max_claude_code_version: '2.0.0' })
    const wrapper = mount(ClaudeCodeSettingsPanel, { props: { form } })
    expect(wrapper.classes()).toContain('card')
    expect(wrapper.findAll('input')).toHaveLength(2)
    expect(wrapper.findAll('input')[0].classes()).toEqual(expect.arrayContaining(['input', 'max-w-xs', 'font-mono', 'text-sm']))
    expect(wrapper.text()).toContain('admin.settings.claudeCode.minVersion')
    expect(wrapper.text()).toContain('admin.settings.claudeCode.maxVersion')
  })
  it('keeps minimum and maximum versions directly bound', async () => {
    const form = reactive({ min_claude_code_version: '', max_claude_code_version: '' })
    const wrapper = mount(ClaudeCodeSettingsPanel, { props: { form } })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('1.8.0')
    await inputs[1].setValue('2.4.0')
    expect(form.min_claude_code_version).toBe('1.8.0')
    expect(form.max_claude_code_version).toBe('2.4.0')
  })
})
