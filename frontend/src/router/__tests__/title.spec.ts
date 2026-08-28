import { describe, expect, it, afterEach } from 'vitest'
import { i18n } from '@/i18n'
import { resolveDocumentTitle, resolveRouteDocumentTitle } from '@/router/title'

afterEach(() => {
  i18n.global.locale.value = 'en'
})

describe('resolveDocumentTitle', () => {
  it('路由存在标题时，使用“路由标题 - 站点名”格式', () => {
    expect(resolveDocumentTitle('Usage Records', 'My Site')).toBe('Usage Records - My Site')
  })

  it('路由无标题时，回退到站点名', () => {
    expect(resolveDocumentTitle(undefined, 'My Site')).toBe('My Site')
  })

  it('站点名为空时，回退默认站点名', () => {
    expect(resolveDocumentTitle('Dashboard', '')).toBe('Dashboard - Sub2API')
    expect(resolveDocumentTitle(undefined, '   ')).toBe('Sub2API')
  })

  it('站点名变更时仅影响后续路由标题计算', () => {
    const before = resolveDocumentTitle('Admin Dashboard', 'Alpha')
    const after = resolveDocumentTitle('Admin Dashboard', 'Beta')

    expect(before).toBe('Admin Dashboard - Alpha')
    expect(after).toBe('Admin Dashboard - Beta')
  })

  it('优先使用 titleKey 翻译，并在缺失时回退静态标题', () => {
    i18n.global.setLocaleMessage('zh', { keyUsage: { title: () => 'API Key 用量查询' } })
    i18n.global.locale.value = 'zh'
    expect(resolveDocumentTitle('Key Usage', 'My Site', 'keyUsage.title')).toBe('API Key 用量查询 - My Site')
    expect(resolveDocumentTitle('Fallback Title', 'My Site', 'missing.title')).toBe('Fallback Title - My Site')
  })
})

describe('resolveRouteDocumentTitle', () => {
  it('自定义页面菜单加载后，使用菜单名称作为标题', () => {
    const route = {
      name: 'CustomPage',
      params: { id: 'scheduler' },
      meta: {
        title: 'Custom Page'
      }
    }

    expect(resolveRouteDocumentTitle(route, 'EzouAPI')).toBe('Custom Page - EzouAPI')
    expect(resolveRouteDocumentTitle(route, 'EzouAPI', [
      {
        id: 'scheduler',
        label: '账号调度器',
        icon_svg: '',
        url: 'https://example.com',
        visibility: 'admin',
        sort_order: 0
      }
    ])).toBe('账号调度器 - EzouAPI')
  })
})
