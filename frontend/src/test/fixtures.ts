import type { DeskUpdate, Floor, FloorSnapshot, NeighbourMode, SnapshotCell } from '../api/types'
import { bookableDates } from '../features/bookings/dates'

export const TODAY = bookableDates()[0]
export const TOMORROW = bookableDates()[1]

export const FLOORS: Floor[] = [
  { id: 1, name: 'Floor 3', rows: 3, cols: 4, neighbourMode: 'ORTHOGONAL' },
  { id: 2, name: 'Floor 4', rows: 2, cols: 2, neighbourMode: 'ALL' },
]

export interface Booked {
  name: string
  username: string
  bookingId?: number
  seq?: number
}

interface SnapshotOptions {
  floorId?: number
  date?: string
  rows?: number
  cols?: number
  neighbourMode?: NeighbourMode
  /** Column that is a walkway (default 2), or null for none. */
  walkwayCol?: number | null
  booked?: Record<number, Booked>
  seq?: number
}

/**
 * Builds a snapshot where cell IDs are `row * cols + col + 1` and labels are like "A1".
 * With the defaults (3 x 4, walkway in column 2) the layout is:
 *
 *   A1(1) A2(2) ~(3)  A4(4)
 *   B1(5) B2(6) ~(7)  B4(8)
 *   C1(9) C2(10) ~(11) C4(12)
 */
export function makeSnapshot(options: SnapshotOptions = {}): FloorSnapshot {
  const { floorId = 1, date = TODAY, rows = 3, cols = 4, neighbourMode = 'ORTHOGONAL', booked = {}, seq = 1 } = options
  const walkwayCol = options.walkwayCol === undefined ? 2 : options.walkwayCol
  const cells: SnapshotCell[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = row * cols + col + 1
      if (col === walkwayCol) {
        cells.push({ id, row, col, type: 'WALKWAY', label: null })
        continue
      }
      const b = booked[id]
      cells.push({
        id,
        row,
        col,
        type: 'DESK',
        label: `${String.fromCharCode(65 + row)}${col + 1}`,
        status: b ? 'BOOKED' : 'AVAILABLE',
        bookedBy: b?.name ?? null,
        bookedByUsername: b?.username ?? null,
        bookingId: b?.bookingId ?? null,
        seq: b?.seq ?? seq,
      })
    }
  }
  return { floorId, date, rows, cols, neighbourMode, cells }
}

export const BOB = { name: 'Bob Brown', username: 'bob' }
export const ALICE = { name: 'Alice Anders', username: 'alice' }

export function bookedUpdate(deskId: number, seq: number, who = BOB, date = TODAY): DeskUpdate {
  return { deskId, date, status: 'BOOKED', bookedBy: who.name, bookedByUsername: who.username, seq }
}

export function freedUpdate(deskId: number, seq: number, date = TODAY): DeskUpdate {
  return { deskId, date, status: 'AVAILABLE', bookedBy: null, bookedByUsername: null, seq }
}
