import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { api, queryKeys } from '../../api/endpoints'
import { ApiError, friendlyMessage } from '../../api/errors'
import type { MyBooking } from '../../api/types'
import { useAnnounce } from '../../components/announce'
import { useFloorStoreApi } from '../floor/context'
import { deriveCellView } from '../floor/store'
import { formatDay } from './dates'

/** Codes after which our view is known to be out of date, so reload the snapshot. */
const RESYNC_STATUSES = new Set([400, 403, 404, 409])

function shouldResync(error: unknown) {
  return error instanceof ApiError && RESYNC_STATUSES.has(error.status)
}

/**
 * Optimistic book and cancel for the floor and date on screen. The store keeps the server
 * state untouched while a request is pending, so rolling back is just dropping the pending mark.
 * After a rejection the pending mark stays until the reconciling snapshot is applied, so the
 * cell goes straight to the server's state instead of flickering through a stale one.
 */
export function useBookingActions(floorId: number | null, date: string, resync: () => Promise<void>) {
  const store = useFloorStoreApi()
  const queryClient = useQueryClient()
  const announce = useAnnounce()

  const refreshMyBookings = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.myBookings }),
    [queryClient],
  )

  const findBookingId = useCallback(
    async (deskId: number): Promise<number | null> => {
      const known = store.getState().desks[deskId]?.bookingId
      if (known) return known
      const match = (list: MyBooking[] | undefined) => list?.find((b) => b.deskId === deskId && b.date === date)?.id ?? null
      const cached = match(queryClient.getQueryData<MyBooking[]>(queryKeys.myBookings))
      if (cached) return cached
      try {
        return match(await queryClient.fetchQuery({ queryKey: queryKeys.myBookings, queryFn: api.myBookings, staleTime: 0 }))
      } catch {
        return null
      }
    },
    [store, queryClient, date],
  )

  const book = useCallback(
    async (deskId: number, label: string) => {
      if (floorId === null) return
      if (!store.getState().markPending(deskId, 'book')) return
      announce(`Booking desk ${label}…`)
      try {
        const booking = await api.book(deskId, date)
        store.getState().confirmBooking(floorId, date, booking)
        announce(`Desk ${label} is booked for you on ${formatDay(date)}.`, 'success')
        void refreshMyBookings()
      } catch (error) {
        announce(`Could not book desk ${label}. ${friendlyMessage(error)}`, 'error')
        if (shouldResync(error)) await resync()
      } finally {
        store.getState().clearPending(deskId)
      }
    },
    [store, floorId, date, announce, refreshMyBookings, resync],
  )

  const cancelOnMap = useCallback(
    async (deskId: number, label: string) => {
      if (floorId === null) return
      if (!store.getState().markPending(deskId, 'cancel')) return
      const seqAtStart = store.getState().pending[deskId].seqAtStart
      try {
        const bookingId = await findBookingId(deskId)
        if (bookingId === null) throw new ApiError(404, 'NOT_FOUND', 'Booking not found')
        await api.cancel(bookingId)
        store.getState().confirmCancel(floorId, date, deskId, seqAtStart)
        announce(`Your booking for desk ${label} is cancelled.`, 'success')
        void refreshMyBookings()
      } catch (error) {
        announce(`Could not cancel desk ${label}. ${friendlyMessage(error)}`, 'error')
        if (shouldResync(error)) await resync()
      } finally {
        store.getState().clearPending(deskId)
      }
    },
    [store, floorId, date, announce, findBookingId, refreshMyBookings, resync],
  )

  /** What a click, Enter, or Space on a cell does. */
  const activate = useCallback(
    (deskId: number) => {
      const view = deriveCellView(store.getState(), deskId)
      const label = view.label ?? String(deskId)
      if (view.pending) return
      switch (view.status) {
        case 'AVAILABLE':
          void book(deskId, label)
          break
        case 'MINE':
          void cancelOnMap(deskId, label)
          break
        case 'BOOKED':
          announce(`Desk ${label} is already booked by ${view.bookedBy ?? 'someone else'}.`)
          break
        case 'BLOCKED_BY_SPACING':
          announce(`Desk ${label} is next to a booked desk, so it can't be booked.`)
          break
        case 'NOT_A_DESK':
          break
      }
    },
    [store, book, cancelOnMap, announce],
  )

  /** Cancel from the "My bookings" list, which may show other floors and dates. */
  const cancelBooking = useCallback(
    async (booking: MyBooking) => {
      const state = store.getState()
      const label = booking.deskLabel ?? String(booking.deskId)
      if (booking.floorId === state.floorId && booking.date === state.date && state.desks[booking.deskId]) {
        await cancelOnMap(booking.deskId, label)
        return
      }
      try {
        await api.cancel(booking.id)
        announce(`Your booking for desk ${label} on ${formatDay(booking.date)} is cancelled.`, 'success')
      } catch (error) {
        announce(`Could not cancel desk ${label}. ${friendlyMessage(error)}`, 'error')
      } finally {
        void refreshMyBookings()
      }
    },
    [store, cancelOnMap, announce, refreshMyBookings],
  )

  return useMemo(() => ({ activate, cancelBooking }), [activate, cancelBooking])
}
