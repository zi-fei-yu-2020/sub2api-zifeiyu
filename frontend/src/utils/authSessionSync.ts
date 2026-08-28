export const AUTH_STORAGE_KEYS = {
  token: 'auth_token',
  user: 'auth_user',
  refreshToken: 'refresh_token',
  expiresAt: 'token_expires_at',
  refreshCookie: 'refresh_cookie_enabled',
  refreshGeneration: 'refresh_generation',
} as const

const AUTH_SYNC_CHANNEL = 'sub2api-auth-session'
const AUTH_SYNC_EVENT_KEY = 'auth_session_event'
const sourceId = `${Date.now()}-${Math.random()}`

export type AuthSessionEventType = 'login' | 'logout' | 'refresh' | 'clear'

export interface AuthSessionEvent {
  type: AuthSessionEventType
  sourceId: string
  timestamp: number
  refreshGeneration?: string
}

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (channel) return channel
  if (typeof BroadcastChannel === 'undefined') return null
  channel = new BroadcastChannel(AUTH_SYNC_CHANNEL)
  return channel
}

export function publishAuthSessionEvent(type: AuthSessionEventType): void {
  if (typeof window === 'undefined') return
  const event: AuthSessionEvent = {
    type,
    sourceId,
    timestamp: Date.now(),
    refreshGeneration: localStorage.getItem(AUTH_STORAGE_KEYS.refreshGeneration) ?? undefined,
  }
  getChannel()?.postMessage(event)
  try {
    localStorage.setItem(AUTH_SYNC_EVENT_KEY, JSON.stringify(event))
  } catch {
    // BroadcastChannel remains the primary transport when storage is unavailable.
  }
}

export function subscribeAuthSessionEvents(handler: (event: AuthSessionEvent) => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  const deliver = (event: AuthSessionEvent | null | undefined): void => {
    if (!event || event.sourceId === sourceId) return
    handler(event)
  }
  const authChannel = getChannel()
  const onMessage = (event: MessageEvent<AuthSessionEvent>): void => deliver(event.data)
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== AUTH_SYNC_EVENT_KEY || !event.newValue) return
    try {
      deliver(JSON.parse(event.newValue) as AuthSessionEvent)
    } catch {
      // Ignore malformed cross-tab events.
    }
  }

  authChannel?.addEventListener('message', onMessage)
  window.addEventListener('storage', onStorage)
  return () => {
    authChannel?.removeEventListener('message', onMessage)
    window.removeEventListener('storage', onStorage)
  }
}

export function clearStoredAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token)
  localStorage.removeItem(AUTH_STORAGE_KEYS.user)
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken)
  localStorage.removeItem(AUTH_STORAGE_KEYS.expiresAt)
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshCookie)
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshGeneration)
}
