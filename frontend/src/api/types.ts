// DTOs for the REST and WebSocket contract described in the root CLAUDE.md.

export type NeighbourMode = 'ORTHOGONAL' | 'ALL'
export type CellType = 'DESK' | 'WALKWAY' | 'WALL' | 'ROOM'
export type DeskStatus = 'AVAILABLE' | 'BOOKED'

export interface LoginResponse {
  token: string
  username: string
  displayName: string
}

export interface Floor {
  id: number
  name: string
  rows: number
  cols: number
  neighbourMode: NeighbourMode
}

export interface SnapshotCell {
  id: number
  row: number
  col: number
  type: CellType
  label: string | null
  // Present on DESK cells only.
  status?: DeskStatus
  bookedBy?: string | null
  bookedByUsername?: string | null
  bookingId?: number | null
  seq?: number
}

export interface FloorSnapshot {
  floorId: number
  date: string
  rows: number
  cols: number
  neighbourMode: NeighbourMode
  cells: SnapshotCell[]
}

export interface CreatedBooking {
  id: number
  deskId: number
  floorId: number
  date: string
  seq: number
}

export interface MyBooking {
  id: number
  deskId: number
  deskLabel: string | null
  floorId: number
  floorName: string
  date: string
}

/** Message on `/topic/floors/{floorId}/{date}`. */
export interface DeskUpdate {
  deskId: number
  date: string
  status: DeskStatus
  bookedBy: string | null
  bookedByUsername: string | null
  seq: number
}

export interface ErrorBody {
  code: string
  message: string
}
