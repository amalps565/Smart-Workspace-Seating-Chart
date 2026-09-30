import { createStore, type StoreApi } from 'zustand/vanilla'
import type { CellType, CreatedBooking, DeskStatus, DeskUpdate, FloorSnapshot, NeighbourMode } from '../../api/types'
import { buildNeighbourMap } from './neighbours'

/** Static layout of one grid cell. Replaced only by a snapshot. */
export interface CellInfo {
  id: number
  row: number
  col: number
  type: CellType
  label: string | null
}

/** Server state of one desk. Replaced per desk by socket updates. */
export interface DeskState {
  id: number
  status: DeskStatus
  bookedBy: string | null
  bookedByUsername: string | null
  bookingId: number | null
  seq: number
}

export type PendingKind = 'book' | 'cancel'

export interface PendingAction {
  kind: PendingKind
  /** Desk seq when the request started; used to tell whether newer state arrived since. */
  seqAtStart: number
}

export type Phase = 'idle' | 'loading' | 'ready' | 'error'

export interface FloorState {
  me: string
  floorId: number | null
  date: string | null
  phase: Phase
  /** True while a snapshot is being (re)loaded; socket updates are buffered meanwhile. */
  syncing: boolean
  error: string | null
  rows: number
  cols: number
  neighbourMode: NeighbourMode
  cells: Record<number, CellInfo>
  /** Cell IDs laid out row by row; `null` where the snapshot has no cell. */
  layout: (number | null)[][]
  neighbours: Record<number, number[]>
  desks: Record<number, DeskState>
  pending: Record<number, PendingAction>
  buffer: DeskUpdate[]

  begin(floorId: number, date: string): void
  startSync(): void
  loadSnapshot(snapshot: FloorSnapshot): void
  failSync(message: string): void
  receive(updates: readonly DeskUpdate[]): void
  markPending(deskId: number, kind: PendingKind): boolean
  clearPending(deskId: number): void
  confirmBooking(floorId: number, date: string, booking: CreatedBooking): void
  confirmCancel(floorId: number, date: string, deskId: number, seqAtStart: number): void
}

export type FloorStore = StoreApi<FloorState>

/**
 * Applies updates in `seq` order. An update is applied only when its `seq` is newer than
 * the stored one, which drops stale, out-of-order, and duplicate messages.
 */
export function applyUpdates(
  desks: Record<number, DeskState>,
  updates: readonly DeskUpdate[],
  date: string | null,
  me: string,
): Record<number, DeskState> {
  let next = desks
  const ordered = [...updates].sort((a, b) => a.seq - b.seq)
  for (const update of ordered) {
    if (update.date !== date) continue
    const current = next[update.deskId]
    if (!current || update.seq <= current.seq) continue
    const stillMine =
      update.status === 'BOOKED' && update.bookedByUsername === me && current.bookedByUsername === me
    if (next === desks) next = { ...desks }
    next[update.deskId] = {
      id: current.id,
      status: update.status,
      bookedBy: update.status === 'BOOKED' ? update.bookedBy : null,
      bookedByUsername: update.status === 'BOOKED' ? update.bookedByUsername : null,
      // Socket messages don't carry booking IDs; keep ours when the desk is still ours.
      bookingId: stillMine ? current.bookingId : null,
      seq: update.seq,
    }
  }
  return next
}

const empty = {
  phase: 'idle' as Phase,
  syncing: false,
  error: null,
  rows: 0,
  cols: 0,
  neighbourMode: 'ORTHOGONAL' as NeighbourMode,
  cells: {},
  layout: [],
  neighbours: {},
  desks: {},
  pending: {},
  buffer: [],
}

