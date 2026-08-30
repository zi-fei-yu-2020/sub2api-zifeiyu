import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import UserBalanceModal from '@/components/admin/user/UserBalanceModal.vue'
import type { AdminUser } from '@/types'

vi.mock('@/api/admin', () => ({
  adminAPI: {
    users: {
      updateBalance: vi.fn()
    }
  }
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn()
  })
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key })
  }
})

const user: AdminUser = {
  id: 1,
  username: 'liuyuexue',
  email: 'liuyuexue2020@gmail.com',
  role: 'admin',
  balance: 100000,
  concurrency: 0,
  status: 'active',
  allowed_groups: [],
  created_at: '2026-08-29T00:00:00Z',
  updated_at: '2026-08-29T00:00:00Z',
  notes: ''
}

describe('UserBalanceModal', () => {
  it('reserves a dedicated non-overlapping slot for the currency prefix', () => {
    const wrapper = mount(UserBalanceModal, {
      props: { show: true, user, operation: 'add' },
      global: {
        stubs: {
          BaseDialog: {
            props: ['show', 'title', 'width'],
            template: '<div><slot /><slot name="footer" /></div>'
          }
        }
      }
    })

    const prefix = wrapper.get('[data-testid="balance-currency-prefix"]')
    const input = wrapper.get('[data-testid="balance-amount-input"]')

    expect(prefix.text()).toBe('$')
    expect(prefix.classes()).toContain('pointer-events-none')
    expect(prefix.classes()).toContain('w-10')
    expect(input.classes()).toContain('pl-12')
    expect(input.classes()).toContain('tabular-nums')
    expect(input.classes()).not.toContain('pl-8')
  })
})
