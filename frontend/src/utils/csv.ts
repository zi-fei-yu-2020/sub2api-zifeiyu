const FORMULA_PREFIX = /^[=+@\-\t\r]/

export function escapeCsvCell(value: unknown): string {
  let text = value == null ? '' : String(value)
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) {
    text = `'${text}`
  }
  return `"${text.replace(/"/g, '""')}"`
}

export function serializeCsvRow(values: readonly unknown[]): string {
  return values.map(escapeCsvCell).join(',')
}

export function createCsvBlob(lines: readonly string[]): Blob {
  return new Blob(['\uFEFF', lines.join('\r\n'), '\r\n'], {
    type: 'text/csv;charset=utf-8',
  })
}
