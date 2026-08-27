import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import EndpointDistributionChart from '../EndpointDistributionChart.vue'
import enDashboard from '@/i18n/locales/en/dashboard'
import zhDashboard from '@/i18n/locales/zh/dashboard'

const messages: Record<string, string> = {
  'usage.endpointDistribution': 'Endpoint Distribution',
  'usage.endpoint': 'Endpoint',
  'usage.historicalUnknown': 'Historical Unknown',
  'admin.dashboard.requests': 'Requests',
  'admin.dashboard.tokens': 'Tokens',
  'admin.dashboard.actual': 'Actual',
  'admin.dashboard.standard': 'Standard',
  'admin.dashboard.noDataAvailable': 'No data available',
}

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => messages[key] ?? key,
    }),
  }
})

vi.mock('vue-chartjs', () => ({
  Doughnut: {
    props: ['data'],
    template: '<div class="chart-data">{{ JSON.stringify(data) }}</div>',
  },
}))

const stat = (endpoint: string, totalTokens: number) => ({
  endpoint,
  requests: 1,
  total_tokens: totalTokens,
  cost: 1,
  actual_cost: 1,
})

describe('EndpointDistributionChart', () => {
  it('labels the unknown storage sentinel as historical data without changing real endpoints', () => {
    const endpointStats = [stat('unknown', 200), stat('/v1/responses', 100)]
    const wrapper = mount(EndpointDistributionChart, {
      props: { endpointStats, enableBreakdown: false },
      global: { stubs: { LoadingSpinner: true, UserBreakdownSubTable: true } },
    })

    const chartData = JSON.parse(wrapper.get('.chart-data').text())
    expect(chartData.labels).toEqual(['Historical Unknown', '/v1/responses'])
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('Historical Unknown')
    expect(wrapper.findAll('tbody tr')[0].get('td').attributes('title')).toBe('Historical Unknown')
    expect(wrapper.findAll('tbody tr')[1].text()).toContain('/v1/responses')
    expect(endpointStats[0].endpoint).toBe('unknown')
  })

  it('labels unknown segments in endpoint paths while preserving the real path segment', () => {
    const wrapper = mount(EndpointDistributionChart, {
      props: {
        endpointStats: [],
        endpointPathStats: [stat('unknown -> /v1/responses', 100)],
        source: 'path',
        enableBreakdown: false,
      },
      global: { stubs: { LoadingSpinner: true, UserBreakdownSubTable: true } },
    })

    const chartData = JSON.parse(wrapper.get('.chart-data').text())
    expect(chartData.labels).toEqual(['Historical Unknown -> /v1/responses'])
    expect(wrapper.find('tbody tr').text()).toContain('Historical Unknown -> /v1/responses')
  })

  it('ships matching localized labels', () => {
    expect(zhDashboard.usage.historicalUnknown).toBe('\u5386\u53f2\u672a\u77e5')
    expect(enDashboard.usage.historicalUnknown).toBe('Historical Unknown')
  })
})
