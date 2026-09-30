import { QueryClient } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import App from '../App'
import type { DeskUpdate, FloorSnapshot, MyBooking } from '../api/types'
import { signIn } from '../auth/session'
import { floorTopic } from '../features/floor/socket'
import { FakeSocket } from './fakeSocket'
import { ALICE, FLOORS, TODAY } from './fixtures'
import { server } from './server'

export function signInAsAlice() {
  signIn({ token: 'test-token', username: ALICE.username, displayName: ALICE.name })
}

interface BackendOptions {
  snapshot?: (floorId: number, date: string) => FloorSnapshot | Promise<FloorSnapshot>
  myBookings?: () => MyBooking[]
}

/** Registers handlers for floors, snapshots, and "my bookings", counting snapshot calls. */
export function mockBackend({ snapshot, myBookings = () => [] }: BackendOptions) {
  const calls = { snapshot: 0 }
  server.use(
    http.get('*/api/floors', () => HttpResponse.json(FLOORS)),
    http.get('*/api/floors/:id/snapshot', async ({ params, request }) => {
      calls.snapshot++
      const date = new URL(request.url).searchParams.get('date') ?? ''
      return HttpResponse.json(await snapshot!(Number(params.id), date))
    }),
    http.get('*/api/bookings/me', () => HttpResponse.json(myBookings())),
  )
  return calls
}

export function renderApp(socket = new FakeSocket()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  const result = render(<App createSocket={() => socket} queryClient={queryClient} />)
  return { ...result, socket, user, queryClient }
}

/** Sends socket messages and waits past the next animation frame so the batch is applied. */
export async function emit(socket: FakeSocket, ...updates: DeskUpdate[]) {
  await act(async () => {
    for (const update of updates) socket.emit(floorTopic(1, update.date ?? TODAY), update)
    await new Promise((resolve) => setTimeout(resolve, 40))
  })
}

/** The grid button for a desk label like "A2", whatever its status. */
export function desk(label: string) {
  return within(screen.getByRole('grid')).getByRole('button', { name: new RegExp(`^Desk ${label},`) })
}

export function announcer() {
  return screen.getByRole('status')
}

export function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
