# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An interactive Office Hot-Desking Map: employees see a floor as a grid of desks with live statuses and click to reserve one for the day. See `README.md` for the problem statement, decisions, and tech stack.

## Repository layout

- `backend/`: Spring Boot app. Commands and conventions are in `backend/CLAUDE.md`.
- `frontend/`: React + TypeScript app. Commands and conventions are in `frontend/CLAUDE.md`.
- `docker-compose.yml`: PostgreSQL for local development (not created yet).
- `.claude/skills/`: workflow skills: `create-issue`, `start-issue`, `pr-review`, `merge-pr`.
- `.claude/agents/`: `senior-java-engineer` (backend), `senior-frontend-engineer` (frontend), `senior-qa-engineer` (tests across both).

Start Claude Code from the repo root so all of these are found. Application code hasn't been scaffolded yet. When it is, update the commands in each part's `CLAUDE.md`.

## Domain rules

- A booking is `(desk, date, employee)` for a whole day.
- The database enforces uniqueness on `(desk_id, date)` and on `(employee_id, date)`.
- **Spacing rule:** on the same floor and date, no two booked desks may be neighbours. Each floor's `neighbour_mode` defines neighbours: `ORTHOGONAL` (4 sides, default) or `ALL` (8 surrounding desks). Neighbour logic lives in one place and reads the mode from the floor; don't hard-code either mode.
- Non-desk cells (walkways, walls, meeting rooms) are never bookable and never count as neighbours.
- Users sign in with a JWT and can cancel only their own bookings.

## API and WebSocket contract

Both sides depend on this. Change it only on purpose, and update both sides in the same PR.

- `POST /api/auth/login` returns a JWT.
- `GET /api/floors` lists floors. `GET /api/floors/{id}/snapshot?date=` returns the grid, desk statuses, and versions.
- `POST /api/bookings` `{deskId, date}` returns 201. Conflicts return 409 with code `DESK_TAKEN`, `SPACING_VIOLATION`, or `ALREADY_BOOKED_TODAY`.
- `DELETE /api/bookings/{id}` returns 204, or 403 if the booking isn't yours. `GET /api/bookings/me` returns your bookings.
- Every error body is `{code, message}`.
- The STOMP topic `/topic/floors/{floorId}/{date}` carries `{deskId, date, status, bookedBy, seq}`. `seq` comes from the Postgres sequence `desk_status_seq` and increases for every change to a desk.

## Known problems to fix

1. **Adjacent-seat race condition (write skew).** A booking is validated against its neighbouring desks and then saved. Two concurrent bookings of *neighbouring* desks can both pass validation and both commit. A unique constraint or lock on the target desk alone doesn't fix this, because the conflicting requests touch different rows.
2. **Spacing rule not enforced.** The backend accepts bookings that break the rule above.
3. **Frontend grid doesn't update smoothly.** Status changes don't reach open maps promptly, or they cause the whole grid to re-render instead of just the changed cells.

## Rules any fix must follow

- **The server is the only authority on whether a booking is valid.** The frontend may check the spacing rule early to warn the user, but it must never be the only check.
- **Check and save the booking as one atomic step, covering the target desk and its neighbours.** In a single transaction, lock the target desk row and its neighbour rows with `SELECT ... FOR UPDATE`, always in ascending desk-ID order to avoid deadlocks. Then check for existing bookings on those desks for that date, and insert. Two bookings for neighbouring desks share locked rows, so one waits for the other. Don't use in-memory locks, because they don't hold across multiple server instances.
- **Reject conflicts clearly** with HTTP 409 and the matching error code. Catch constraint violations and translate them; never let them surface as a 500 error.
- **Publish status changes only after the database transaction commits,** so clients never see a booking that was rolled back.
- **Clients apply only updates newer than the version they already have,** and reload the full floor snapshot after reconnecting.
- **Update only the changed cells.** One desk change re-renders one cell.
- **Prove race fixes with a concurrency test:** fire simultaneous requests for the same desk *and* for neighbouring desks on the same date against Testcontainers PostgreSQL, run the test many times, and assert that exactly one wins and the spacing rule still holds.
- **End-to-end tests** use Playwright with two browser contexts competing for neighbouring desks.

## Assumptions

- "Date" means the office's local date, set as a single time zone in configuration.
- Bookings are allowed from today up to 14 days ahead.
- Floors are created only through seed data; there's no admin screen for floors.
