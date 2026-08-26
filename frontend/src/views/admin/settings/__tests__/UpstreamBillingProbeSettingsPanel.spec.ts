import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import UpstreamBillingProbeSettingsPanel from '../UpstreamBillingProbeSettingsPanel.vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
const ToggleStub=defineComponent({props:{modelValue:Boolean},emits:['update:modelValue'],setup(p,{emit,attrs}){return()=>h('input',{...attrs,type:'checkbox',checked:p.modelValue,onChange:(e:Event)=>emit('update:modelValue',(e.target as HTMLInputElement).checked)})}})
function mountPanel(overrides={}){return mount(UpstreamBillingProbeSettingsPanel,{props:{enabled:true,intervalMinutes:30,loading:false,saving:false,...overrides},global:{stubs:{Toggle:ToggleStub}}})}
describe('UpstreamBillingProbeSettingsPanel',()=>{
 it('preserves the card and enabled interval layout',()=>{const w=mountPanel();expect(w.classes()).toContain('card');expect(w.get('[data-testid="upstream-billing-probe-enabled"]').exists()).toBe(true);expect(w.get('[data-testid="upstream-billing-probe-interval"]').attributes('min')).toBe('5');expect(w.get('[data-testid="upstream-billing-probe-save"]').exists()).toBe(true)})
 it('forwards toggle, interval and save events',async()=>{const w=mountPanel();await w.get('[data-testid="upstream-billing-probe-enabled"]').setValue(false);await w.get('[data-testid="upstream-billing-probe-interval"]').setValue('60');await w.get('[data-testid="upstream-billing-probe-save"]').trigger('click');expect(w.emitted('update:enabled')).toEqual([[false]]);expect(w.emitted('update:intervalMinutes')).toEqual([[60]]);expect(w.emitted('save')).toHaveLength(1)})
 it('keeps loading and disabled states',()=>{const loading=mountPanel({loading:true});expect(loading.text()).toContain('common.loading');expect(loading.find('[data-testid="upstream-billing-probe-save"]').exists()).toBe(false);const saving=mountPanel({saving:true});expect(saving.get('[data-testid="upstream-billing-probe-save"]').attributes('disabled')).toBeDefined();expect(saving.text()).toContain('common.saving')})
})
