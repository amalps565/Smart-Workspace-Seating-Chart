import { act, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FloorSnapshot, MyBooking } from '../../api/types'
import { FakeSocket } from '../../test/fakeSocket'
import { ALICE, BOB, TODAY, bookedUpdate, freedUpdate, makeSnapshot } from '../../test/fixtures'
import { server } from '../../test/server'
import { announcer, deferred, desk, emit, mockBackend, renderApp, signInAsAlice } from '../../test/utils'
import { renderProbe } from './renderProbe'
import { floorTopic } from './socket'

const topic = floorTopic(1, TODAY)

async function renderFloor(snapshot: FloorSnapshot = makeSnapshot(), socket = new FakeSocket()) {
  let current = snapshot
  const calls = mockBackend({ snapshot: () => current })
  const utils = renderApp(socket)
  await screen.findByRole('grid')
  return {
    ...utils,
    calls,
    setSnapshot: (next: FloorSnapshot) => {
      current = next
    },
  }
}

beforeEach(() => {
  signInAsAlice()
})

describe('floor grid', () => {
  it('shows every status with text, not colour alone', async () => {
    await renderFloor(makeSnapshot({ booked: { 1: ALICE, 6: BOB } }))

    expect(desk('A1')).toHaveAccessibleName('Desk A1, booked by you')
    expect(desk('B2')).toHaveAccessibleName('Desk B2, booked by Bob Brown')
    expect(desk('A2')).toHaveAccessibleName('Desk A2, unavailable: next to a booked desk')
    expect(desk('B4')).toHaveAccessibleName('Desk B4, available')
    expect(within(screen.getByRole('grid')).getAllByRole('button', { name: 'Walkway, not a desk' })).toHaveLength(3)

    expect(desk('A1')).toHaveTextContent('Yours')
    expect(desk('B2')).toHaveTextContent('Bob Brown')
    expect(desk('A2')).toHaveTextContent('Too close')
    expect(desk('B4')).toHaveTextContent('Free')
  })

  it('subscribes to the topic before requesting the snapshot', async () => {
    const socket = new FakeSocket()
    let subscribedFirst: boolean | null = null
    mockBackend({
      snapshot: () => {
        subscribedFirst = socket.isSubscribed(topic)
        return makeSnapshot()
      },
    })
    renderApp(socket)
    await screen.findByRole('grid')
    expect(subscribedFirst).toBe(true)
  })

  it('applies updates received while the snapshot was loading', async () => {
    const socket = new FakeSocket()
    const gate = deferred()
    mockBackend({
      snapshot: async () => {
        await gate.promise
        return makeSnapshot({ seq: 3 })
      },
    })
    renderApp(socket)
    await waitFor(() => expect(socket.isSubscribed(topic)).toBe(true))

    await emit(socket, bookedUpdate(6, 4), bookedUpdate(8, 2)) // 8 is older than the snapshot
    await act(async () => gate.resolve())

    expect(await screen.findByRole('button', { name: 'Desk B2, booked by Bob Brown' })).toBeInTheDocument()
    expect(desk('B4')).toHaveAccessibleName('Desk B4, available')
  })

  it('applies live updates and ignores out-of-order and duplicate ones', async () => {
    const { socket } = await renderFloor()

    await emit(socket, bookedUpdate(8, 5))
    expect(desk('B4')).toHaveAccessibleName('Desk B4, booked by Bob Brown')

    await emit(socket, freedUpdate(8, 4)) // stale
    expect(desk('B4')).toHaveAccessibleName('Desk B4, booked by Bob Brown')

    await emit(socket, freedUpdate(8, 6), freedUpdate(8, 6)) // duplicate
    expect(desk('B4')).toHaveAccessibleName('Desk B4, available')

    await emit(socket, bookedUpdate(8, 6)) // same seq again
    expect(desk('B4')).toHaveAccessibleName('Desk B4, available')
  })

  it('shows reconnecting, then reloads the snapshot and replaces the map', async () => {
    const { socket, calls, setSnapshot } = await renderFloor(makeSnapshot({ booked: { 1: BOB } }))
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Live')
    expect(calls.snapshot).toBe(1)

    act(() => socket.setStatus('reconnecting'))
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Reconnecting… the map may be out of date')

    // Missed while offline: desk 1 freed, desk 12 booked.
    setSnapshot(makeSnapshot({ booked: { 12: { ...BOB, seq: 9 } }, seq: 8 }))
    act(() => socket.setStatus('connected'))

    await waitFor(() => expect(desk('C4')).toHaveAccessibleName('Desk C4, booked by Bob Brown'))
    expect(desk('A1')).toHaveAccessibleName('Desk A1, available')
    expect(calls.snapshot).toBe(2)
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Live')
  })

  it('re-renders only the changed cell and the neighbours whose status changes', async () => {
    const { socket } = await renderFloor()
    const renders: number[] = []
    renderProbe.onCellRender = (id) => renders.push(id)

    await emit(socket, bookedUpdate(6, 5))

    // Desk 6 became BOOKED; 2, 5, and 10 became BLOCKED_BY_SPACING. Nothing else re-rendered.
    expect([...new Set(renders)].sort((a, b) => a - b)).toEqual([2, 5, 6, 10])
    expect(renders).toHaveLength(4)

    renders.length = 0
    await emit(socket, bookedUpdate(1, 6)) // neighbours 2 and 5 are already blocked
    expect(renders).toEqual([1])
  })

  it('unsubscribes from the old topic when the date changes', async () => {
    const { socket, user } = await renderFloor()
    const dateSelect = screen.getByRole('combobox', { name: 'Day' })
    const tomorrow = within(dateSelect).getAllByRole('option')[1] as HTMLOptionElement
    mockBackend({ snapshot: (_id, date) => makeSnapshot({ date }) })

    await user.selectOptions(dateSelect, tomorrow.value)

    await waitFor(() => expect(socket.subscribedTopics()).toEqual([floorTopic(1, tomorrow.value)]))
  })

  it('announces when the desk you are on is taken by someone else', async () => {
    const { socket } = await renderFloor()
    act(() => desk('C4').focus())
    expect(desk('C4')).toHaveAttribute('tabindex', '0')

    await emit(socket, bookedUpdate(12, 5))

    expect(announcer()).toHaveTextContent('Desk C4 was just booked by Bob Brown.')
  })
})

