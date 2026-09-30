/** Bookings are allowed from today up to this many days ahead. */
export const BOOKING_WINDOW_DAYS = 14

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** `YYYY-MM-DD` for a local date (the office's local date is the browser's). */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function bookableDates(today: Date = new Date()): string[] {
  return Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    return toIsoDate(d)
  })
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDay(iso: string): string {
  return parseIso(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
