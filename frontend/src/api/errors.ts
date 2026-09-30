export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const FRIENDLY: Record<string, string> = {
  DESK_TAKEN: 'Someone else has just booked this desk.',
  SPACING_VIOLATION: 'This desk is right next to a booked desk. Pick one with free desks around it.',
  ALREADY_BOOKED_TODAY: 'You already have a desk for this day. Cancel it first to pick another.',
  INVALID_DATE: 'Bookings are open from today up to 14 days ahead.',
  NOT_A_DESK: 'That spot is not a bookable desk.',
  NOT_FOUND: 'That desk or booking no longer exists.',
  FORBIDDEN: 'You can only cancel your own bookings.',
  INVALID_CREDENTIALS: 'Wrong username or password.',
  UNAUTHORIZED: 'Your session has ended. Please sign in again.',
  NETWORK_ERROR: 'Could not reach the server. Check your connection and try again.',
}

/** User-facing text for an error, chosen from its `code`, never from raw server HTML. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return FRIENDLY[error.code] ?? 'Something went wrong. Please try again.'
  }
  return FRIENDLY.NETWORK_ERROR
}

export function errorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null
}
