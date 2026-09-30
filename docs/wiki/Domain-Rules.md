# Domain Rules

## Bookings

- A booking is **(desk, date, employee)** and covers the whole day.
- A desk can have **at most one booking per day**.
- An employee can hold **at most one booking per day**.
- Bookings are allowed from today up to 14 days ahead. Past dates are rejected.
- Only cells of type `DESK` can be booked.
- Employees can cancel only their own bookings.

## The spacing rule

On the same floor and date, **no two booked desks may be neighbours**.

Each floor has a `neighbour_mode` that decides which desks count as neighbours.

### `ORTHOGONAL` (default)

The 4 desks sharing an edge: above, below, left, and right.

```
 .  N  .
 N  X  N
 .  N  .
```

### `ALL`

All 8 surrounding desks, including diagonals.

```
 N  N  N
 N  X  N
 N  N  N
```

`X` is the desk being booked, and `N` marks its neighbours.

### Edges, corners, and non-desk cells

- Desks on an edge or in a corner simply have fewer neighbours. A corner desk has 2 orthogonal neighbours, or 3 in `ALL` mode.
- Walkways, walls, and meeting rooms are **never neighbours**. A desk whose only adjacent cells are walkways has no neighbours.
- Neighbours are computed in **one place**, the neighbour policy, which reads the mode from the floor. Nothing else hard-codes either mode.

## Worked example (`ORTHOGONAL`)

```
     c0   c1   c2
r0   D    D    D
r1   D    [B]  D
r2   D    D    —
```

`[B]` is booked and `—` is a walkway.
- Booking `r0 c1`, `r1 c0`, `r1 c2`, or `r2 c1` is rejected with `SPACING_VIOLATION`, because each is directly next to `[B]`.
- Booking `r0 c0` is allowed in `ORTHOGONAL` mode but rejected in `ALL` mode, because it's diagonal to `[B]`.

## Error codes

| Code | HTTP | When |
|---|---|---|
| `DESK_TAKEN` | 409 | The desk is already booked for that date |
| `SPACING_VIOLATION` | 409 | A neighbouring desk is booked for that date |
| `ALREADY_BOOKED_TODAY` | 409 | The employee already has a booking that date |
| `INVALID_DATE` | 400 | The date is in the past or beyond the booking window |
| `NOT_A_DESK` | 400 | The cell isn't bookable |
| `FORBIDDEN` | 403 | Cancelling someone else's booking |
| `NOT_FOUND` | 404 | The desk or booking doesn't exist |

The server is the only authority on these rules. The frontend may check the spacing rule early to warn the user, but it never replaces the server's check.
