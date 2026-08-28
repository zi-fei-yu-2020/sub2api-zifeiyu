import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const componentSource = readFileSync(resolve('src/components/common/VersionBadge.vue'), 'utf8')
const zhSource = readFileSync(resolve('src/i18n/locales/zh/misc.ts'), 'utf8')
const enSource = readFileSync(resolve('src/i18n/locales/en/misc.ts'), 'utf8')

describe('VersionBadge custom build update safety', () => {
  it('treats custom builds separately from upstream release builds', () => {
    expect(componentSource).toContain(
      "const isCustomBuild = computed(() => buildType.value === 'custom')"
    )
    expect(componentSource).toContain('hasUpdate && !isReleaseBuild')
    expect(componentSource).toContain('hasUpdate && isReleaseBuild')
  })

  it('shows rebuild guidance instead of the upstream binary update action', () => {
    expect(componentSource).toContain("t('version.upstreamUpdateAvailable')")
    expect(componentSource).toContain("t('version.customModeHint')")
    expect(componentSource).toContain("t('version.rollbackCustomHint')")
    expect(zhSource).toContain('upstreamUpdateAvailable')
    expect(zhSource).toContain('customModeHint')
    expect(enSource).toContain('upstreamUpdateAvailable')
    expect(enSource).toContain('customModeHint')
  })
})
