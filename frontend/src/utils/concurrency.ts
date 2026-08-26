export function formatConcurrencyLimit(value: number | null | undefined, unlimitedLabel: string, requestsLabel: string): string {
  const concurrency = Number(value ?? 0)
  if (!Number.isFinite(concurrency) || concurrency <= 0) return unlimitedLabel
  return `${concurrency} ${requestsLabel}`
}
