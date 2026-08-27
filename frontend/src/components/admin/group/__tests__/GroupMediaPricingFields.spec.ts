import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GroupMediaPricingFields from '../GroupMediaPricingFields.vue'
import { createVideoModelPricesForm } from '@/views/admin/groupsVideoModelPricing'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const createForm = (platform = 'grok') => ({
  platform,
  allow_image_generation: false,
  image_rate_independent: false,
  image_rate_multiplier: 1,
  image_price_1k: null,
  image_price_2k: null,
  image_price_4k: null,
  allow_batch_image_generation: false,
  batch_image_discount_multiplier: 0.5,
  batch_image_hold_multiplier: 0.6,
  video_rate_independent: false,
  video_rate_multiplier: 1,
  video_price_480p: null,
  video_price_720p: null,
  video_price_1080p: null,
  video_model_prices: createVideoModelPricesForm()
})

describe('GroupMediaPricingFields', () => {
  it('keeps image and video fields bound to the parent-owned form object', async () => {
    const form = createForm()
    const wrapper = mount(GroupMediaPricingFields, {
      props: {
        modelValue: form,
        imageFinalPricePreview: [{ label: '1K', value: '$0.01' }],
        videoFinalPricePreview: [{ label: '480p', value: '$0.02' }]
      }
    })

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)

    expect(form.allow_image_generation).toBe(true)
    expect(form.image_rate_independent).toBe(true)
    expect(wrapper.text()).toContain('$0.01')
    expect(wrapper.text()).toContain('$0.02')
  })

  it('preserves platform capability visibility', () => {
    const wrapper = mount(GroupMediaPricingFields, {
      props: {
        modelValue: createForm('anthropic'),
        imageFinalPricePreview: [],
        videoFinalPricePreview: []
      }
    })

    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
  })
})
