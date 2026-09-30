import { useSyncExternalStore } from 'react'

// The only module that holds the JWT. It lives in memory and in sessionStorage so a
// page reload keeps the user signed in for the tab. Never log it.

export interface Session {
  token: string
  username: string
  displayName: string
}

export interface CurrentUser {
  username: string
  displayName: string
}

const STORAGE_KEY = 'seating.session'

let session: Session | null = readStored()
let user: CurrentUser | null = toUser(session)
const listeners = new Set<() => void>()

function readStored(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.token === 'string' && typeof parsed.username === 'string') {
      return { token: parsed.token, username: parsed.username, displayName: parsed.displayName ?? parsed.username }
    }
  } catch {
    // Corrupt or unavailable storage: treat as signed out.
  }
  return null
}

function toUser(s: Session | null): CurrentUser | null {
  return s ? { username: s.username, displayName: s.displayName } : null
}

function emit() {
  for (const listener of listeners) listener()
}

export function signIn(next: Session) {
  session = next
  user = toUser(next)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage may be unavailable (private mode); the in-memory copy still works.
  }
  emit()
}

export function signOut() {
  if (!session) return
  session = null
  user = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

/** Headers for an authenticated request, or none when signed out. */
export function authHeaders(): Record<string, string> {
  return session ? { Authorization: `Bearer ${session.token}` } : {}
}

export function currentUser(): CurrentUser | null {
  return user
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCurrentUser(): CurrentUser | null {
  return useSyncExternalStore(subscribe, currentUser, currentUser)
}

/** Test helper: reload the session from storage. */
export function resetSessionForTests() {
  session = readStored()
  user = toUser(session)
  emit()
}
