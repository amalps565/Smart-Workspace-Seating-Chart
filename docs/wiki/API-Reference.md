# API Reference

> *Planned.* This is the agreed contract. The backend and frontend both depend on it, so any change must update both sides in the same PR.

All endpoints except login need `Authorization: Bearer <jwt>`. Dates are `YYYY-MM-DD` in the office's time zone.

## Error body

Every error returns the same shape:

```json
{ "code": "SPACING_VIOLATION", "message": "A neighbouring desk is already booked for 2026-10-02." }
```

See [[Domain Rules]] for all error codes.

## Endpoints

### `POST /api/auth/login`

Request:
```json
{ "username": "alice", "password": "..." }
```
Responses:
- `200` with `{ "token": "<jwt>" }`
- `401` for invalid credentials

### `GET /api/floors`

Lists floors.

```json
[{ "id": 1, "name": "Floor 3", "rows": 8, "cols": 12, "neighbourMode": "ORTHOGONAL" }]
```

### `GET /api/floors/{id}/snapshot?date=YYYY-MM-DD`

Returns the whole grid for one date, plus the current version of each desk.

```json
{
  "floorId": 1,
  "date": "2026-10-02",
  "rows": 8,
  "cols": 12,
  "neighbourMode": "ORTHOGONAL",
  "cells": [
    { "id": 101, "row": 0, "col": 0, "type": "DESK", "label": "3-A1",
      "status": "BOOKED", "bookedBy": "Alice", "bookingId": 555, "seq": 1042 },
    { "id": 102, "row": 0, "col": 1, "type": "WALKWAY" }
  ]
}
```

`bookingId` is included only on your own booking, so you can cancel it.

### `POST /api/bookings`

Request:
```json
{ "deskId": 101, "date": "2026-10-02" }
```

| Status | Code | Meaning |
|---|---|---|
| `201` | | Booked. The body is the booking. |
| `400` | `INVALID_DATE`, `NOT_A_DESK` | The request can't be booked |
| `404` | `NOT_FOUND` | Unknown desk |
| `409` | `DESK_TAKEN` | The desk is already booked that day |
| `409` | `SPACING_VIOLATION` | A neighbour is booked that day |
| `409` | `ALREADY_BOOKED_TODAY` | You already have a booking that day |

### `DELETE /api/bookings/{id}`

| Status | Meaning |
|---|---|
| `204` | Cancelled |
| `403` | Not your booking |
| `404` | No such booking |

### `GET /api/bookings/me`

Returns your bookings from today onward.

## WebSocket

See [[Real-Time Updates]].
