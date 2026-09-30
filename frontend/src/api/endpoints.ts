import { request } from './http'
import type { CreatedBooking, Floor, FloorSnapshot, LoginResponse, MyBooking } from './types'

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/auth/login', { method: 'POST', body: { username, password }, anonymous: true }),
  floors: () => request<Floor[]>('/api/floors'),
  snapshot: (floorId: number, date: string) =>
    request<FloorSnapshot>(`/api/floors/${floorId}/snapshot?date=${encodeURIComponent(date)}`),
  book: (deskId: number, date: string) =>
    request<CreatedBooking>('/api/bookings', { method: 'POST', body: { deskId, date } }),
  cancel: (bookingId: number) => request<void>(`/api/bookings/${bookingId}`, { method: 'DELETE' }),
  myBookings: () => request<MyBooking[]>('/api/bookings/me'),
}

export const queryKeys = {
  floors: ['floors'] as const,
  myBookings: ['bookings', 'me'] as const,
}
