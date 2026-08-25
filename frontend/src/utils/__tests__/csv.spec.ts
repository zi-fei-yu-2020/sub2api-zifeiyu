import { describe, expect, it } from 'vitest'
import { escapeCsvCell, serializeCsvRow } from '@/utils/csv'

describe('CSV export helpers', () => {
  it('quotes commas, quotes, and line breaks', () => {
    expect(serializeCsvRow(['a,b', 'say "hi"', 'line\nbreak'])).toBe('"a,b","say ""hi""","line\nbreak"')
  })

  it.each(['=cmd()', '+SUM(A1:A2)', '-1+2', '@IMPORT', '\tformula', '\rformula'])(
    'neutralizes spreadsheet formula input %s',
    (value) => expect(escapeCsvCell(value)).toBe(`"'${value}"`)
  )

  it('keeps numeric values numeric-looking', () => {
    expect(serializeCsvRow([-12.5, 42])).toBe('"-12.5","42"')
  })
})
