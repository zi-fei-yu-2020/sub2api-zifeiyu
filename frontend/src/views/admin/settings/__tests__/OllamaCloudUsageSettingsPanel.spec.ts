import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import OllamaCloudUsageSettingsPanel from '../OllamaCloudUsageSettingsPanel.vue'
vi.mock('vue-i18n',()=>({useI18n:()=>({t:(key:string)=>key})}))
const Toggle=defineComponent({props:{modelValue:Boolean},emits:['update:modelValue'],setup(p,{emit,attrs}){return()=>h('input',{...attrs,type:'checkbox',checked:p.modelValue,onChange:(e:Event)=>emit('update:modelValue',(e.target as HTMLInputElement).checked)})}})
function mountPanel(overrides={}){return mount(OllamaCloudUsageSettingsPanel,{props:{enabled:true,debounceMinutes:1,intervalMinutes:60,loading:false,saving:false,...overrides},global:{stubs:{Toggle}}})}
describe('OllamaCloudUsageSettingsPanel',()=>{
 it('preserves enabled fields and ranges',()=>{const w=mountPanel();expect(w.classes()).toContain('card');expect(w.get('[data-testid="ollama-cloud-usage-global-debounce"]').attributes()).toMatchObject({min:'1',max:'60'});expect(w.get('[data-testid="ollama-cloud-usage-global-interval"]').attributes()).toMatchObject({min:'15',max:'1440'})})
 it('forwards all models and save',async()=>{const w=mountPanel();await w.get('[data-testid="ollama-cloud-usage-global-enabled"]').setValue(false);await w.get('[data-testid="ollama-cloud-usage-global-debounce"]').setValue('5');await w.get('[data-testid="ollama-cloud-usage-global-interval"]').setValue('120');await w.get('[data-testid="ollama-cloud-usage-global-save"]').trigger('click');expect(w.emitted('update:enabled')).toEqual([[false]]);expect(w.emitted('update:debounceMinutes')).toEqual([[5]]);expect(w.emitted('update:intervalMinutes')).toEqual([[120]]);expect(w.emitted('save')).toHaveLength(1)})
 it('preserves loading and saving states',()=>{expect(mountPanel({loading:true}).text()).toContain('common.loading');const w=mountPanel({saving:true});expect(w.get('[data-testid="ollama-cloud-usage-global-save"]').attributes('disabled')).toBeDefined();expect(w.text()).toContain('common.saving')})
})