describe('optimistic booking', () => {
  it('shows the booking at once, then confirms it', async () => {
    const gate = deferred()
    let posts = 0
    const { user } = await renderFloor()
    server.use(
      http.post('*/api/bookings', async ({ request }) => {
        posts++
        const body = (await request.json()) as { deskId: number; date: string }
        await gate.promise
        return HttpResponse.json({ id: 77, deskId: body.deskId, floorId: 1, date: body.date, seq: 2 }, { status: 201 })
      }),
    )

    await user.click(desk('A2'))
    expect(desk('A2')).toHaveAccessibleName('Desk A2, booking in progress')
    expect(desk('A2')).toHaveAttribute('aria-busy', 'true')

    await user.click(desk('A2')) // blocked while in flight
    await act(async () => gate.resolve())

    await waitFor(() => expect(desk('A2')).toHaveAccessibleName('Desk A2, booked by you'))
    expect(announcer()).toHaveTextContent(/Desk A2 is booked for you/)
    expect(posts).toBe(1)
  })

  it('rolls back on a 409 and shows the reason from the error code', async () => {
    const { user, calls } = await renderFloor()
    server.use(
      http.post('*/api/bookings', () =>
        HttpResponse.json({ code: 'SPACING_VIOLATION', message: 'Neighbour booked' }, { status: 409 }),
      ),
    )

    await user.click(desk('A2'))

    await waitFor(() => expect(desk('A2')).toHaveAccessibleName('Desk A2, available'))
    expect(announcer()).toHaveTextContent(
      'Could not book desk A2. This desk is right next to a booked desk. Pick one with free desks around it.',
    )
    // The map reloads from the server to reconcile.
    await waitFor(() => expect(calls.snapshot).toBe(2))
  })

  it('reconciles with the server after DESK_TAKEN', async () => {
    const { user, setSnapshot } = await renderFloor()
    server.use(
      http.post('*/api/bookings', () => HttpResponse.json({ code: 'DESK_TAKEN', message: 'Taken' }, { status: 409 })),
    )
    setSnapshot(makeSnapshot({ booked: { 2: { ...BOB, seq: 4 } } }))

    await user.click(desk('A2'))

    await waitFor(() => expect(desk('A2')).toHaveAccessibleName('Desk A2, booked by Bob Brown'))
    expect(announcer()).toHaveTextContent('Could not book desk A2. Someone else has just booked this desk.')
  })

  it('never lets a late response overwrite newer socket state', async () => {
    const gate = deferred()
    const { socket, user } = await renderFloor()
    server.use(
      http.post('*/api/bookings', async () => {
        await gate.promise
        return HttpResponse.json({ id: 77, deskId: 2, floorId: 1, date: TODAY, seq: 3 }, { status: 201 })
      }),
    )

    await user.click(desk('A2'))
    // The booking (seq 3) and a later cancel from another tab (seq 4) arrive before the response.
    await emit(socket, bookedUpdate(2, 3, ALICE), freedUpdate(2, 4))
    await act(async () => gate.resolve())

    await waitFor(() => expect(desk('A2')).toHaveAccessibleName('Desk A2, available'))
  })

  it('cancels your own desk optimistically and rolls back on failure', async () => {
    const { user } = await renderFloor(makeSnapshot({ booked: { 1: { ...ALICE, bookingId: 55 } } }))
    server.use(
      http.delete('*/api/bookings/55', () => HttpResponse.json({ code: 'FORBIDDEN', message: 'No' }, { status: 403 })),
    )

    await user.click(desk('A1'))

    await waitFor(() => expect(announcer()).toHaveTextContent('Could not cancel desk A1. You can only cancel your own bookings.'))
    expect(desk('A1')).toHaveAccessibleName('Desk A1, booked by you')
  })
})

