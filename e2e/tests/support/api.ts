import { request, type APIRequestContext, type APIResponse } from '@playwright/test'
import { API_URL, USERS, type SeedUser } from './env'

/**
 * A small REST client for test setup, cleanup, and server-side assertions. It talks to the
 * backend directly (not through the Vite proxy) and follows the contract in the root CLAUDE.md.
 */

export interface Floor {
  id: number
  name: string
  rows: number
  cols: number
  neighbourMode: 'ORTHOGONAL' | 'ALL'
}

export interface SnapshotCell {
  id: number
  row: number
  col: number
  type: string
  label: string | null
  status?: 'AVAILABLE' | 'BOOKED'
  bookedBy?: string | null
  bookingId?: number | null
  seq?: number
}

export interface Snapshot {
  floorId: number
  date: string
  cells: SnapshotCell[]
}

export interface MyBooking {
  id: number
  deskId: number
  deskLabel?: string | null
  floorId: number
  date: string
}

async function expectStatus(response: APIResponse, expected: number, what: string) {
  if (response.status() !== expected) {
    throw new Error(`${what}: expected HTTP ${expected}, got ${response.status()} ${await response.text()}`)
  }
}

export class ApiClient {
  private constructor(
    private readonly http: APIRequestContext,
    readonly user: SeedUser,
  ) {}

  /** Signs in as a seeded user. Call `dispose()` when done. */
  static async signIn(user: SeedUser): Promise<ApiClient> {
    const anonymous = await request.newContext({ baseURL: API_URL })
    const login = await anonymous.post('/api/auth/login', {
      data: { username: user.username, password: user.password },
    })
    await expectStatus(login, 200, `login as ${user.username}`)
    const { token } = (await login.json()) as { token: string }
    await anonymous.dispose()
    const http = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    })
    return new ApiClient(http, user)
  }

  async floors(): Promise<Floor[]> {
    const response = await this.http.get('/api/floors')
    await expectStatus(response, 200, 'GET /api/floors')
    return (await response.json()) as Floor[]
  }

  async floorByName(name: string): Promise<Floor> {
    const floor = (await this.floors()).find((f) => f.name === name)
    if (!floor) throw new Error(`Seed floor "${name}" not found`)
    return floor
  }

  async snapshot(floorId: number, date: string): Promise<Snapshot> {
    const response = await this.http.get(`/api/floors/${floorId}/snapshot`, { params: { date } })
    await expectStatus(response, 200, `GET snapshot of floor ${floorId} on ${date}`)
    return (await response.json()) as Snapshot
  }

  async desk(floorName: string, label: string, date: string): Promise<SnapshotCell> {
    const floor = await this.floorByName(floorName)
    const cell = (await this.snapshot(floor.id, date)).cells.find((c) => c.label === label)
    if (!cell) throw new Error(`Desk ${label} not found on ${floorName}`)
    return cell
  }

  /** Books a desk and returns the raw response, so callers can assert on 201 or 409. */
  book(deskId: number, date: string): Promise<APIResponse> {
    return this.http.post('/api/bookings', { data: { deskId, date } })
  }

  async myBookings(): Promise<MyBooking[]> {
    const response = await this.http.get('/api/bookings/me')
    await expectStatus(response, 200, 'GET /api/bookings/me')
    return (await response.json()) as MyBooking[]
  }

  async cancel(bookingId: number): Promise<void> {
    const response = await this.http.delete(`/api/bookings/${bookingId}`)
    // 404 means it's already gone, which is what cleanup wants.
    if (response.status() !== 204 && response.status() !== 404) {
      throw new Error(`DELETE /api/bookings/${bookingId}: got ${response.status()} ${await response.text()}`)
    }
  }

  /** Cancels this user's bookings on the given date. */
  async cancelBookingsOn(date: string): Promise<void> {
    for (const booking of await this.myBookings()) {
      if (booking.date === date) await this.cancel(booking.id)
    }
  }

  async dispose(): Promise<void> {
    await this.http.dispose()
  }
}

/**
 * Removes every seeded user's bookings on `date`, so a test starts from an empty floor even
 * after an aborted run against a long-lived local database. Only that date is touched.
 */
export async function clearBookingsOn(date: string): Promise<void> {
  for (const user of Object.values(USERS)) {
    const client = await ApiClient.signIn(user)
    try {
      await client.cancelBookingsOn(date)
    } finally {
      await client.dispose()
    }
  }
}

/** Server-side truth: labels of the booked desks on a floor and date, with who booked them. */
export async function bookedDesks(floorName: string, date: string): Promise<Record<string, string | null>> {
  const client = await ApiClient.signIn(USERS.alice)
  try {
    const floor = await client.floorByName(floorName)
    const snapshot = await client.snapshot(floor.id, date)
    const booked: Record<string, string | null> = {}
    for (const cell of snapshot.cells) {
      if (cell.status === 'BOOKED' && cell.label) booked[cell.label] = cell.bookedBy ?? null
    }
    return booked
  } finally {
    await client.dispose()
  }
}

