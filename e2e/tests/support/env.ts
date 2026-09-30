/** Where the frontend is served (Vite dev server, which proxies /api and /ws to the backend). */
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

/** The backend, called directly by the API helper for setup and cleanup. */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080'

/**
 * The office time zone. It must match the backend's `app.booking.zone` (BOOKING_ZONE, default UTC).
 * The browser runs in this zone too, because the frontend builds its date list from the local date.
 */
export const OFFICE_TIME_ZONE = process.env.E2E_TIME_ZONE ?? 'UTC'

/** Seeded demo users (backend Flyway seed). All use the password "password". */
export const USERS = {
  alice: { username: 'alice', password: 'password', displayName: 'Alice Anders' },
  bob: { username: 'bob', password: 'password', displayName: 'Bob Brown' },
  carol: { username: 'carol', password: 'password', displayName: 'Carol Chen' },
  dave: { username: 'dave', password: 'password', displayName: 'Dave Diaz' },
  erin: { username: 'erin', password: 'password', displayName: 'Erin Evans' },
} as const

export type SeedUser = (typeof USERS)[keyof typeof USERS]

/** Seeded floors: "Floor 3" is 8x12 ORTHOGONAL with a walkway in column 7; "Floor 4" is 4x6 ALL. */
export const FLOOR_3 = 'Floor 3'
export const FLOOR_4 = 'Floor 4'

/**
 * `YYYY-MM-DD` for today + `offsetDays` in the office time zone.
 *
 * Each spec uses its own offset, so tests never share a date and can't see each other's
 * bookings. Keep offsets between 1 and 13: day 0 and day 14 sit on the window's edges and
 * could fall outside it if the date changes during a run.
 */
export function officeDate(offsetDays: number, now: Date = new Date()): string {
  if (offsetDays < 1 || offsetDays > 13) throw new Error(`Use a date offset from 1 to 13, got ${offsetDays}`)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: OFFICE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const day = new Date(Date.UTC(get('year'), get('month') - 1, get('day') + offsetDays))
  return day.toISOString().slice(0, 10)
}