describe('keyboard', () => {
  it('moves with arrow keys, books with Enter, and cancels with Space', async () => {
    const { user } = await renderFloor()
    server.use(
      http.post('*/api/bookings', () =>
        HttpResponse.json({ id: 90, deskId: 8, floorId: 1, date: TODAY, seq: 2 }, { status: 201 }),
      ),
      http.delete('*/api/bookings/90', () => new HttpResponse(null, { status: 204 })),
    )

    // Tab into the grid: exactly one cell is in the tab order.
    const grid = screen.getByRole('grid')
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1)
    for (let i = 0; i < 10 && !grid.contains(document.activeElement); i++) await user.tab()
    expect(desk('A1')).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(desk('A2')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(desk('B2')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toHaveAccessibleName('Walkway, not a desk')
    await user.keyboard('{ArrowRight}')
    expect(desk('B4')).toHaveFocus()
    await user.keyboard('{ArrowRight}') // edge: stays put
    expect(desk('B4')).toHaveFocus()
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1)

    await user.keyboard('{Enter}')
    await waitFor(() => expect(desk('B4')).toHaveAccessibleName('Desk B4, booked by you'))
    expect(announcer()).toHaveTextContent(/Desk B4 is booked for you/)

    await user.keyboard(' ')
    await waitFor(() => expect(desk('B4')).toHaveAccessibleName('Desk B4, available'))
    expect(announcer()).toHaveTextContent('Your booking for desk B4 is cancelled.')
    expect(desk('B4')).toHaveFocus()
  })
})

describe('my bookings', () => {
  it('lists bookings and cancels one on another day', async () => {
    let bookings: MyBooking[] = [
      { id: 31, deskId: 4, deskLabel: '4-A1', floorId: 2, floorName: 'Floor 4', date: TODAY },
    ]
    mockBackend({ snapshot: () => makeSnapshot(), myBookings: () => bookings })
    server.use(
      http.delete('*/api/bookings/31', () => {
        bookings = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderApp()

    const list = await screen.findByRole('region', { name: 'My bookings' })
    const cancel = await within(list).findByRole('button', { name: /Cancel desk 4-A1/ })
    await user.click(cancel)

    expect(await within(list).findByText('You have no upcoming bookings.')).toBeInTheDocument()
    expect(announcer()).toHaveTextContent(/Your booking for desk 4-A1 on .* is cancelled\./)
  })
})
