import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, queryKeys } from '../../api/endpoints'
import { friendlyMessage } from '../../api/errors'
import type { CurrentUser } from '../../auth/session'
import { AnnouncerProvider } from '../../components/Announcer'
import { bookableDates, formatDay } from '../bookings/dates'
import { MyBookings } from '../bookings/MyBookings'
import { useBookingActions } from '../bookings/useBookingActions'
import { ConnectionIndicator } from './ConnectionIndicator'
import { FloorStoreContext, useConnectionStatus, useFloorStore, useSocket } from './context'
import { FloorGrid } from './FloorGrid'
import { Legend } from './Legend'
import { createFloorStore } from './store'
import { useFloorFeed } from './useFloorFeed'

interface FloorPageProps {
  user: CurrentUser
  onSignOut: () => void
}

export function FloorPage({ user, onSignOut }: FloorPageProps) {
  const [store] = useState(() => createFloorStore(user.username))
  return (
    <FloorStoreContext.Provider value={store}>
      <AnnouncerProvider>
        <FloorView user={user} onSignOut={onSignOut} />
      </AnnouncerProvider>
    </FloorStoreContext.Provider>
  )
}

function FloorView({ user, onSignOut }: FloorPageProps) {
  const [dates] = useState(() => bookableDates())
  const [date, setDate] = useState(dates[0])
  const [chosenFloorId, setChosenFloorId] = useState<number | null>(null)
  const floors = useQuery({ queryKey: queryKeys.floors, queryFn: api.floors })
  const floorId = chosenFloorId ?? floors.data?.[0]?.id ?? null
  const floor = floors.data?.find((f) => f.id === floorId)

  const socket = useSocket()
  const connection = useConnectionStatus(socket)
  const resync = useFloorFeed(floorId, date)
  const actions = useBookingActions(floorId, date, resync)

  return (
    <div className="app">
      <header className="page-header">
        <h1>Hot-Desking Map</h1>
        <div className="page-header__user">
          <span>Signed in as {user.displayName}</span>
          <button type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="toolbar">
        <label>
          Floor
          <select
            value={floorId ?? ''}
            disabled={!floors.data?.length}
            onChange={(e) => setChosenFloorId(Number(e.target.value))}
          >
            {floors.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Day
          <select value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d, i) => (
              <option key={d} value={d}>
                {formatDay(d)}
                {i === 0 ? ' (today)' : ''}
              </option>
            ))}
          </select>
        </label>
        <ConnectionIndicator status={connection} />
      </div>

      <div className="layout">
        <main className="floor">
          {floors.isPending ? (
            <p>Loading floors…</p>
          ) : floors.isError ? (
            <p role="alert">
              {friendlyMessage(floors.error)}{' '}
              <button type="button" onClick={() => void floors.refetch()}>
                Retry
              </button>
            </p>
          ) : !floor ? (
            <p>No floors are set up yet.</p>
          ) : (
            <FloorBody
              label={`${floor.name}, ${formatDay(date)}`}
              onActivate={actions.activate}
              onRetry={resync}
            />
          )}
        </main>
        <aside>
          <MyBookings onCancel={actions.cancelBooking} />
        </aside>
      </div>
    </div>
  )
}

interface FloorBodyProps {
  label: string
  onActivate: (deskId: number) => void
  onRetry: () => void
}

function FloorBody({ label, onActivate, onRetry }: FloorBodyProps) {
  const phase = useFloorStore((s) => s.phase)
  const error = useFloorStore((s) => s.error)

  if (phase === 'idle' || phase === 'loading') return <p>Loading the floor map…</p>
  if (phase === 'error') {
    return (
      <p role="alert">
        {error}{' '}
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </p>
    )
  }
  return (
    <>
      {error && (
        <p className="banner banner--warning">
          Couldn't refresh the map: {error}{' '}
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      <h2 className="floor__title">{label}</h2>
      <Legend />
      <div className="floor-grid-scroll">
        <FloorGrid label={`Desks on ${label}`} onActivate={onActivate} />
      </div>
    </>
  )
}
