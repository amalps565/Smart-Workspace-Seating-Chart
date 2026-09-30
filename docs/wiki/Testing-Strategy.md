# Testing Strategy

> *Planned.* Test commands are listed in `backend/CLAUDE.md` and `frontend/CLAUDE.md` once the code exists.

## Test levels

| Level | Tool | What it covers |
|---|---|---|
| Backend unit | JUnit 5 | The neighbour policy in both modes: edges, corners, non-desk cells |
| Backend integration | JUnit 5 + **Testcontainers PostgreSQL** | Booking and cancel rules, every error code, constraints, authorization |
| Backend concurrency | JUnit 5 + Testcontainers | The race fix (recipe below) |
| Frontend unit | Vitest + Testing Library + MSW | Store rules, cell rendering, optimistic booking and rollback |
| End to end | Playwright | Critical flows across the real backend and database |

Integration and concurrency tests never use H2. Its locking behaves differently from PostgreSQL's.

## Concurrency test recipe

The race fix isn't done until this passes repeatedly against real PostgreSQL.

1. Seed a floor, a set of users, and a target date.
2. Create N threads (for example 20), each with its own user.
3. Hold every thread at a `CountDownLatch` start gate, then release them together.
4. **Scenario A, same desk:** every thread books the same desk.
5. **Scenario B, neighbouring desks:** threads book a desk *and its neighbours*.
6. Assert:
   - Scenario A: exactly one booking exists, and every other request got `409 DESK_TAKEN`.
   - Scenario B: no two booked desks on the floor and date are neighbours. Every rejected request got a 409, and there were no 500s or deadlocks.
7. Repeat each scenario many times (for example 50) with `@RepeatedTest`. One pass proves little.

Scenario B is the real write-skew race. Scenario A alone would pass with just a unique constraint.

## Backend integration cases

- Every error code in [[Domain Rules]], each with its HTTP status and body.
- Both neighbour modes, and a desk surrounded only by walkways.
- Cancelling someone else's booking → 403. Unauthenticated requests → 401.
- The WebSocket publishes after commit, and a rolled-back booking publishes nothing.

## Frontend cases

- Socket updates arriving out of order or twice: the older `seq` is ignored.
- After a reconnect, the snapshot reloads and the map is correct.
- An optimistic booking that gets a 409 rolls back and shows the reason.
- A single desk update re-renders only the affected cells.
- Keyboard navigation and `aria-live` announcements.

## End-to-end cases

- **Two browser contexts race for neighbouring desks.** One wins, and the other sees the conflict message and the updated map.
- Booking in one browser appears in the other within moments.
- Cancelling frees the desk in both browsers.

## Test quality rules

- Tests are deterministic: no `sleep` waits, no real clock or network dependence, and data is seeded explicitly.
- A test for a bug fails before the fix and passes after it.
- Flaky tests get their cause fixed. Don't add retries or skip them.
