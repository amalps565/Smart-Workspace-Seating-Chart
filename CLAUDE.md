# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An interactive Office Hot-Desking Map: employees see a floor as a grid of desks with live statuses and click to reserve one for the day. See `README.md` for the problem statement, decisions, and tech stack.

The repository doesn't contain application code yet, so there are no build, lint, or test commands. When the code arrives, add the real commands here, including how to run a single backend and frontend test, and update the planned architecture below to match what was built.

## Domain rules

- A booking is `(desk, date, employee)` for a whole day.
- The database enforces uniqueness on `(desk_id, date)` and on `(employee_id, date)`.
- **Spacing rule:** on the same floor and date, no two booked desks may be neighbours. Each floor's `neighbour_mode` defines neighbours: `ORTHOGONAL` (4 sides, default) or `ALL` (8 surrounding desks). Neighbour logic lives in one place and reads the mode from the floor; don't hard-code either mode.
- Non-desk cells (walkways, walls, meeting rooms) are never bookable and never count as neighbours.
- Users sign in with a JWT and can cancel only their own bookings.

## Known problems to fix

1. **Adjacent-seat race condition (write skew).** A booking is validated against its neighbouring desks and then saved. Two concurrent bookings of *neighbouring* desks can both pass validation and both commit. A unique constraint or lock on the target desk alone doesn't fix this, because the conflicting requests touch different rows.
2. **Spacing rule not enforced.** The backend accepts bookings that break the rule above.
3. **Frontend grid doesn't update smoothly.** Status changes don't reach open maps promptly, or they cause the whole grid to re-render instead of just the changed cells.

## Rules any fix must follow

- **The server is the only authority on whether a booking is valid.** The frontend may check the spacing rule early to warn the user, but it must never be the only check.
- **Check and save the booking as one atomic step, covering the target desk and its neighbours.** In a single transaction, lock the target desk row and its neighbour rows with `SELECT ... FOR UPDATE`, always in ascending desk-ID order to avoid deadlocks. Then check for existing bookings on those desks for that date, and insert. Two bookings for neighbouring desks share locked rows, so one waits for the other. Locking a per-floor-per-date row is an acceptable alternative. Don't use in-memory locks, because they don't hold across multiple server instances.
- **Reject conflicts clearly.** A booking that breaks the spacing rule, loses a race, or violates a unique constraint gets HTTP 409 with a reason the user can understand. Catch constraint violations and translate them; never let them surface as a 500 error.
- **Publish status changes only after the database transaction commits** (`@TransactionalEventListener(phase = AFTER_COMMIT)`), so clients never see a booking that was rolled back.
- **Send changes as small updates with a version number per desk.** Clients apply only updates newer than what they already have, and reload the full floor snapshot after reconnecting.
- **Update only the changed cells.** Keep desk state keyed by desk ID and render each cell independently, so one change re-renders one cell.
- **Prove race fixes with a concurrency test:** fire simultaneous requests for the same desk *and* for neighbouring desks on the same date, run the test many times, and assert that exactly one wins and the spacing rule still holds.

## Planned architecture

**Backend (`backend/`, Spring Boot)**
- Layers: REST controllers → services (own the transactions and booking rules) → Spring Data JPA repositories. Controllers use DTOs and never expose entities.
- Schema changes go through Flyway migrations, never `ddl-auto`. Seed data (demo users and a sample floor) also goes in migrations.
- A booking service performs the locked check-and-save described above.
- After commit, a WebSocket (STOMP) publisher sends per-desk updates to a per-floor topic, with the desk ID, date, status, and version.
- Spring Security validates the JWT on REST calls and on the WebSocket handshake.

**Frontend (`frontend/`, React + TypeScript + Vite)**
- A floor store holds desks normalized by ID. It's loaded from a REST snapshot, then patched by socket updates, ignoring any update older than the stored version.
- The grid renders memoized cell components, and each cell reads only its own desk.
- Bookings show optimistically. If the server rejects one with a 409, the cell rolls back and the UI shows the reason.
- Cells work with the keyboard, and status isn't shown by colour alone.

**Testing**
- Backend: JUnit 5 with Testcontainers PostgreSQL (not H2) for integration and concurrency tests.
- Frontend: Vitest and Testing Library, with a mocked socket for out-of-order and reconnect cases.
- End to end: Playwright, including two browser contexts competing for neighbouring desks.
