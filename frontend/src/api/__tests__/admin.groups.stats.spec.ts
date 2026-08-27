import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/api/client', () => ({
  apiClient: { get }
}))

import { getStats } from '@/api/admin/groups'

describe('admin group detail stats API', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('returns all cumulative group detail fields', async () => {
    const stats = {
      total_api_keys: 8,
      active_api_keys: 6,
      total_requests: 1517,
      total_tokens: 175150000,
      total_cost: 12730.5,
      total_actual_cost: 11002.25
    }
    get.mockResolvedValue({ data: stats })

    await expect(getStats(42)).resolves.toEqual(stats)
    expect(get).toHaveBeenCalledWith('/admin/groups/42/stats')
  })
})
