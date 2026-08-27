function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

function hasEncodedControlCharacters(value: string): boolean {
  let decoded = value
  for (let i = 0; i < 3; i += 1) {
    let next: string
    try {
      next = decodeURIComponent(decoded)
    } catch {
      return true
    }
    if (next === decoded) return false
    if (hasControlCharacters(next)) return true
    decoded = next
  }
  return false
}

/**
 * Validates a URL before using it for browser navigation.
 *
 * Accepted values are HTTPS absolute URLs and explicit same-site paths that
 * start with one slash. Payment QR payloads intentionally do not use this
 * helper because providers may return dedicated schemes such as weixin://.
 */
export function normalizePaymentRedirectURL(value: string | null | undefined): string {
  const raw = String(value || '').trim()
  if (!raw || hasControlCharacters(raw) || hasEncodedControlCharacters(raw) || raw.includes('\\')) {
    return ''
  }

  if (raw.startsWith('/')) {
    if (raw.startsWith('//')) return ''
    try {
      const parsed = new URL(raw, 'https://payment.invalid')
      if (parsed.origin !== 'https://payment.invalid' || !parsed.pathname.startsWith('/')) return ''
      return raw
    } catch {
      return ''
    }
  }

  if (!/^https:\/\/[^/\\]/i.test(raw)) {
    return ''
  }

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
      return ''
    }
    return raw
  } catch {
    return ''
  }
}

export function isSafePaymentRedirectURL(value: string | null | undefined): boolean {
  return normalizePaymentRedirectURL(value) !== ''
}
