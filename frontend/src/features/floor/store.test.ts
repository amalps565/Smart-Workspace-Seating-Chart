import { describe, expect, it } from 'vitest'
import { ALICE, BOB, TODAY, bookedUpdate, freedUpdate, makeSnapshot } from '../../test/fixtures'
import { createFloorStore, deriveCellView } from './store'

function readyStore(snapshot = makeSnapshot()) {
  const store = createFloorStore(ALICE.username)
  store.getState().begin(1, TODAY)
  store.getState().loadSnapshot(snapshot)
  return store
}

const statusOf = (store: ReturnType<typeof readyStore>, id: number) => deriveCellView(store.getState(), id).status

describe('floor store', () => {
  it('normalizes desks by ID from the snapshot', () => {
    const store = readyStore(makeSnapshot({ booked: { 6: BOB } }))
    const state = store.getState()
    expect(state.phase).toBe('ready')
    expect(state.desks[6]).toMatchObject({ status: 'BOOKED', bookedBy: 'Bob Brown', seq: 1 })
    expect(state.desks[3]).toBeUndefined()
    expect(state.cells[3].type).toBe('WALKWAY')
    expect(state.layout[1]).toEqual([5, 6, 7, 8])
  })

  it('ignores out-of-order updates', () => {
    const store = readyStore()
    store.getState().receive([bookedUpdate(2, 5)])
    store.getState().receive([freedUpdate(2, 4)])
    expect(store.getState().desks[2]).toMatchObject({ status: 'BOOKED', seq: 5 })
  })

  it('ignores duplicate updates without changing state', () => {
    const store = readyStore()
    store.getState().receive([bookedUpdate(2, 5)])
    const before = store.getState().desks
    store.getState().receive([bookedUpdate(2, 5)])
    expect(store.getState().desks).toBe(before)
  })

  it('applies a burst in seq order even when it arrives shuffled', () => {
    const store = readyStore()
    store.getState().receive([freedUpdate(2, 7), bookedUpdate(2, 6), bookedUpdate(2, 5)])
    expect(store.getState().desks[2]).toMatchObject({ status: 'AVAILABLE', seq: 7 })
  })

  it('ignores updates for another date or an unknown desk', () => {
    const store = readyStore()
    const before = store.getState().desks
    store.getState().receive([bookedUpdate(2, 9, BOB, '2000-01-01'), bookedUpdate(999, 9)])
    expect(store.getState().desks).toBe(before)
  })

  it('buffers updates until the snapshot arrives, then applies only newer ones', () => {
    const store = createFloorStore(ALICE.username)
    store.getState().begin(1, TODAY)
    store.getState().receive([bookedUpdate(2, 5), bookedUpdate(4, 1)])
    expect(store.getState().buffer).toHaveLength(2)

    store.getState().loadSnapshot(makeSnapshot({ seq: 1 }))

    const state = store.getState()
    expect(state.buffer).toEqual([])
    expect(state.desks[2]).toMatchObject({ status: 'BOOKED', seq: 5 }) // newer than snapshot
    expect(state.desks[4]).toMatchObject({ status: 'AVAILABLE', seq: 1 }) // not newer: dropped
  })

  it('ignores a snapshot for a floor or date it is no longer showing', () => {
    const store = createFloorStore(ALICE.username)
    store.getState().begin(1, TODAY)
    store.getState().loadSnapshot(makeSnapshot({ floorId: 2 }))
    expect(store.getState().phase).toBe('loading')
  })

  it('replaces state on resync after a reconnect, buffering updates meanwhile', () => {
    const store = readyStore(makeSnapshot({ booked: { 1: BOB } }))
    store.getState().startSync()
    store.getState().receive([bookedUpdate(12, 20)])
    expect(store.getState().desks[12].status).toBe('AVAILABLE')

    // While disconnected, desk 1 was freed and desk 8 booked; the fresh snapshot says so.
    store.getState().loadSnapshot(makeSnapshot({ booked: { 8: { ...BOB, seq: 15 } }, seq: 10 }))

    const state = store.getState()
    expect(state.syncing).toBe(false)
    expect(state.desks[1]).toMatchObject({ status: 'AVAILABLE', seq: 10 })
    expect(state.desks[8]).toMatchObject({ status: 'BOOKED', seq: 15 })
    expect(state.desks[12]).toMatchObject({ status: 'BOOKED', seq: 20 })
  })

  it('does not let a late booking response overwrite newer state', () => {
    const store = readyStore()
    store.getState().markPending(2, 'book')
    store.getState().receive([bookedUpdate(2, 3, ALICE), freedUpdate(2, 4)])
    store.getState().confirmBooking(1, TODAY, { id: 77, deskId: 2, floorId: 1, date: TODAY, seq: 3 })
    store.getState().clearPending(2)
    expect(store.getState().desks[2]).toMatchObject({ status: 'AVAILABLE', seq: 4, bookingId: null })
  })

  it('attaches the booking ID when the socket echo arrives before the response', () => {
    const store = readyStore()
    store.getState().receive([bookedUpdate(2, 3, ALICE)])
    store.getState().confirmBooking(1, TODAY, { id: 77, deskId: 2, floorId: 1, date: TODAY, seq: 3 })
    expect(store.getState().desks[2]).toMatchObject({ status: 'BOOKED', bookingId: 77, seq: 3 })
  })

  it('refuses a second pending action on the same desk', () => {
    const store = readyStore()
    expect(store.getState().markPending(2, 'book')).toBe(true)
    expect(store.getState().markPending(2, 'book')).toBe(false)
  })
})

describe('derived cell status', () => {
  it('derives MINE, BOOKED, BLOCKED_BY_SPACING, AVAILABLE, and NOT_A_DESK', () => {
    const store = readyStore(makeSnapshot({ booked: { 1: ALICE, 6: BOB } }))
    expect(statusOf(store, 1)).toBe('MINE')
    expect(statusOf(store, 6)).toBe('BOOKED')
    expect(statusOf(store, 2)).toBe('BLOCKED_BY_SPACING') // above desk 6
    expect(statusOf(store, 5)).toBe('BLOCKED_BY_SPACING') // left of desk 6 (also next to my desk 1)
    expect(statusOf(store, 10)).toBe('BLOCKED_BY_SPACING') // below desk 6
    expect(statusOf(store, 8)).toBe('AVAILABLE') // across the walkway
    expect(statusOf(store, 7)).toBe('NOT_A_DESK')
  })

  it('uses diagonal neighbours when the floor mode is ALL', () => {
    const snapshot = makeSnapshot({ neighbourMode: 'ALL', booked: { 6: BOB } })
    const store = readyStore(snapshot)
    expect(statusOf(store, 1)).toBe('BLOCKED_BY_SPACING')
    expect(statusOf(store, 9)).toBe('BLOCKED_BY_SPACING')
    expect(statusOf(store, 8)).toBe('AVAILABLE')
  })

  it('shows a pending booking as MINE until the server answers', () => {
    const store = readyStore()
    store.getState().markPending(2, 'book')
    expect(deriveCellView(store.getState(), 2)).toMatchObject({ status: 'MINE', pending: 'book' })
    store.getState().clearPending(2)
    expect(statusOf(store, 2)).toBe('AVAILABLE')
  })
})
