import { describe, expect, it } from 'vitest'

import dashboardAPI from '@/api/admin/dashboard'
import proxiesAPI from '@/api/admin/proxies'

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

describe('removed admin placeholder endpoints', () => {
  it('does not export the obsolete dashboard realtime metrics client', () => {
    expect(hasOwn(dashboardAPI, 'getRealtimeMetrics')).toBe(false)
  })

  it('does not export proxy statistics without a reliable request data source', () => {
    expect(hasOwn(proxiesAPI, 'getStats')).toBe(false)
  })
})
