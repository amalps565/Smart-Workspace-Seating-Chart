import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api, queryKeys } from '../../api/endpoints'
import { friendlyMessage } from '../../api/errors'
import type { MyBooking } from '../../api/types'
import { formatDay } from './dates'

interface MyBookingsProps {
  onCancel: (booking: MyBooking) => Promise<void>
}

export function MyBookings({ onCancel }: MyBookingsProps) {
  const query = useQuery({ queryKey: queryKeys.myBookings, queryFn: api.myBookings })
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set())
  // A ref as well as state, so a fast double click can't start two requests.
  const inFlight = useRef(new Set<number>())

  const cancel = async (booking: MyBooking) => {
    if (inFlight.current.has(booking.id)) return
    inFlight.current.add(booking.id)
    setBusy((prev) => new Set(prev).add(booking.id))
    try {
      await onCancel(booking)
    } finally {
      inFlight.current.delete(booking.id)
      setBusy((prev) => {
        const next = new Set(prev)
        next.delete(booking.id)
        return next
      })
    }
  }

  return (
    <section className="my-bookings" aria-labelledby="my-bookings-heading">
      <h2 id="my-bookings-heading">My bookings</h2>
      {query.isPending ? (
        <p>Loading your bookings…</p>
      ) : query.isError ? (
        <p role="alert">
          {friendlyMessage(query.error)}{' '}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : query.data.length === 0 ? (
        <p>You have no upcoming bookings.</p>
      ) : (
        <ul>
          {query.data.map((booking) => {
            const label = booking.deskLabel ?? String(booking.deskId)
            const isBusy = busy.has(booking.id)
            return (
              <li key={booking.id}>
                <span>
                  <strong>{formatDay(booking.date)}</strong> · Desk {label} · {booking.floorName}
                </span>
                <button
                  type="button"
                  aria-label={`Cancel desk ${label} on ${formatDay(booking.date)}`}
                  aria-disabled={isBusy || undefined}
                  onClick={() => void cancel(booking)}
                >
                  {isBusy ? 'Cancelling…' : 'Cancel'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
