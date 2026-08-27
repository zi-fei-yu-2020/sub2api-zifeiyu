import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import enCommon from '@/i18n/locales/en/common'
import zhCommon from '@/i18n/locales/zh/common'
import enAdmin from '@/i18n/locales/en/admin/resources'
import zhAdmin from '@/i18n/locales/zh/admin/resources'

const here = dirname(fileURLToPath(import.meta.url))
const sidebarSource = readFileSync(resolve(here, '../AppSidebar.vue'), 'utf8')
const routerSource = readFileSync(resolve(here, '../../../router/index.ts'), 'utf8')

describe('admin overview navigation distinctions', () => {
  it('uses a system-wide name for admin usage while keeping personal usage unchanged', () => {
    expect(zhCommon.nav.usage).toBe('\u4f7f\u7528\u8bb0\u5f55')
    expect(zhCommon.nav.adminUsage).toBe('\u7cfb\u7edf\u4f7f\u7528\u8bb0\u5f55')
    expect(enCommon.nav.usage).toBe('Usage')
    expect(enCommon.nav.adminUsage).toBe('System Usage Records')
    expect(zhAdmin.usage.title).toBe('\u7cfb\u7edf\u4f7f\u7528\u8bb0\u5f55')
    expect(enAdmin.usage.title).toBe('System Usage Records')
    expect(sidebarSource).toContain("path: '/admin/usage', label: t('nav.adminUsage')")
    expect(routerSource).toContain("title: 'System Usage Records'")
  })

  it('uses a dedicated terminal-style icon for ops monitoring', () => {
    expect(sidebarSource).toContain('const OpsIcon = {')
    expect(sidebarSource).toContain("path: '/admin/ops', label: t('nav.ops'), icon: OpsIcon")
    expect(sidebarSource).not.toContain("path: '/admin/ops', label: t('nav.ops'), icon: ChartIcon")
  })
})
