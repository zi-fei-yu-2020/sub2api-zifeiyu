import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string): string {
  return readFileSync(resolve(path), 'utf8')
}

describe('admin platform filters', () => {
  it('uses the group platform catalog on the subscriptions page', () => {
    const source = readSource('src/views/admin/SubscriptionsView.vue')
    expect(source).toContain("import { GROUP_PLATFORM_OPTIONS } from '@/constants/platforms'")
    expect(source).toMatch(/const platformFilterOptions[\s\S]*?\.\.\.GROUP_PLATFORM_OPTIONS/)
  })

  it('uses the shared catalogs across the groups page and extracted composite routes modal', () => {
    const groupsSource = readSource('src/views/admin/GroupsView.vue')
    const compositeSource = readSource('src/components/admin/group/CompositeRoutesModal.vue')
    expect(groupsSource).toContain('...GROUP_PLATFORM_OPTIONS')
    expect(compositeSource).toContain('CONCRETE_PLATFORM_OPTIONS')
    expect(compositeSource).toMatch(/compositeRoutePlatformOptions[\s\S]*?CONCRETE_PLATFORM_OPTIONS/)
  })

  it('uses the concrete platform catalog wherever concrete platforms are selected', () => {
    for (const path of [
      'src/components/admin/account/AccountTableFilters.vue',
      'src/components/admin/ErrorPassthroughRulesModal.vue',
      'src/views/admin/ops/components/OpsDashboardHeader.vue'
    ]) {
      const source = readSource(path)
      expect(source).toContain("import { CONCRETE_PLATFORM_OPTIONS } from '@/constants/platforms'")
      expect(source).toMatch(/platformOptions\s*=.*CONCRETE_PLATFORM_OPTIONS|pOpts.*\.\.\.CONCRETE_PLATFORM_OPTIONS/s)
    }
  })
})