export function createFloorStore(me: string): FloorStore {
  return createStore<FloorState>()((set, get) => ({
    me,
    floorId: null,
    date: null,
    ...empty,

    begin(floorId, date) {
      set({ ...empty, floorId, date, phase: 'loading', syncing: true })
    },

    startSync() {
      set({ syncing: true, error: null })
    },

    loadSnapshot(snapshot) {
      const state = get()
      if (snapshot.floorId !== state.floorId || snapshot.date !== state.date) return

      const cells: Record<number, CellInfo> = {}
      let desks: Record<number, DeskState> = {}
      const layout: (number | null)[][] = Array.from({ length: snapshot.rows }, () =>
        Array.from({ length: snapshot.cols }, () => null),
      )
      for (const cell of snapshot.cells) {
        if (cell.row < 0 || cell.row >= snapshot.rows || cell.col < 0 || cell.col >= snapshot.cols) continue
        cells[cell.id] = { id: cell.id, row: cell.row, col: cell.col, type: cell.type, label: cell.label }
        layout[cell.row][cell.col] = cell.id
        if (cell.type === 'DESK') {
          const booked = cell.status === 'BOOKED'
          desks[cell.id] = {
            id: cell.id,
            status: booked ? 'BOOKED' : 'AVAILABLE',
            bookedBy: booked ? (cell.bookedBy ?? null) : null,
            bookedByUsername: booked ? (cell.bookedByUsername ?? null) : null,
            bookingId: booked ? (cell.bookingId ?? null) : null,
            seq: cell.seq ?? 0,
          }
        }
      }
      // Updates that arrived while the snapshot was in flight: apply the ones newer than it.
      desks = applyUpdates(desks, state.buffer, state.date, state.me)

      set({
        phase: 'ready',
        syncing: false,
        error: null,
        rows: snapshot.rows,
        cols: snapshot.cols,
        neighbourMode: snapshot.neighbourMode,
        cells,
        layout,
        neighbours: buildNeighbourMap(Object.values(cells), snapshot.neighbourMode),
        desks,
        buffer: [],
      })
    },

    failSync(message) {
      const state = get()
      if (state.phase === 'ready') {
        // Keep showing the last known map, plus whatever updates arrived meanwhile.
        set({
          syncing: false,
          error: message,
          desks: applyUpdates(state.desks, state.buffer, state.date, state.me),
          buffer: [],
        })
      } else {
        set({ phase: 'error', syncing: false, error: message })
      }
    },

    receive(updates) {
      if (updates.length === 0) return
      const state = get()
      if (state.phase !== 'ready' || state.syncing) {
        set({ buffer: [...state.buffer, ...updates] })
        return
      }
      const desks = applyUpdates(state.desks, updates, state.date, state.me)
      if (desks !== state.desks) set({ desks })
    },

    markPending(deskId, kind) {
      const state = get()
      const desk = state.desks[deskId]
      if (!desk || state.pending[deskId]) return false
      set({ pending: { ...state.pending, [deskId]: { kind, seqAtStart: desk.seq } } })
      return true
    },

    clearPending(deskId) {
      const state = get()
      if (!state.pending[deskId]) return
      const pending = { ...state.pending }
      delete pending[deskId]
      set({ pending })
    },

    confirmBooking(floorId, date, booking) {
      const state = get()
      if (state.floorId !== floorId || state.date !== date) return
      const desk = state.desks[booking.deskId]
      if (!desk) return
      if (booking.seq > desk.seq) {
        set({
          desks: {
            ...state.desks,
            [desk.id]: {
              id: desk.id,
              status: 'BOOKED',
              bookedBy: null,
              bookedByUsername: state.me,
              bookingId: booking.id,
              seq: booking.seq,
            },
          },
        })
      } else if (booking.seq === desk.seq && desk.bookedByUsername === state.me) {
        // The socket echo of this booking won the race; just attach the booking ID.
        set({ desks: { ...state.desks, [desk.id]: { ...desk, bookingId: booking.id } } })
      }
      // Otherwise newer state already arrived; a late response must not overwrite it.
    },

    confirmCancel(floorId, date, deskId, seqAtStart) {
      const state = get()
      if (state.floorId !== floorId || state.date !== date) return
      const desk = state.desks[deskId]
      // DELETE returns no seq. Only mark the desk free if nothing newer arrived meanwhile;
      // the socket message (with a higher seq) then replaces this local state.
      if (!desk || desk.seq !== seqAtStart || desk.bookedByUsername !== state.me) return
      set({
        desks: {
          ...state.desks,
          [deskId]: { ...desk, status: 'AVAILABLE', bookedBy: null, bookedByUsername: null, bookingId: null },
        },
      })
    },
  }))
}

// ---- Derived view state ----

export type CellStatus = 'AVAILABLE' | 'MINE' | 'BOOKED' | 'BLOCKED_BY_SPACING' | 'NOT_A_DESK'

export interface CellView {
  type: CellType
  label: string | null
  status: CellStatus
  bookedBy: string | null
  pending: PendingKind | null
}

function bookedByOther(desk: DeskState | undefined, me: string): boolean {
  return desk?.status === 'BOOKED' && desk.bookedByUsername !== me
}

/** Status shown for a cell, derived from its desk, pending action, and neighbours. */
export function deriveCellView(state: FloorState, id: number): CellView {
  const cell = state.cells[id]
  if (!cell || cell.type !== 'DESK') {
    return { type: cell?.type ?? 'WALKWAY', label: cell?.label ?? null, status: 'NOT_A_DESK', bookedBy: null, pending: null }
  }
  const desk = state.desks[id]
  const pending = state.pending[id]?.kind ?? null
  const view = (status: CellStatus, bookedBy: string | null = null): CellView => ({
    type: cell.type,
    label: cell.label,
    status,
    bookedBy,
    pending,
  })

  if (desk?.status === 'BOOKED') {
    if (desk.bookedByUsername !== state.me) return view('BOOKED', desk.bookedBy ?? desk.bookedByUsername)
    if (pending !== 'cancel') return view('MINE')
  } else if (pending === 'book') {
    return view('MINE')
  }

  const blocked = (state.neighbours[id] ?? []).some((n) => bookedByOther(state.desks[n], state.me))
  return view(blocked ? 'BLOCKED_BY_SPACING' : 'AVAILABLE')
}
