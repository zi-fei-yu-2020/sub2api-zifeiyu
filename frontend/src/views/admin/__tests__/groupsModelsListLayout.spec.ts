import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const groupsViewSource = readFileSync(resolve(currentDir, '../GroupsView.vue'), 'utf8')

describe('groups models list layout', () => {
  it('keeps the selection toolbar outside of the scrolling list content', () => {
    const containerIndex = groupsViewSource.indexOf(
      'overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50'
    )
    const toolbarIndex = groupsViewSource.indexOf('modelsList.selectedSummary', containerIndex)
    const scrollingListIndex = groupsViewSource.indexOf(
      'max-h-64 space-y-2 overflow-y-auto p-2',
      toolbarIndex
    )

    expect(containerIndex).toBeGreaterThanOrEqual(0)
    expect(toolbarIndex).toBeGreaterThan(containerIndex)
    expect(scrollingListIndex).toBeGreaterThan(toolbarIndex)
    expect(groupsViewSource.slice(containerIndex, scrollingListIndex)).not.toContain('sticky top-0')
  })
})
