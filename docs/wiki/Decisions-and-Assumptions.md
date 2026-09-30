# Decisions and Assumptions

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Backend | Java 21, Spring Boot 3 | Mature transaction, locking, and WebSocket support |
| Frontend | React + TypeScript + Vite | Fine-grained rendering control for a live grid |
| Database | PostgreSQL via Docker Compose | Real row locking (`SELECT ... FOR UPDATE`) and constraints, which the race fix depends on |
| Integration tests | Testcontainers PostgreSQL, not H2 | H2's locking differs from Postgres, so race tests against it prove little |
| Booking period | Whole day | Simplest conflict model; one booking per desk per day |
| Bookings per employee | At most one per day | Enforced by a unique constraint |
| Neighbours | Configurable per floor: `ORTHOGONAL` (default) or `ALL` | Different floors can need different spacing |
| Sign-in | Username and password → JWT, with seeded demo users | Per-user security without an external identity provider |
| Live updates | STOMP over WebSocket, per-desk updates with a version | Small messages, ordered per desk, easy to resync |

## Assumptions

These were assumed to keep the scope clear. Change them here and in the repo `CLAUDE.md` if they turn out to be wrong.

- **Date** means the office's local date, set as a single time zone in configuration.
- **Booking window:** from today up to 14 days ahead. Past dates are rejected.
- **Floors** are created only through seed data. There's no admin screen for editing floors.
- **Cancelling** a booking deletes it. Users can cancel only their own bookings.
