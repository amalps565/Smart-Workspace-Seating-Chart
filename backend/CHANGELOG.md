# Changelog: Backend

All notable changes to the backend (`backend/`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `backend/CLAUDE.md` with the planned commands, structure, and conventions for the Spring Boot backend. (d198190)
- Spring Boot 4.1 project on Java 21 with the Maven wrapper, with Web MVC, Data JPA, Security, WebSocket, Validation, Flyway, and PostgreSQL. (#1)
- `application.yml` with database settings that can be overridden through environment variables, and a schema owned only by Flyway (`ddl-auto: validate`). (#1)
- Testcontainers PostgreSQL test setup and a smoke test that connects to the database. (#1)
- `docker-compose.yml` with PostgreSQL 17 for local development, and a CI job that runs `./mvnw verify`. (#1)
- Flyway migrations `V1__schema.sql` (`users`, `floors`, `cells`, `bookings`, unique `(desk_id, date)` and `(user_id, date)`, index on `bookings(floor_id, date)`, sequence `desk_status_seq`) and `V2__seed.sql` (five demo users, "Floor 3" 8x12 `ORTHOGONAL` with a walkway column, "Floor 4" 4x6 `ALL`). (#2)
- `POST /api/auth/login` returns `{token, username, displayName}` (HS256 JWT, 8h by default), or 401 `INVALID_CREDENTIALS`. (#2)
- Stateless Spring Security (OAuth2 resource server): every `/api/**` endpoint except login needs a valid bearer token; 401 and 403 use the `{code, message}` body. (#2)
- Shared `@RestControllerAdvice` with `ApiException`, mapping validation errors to 400 `VALIDATION_ERROR` and every error to `{code, message}`. (#2)
- Configuration `app.jwt.secret` (`JWT_SECRET`), `app.jwt.ttl`, `app.booking.zone`, `app.booking.window-days`, and an injectable `Clock` in the office time zone. (#2)
- `GET /api/floors` lists floors `{id, name, rows, cols, neighbourMode}`, and `GET /api/floors/{id}/snapshot?date=` returns every cell with the desk `status`, `bookedBy`, `bookedByUsername`, `seq`, and `bookingId` only on the caller's own booking. Returns 400 `INVALID_DATE` outside the booking window or for a malformed date, and 404 `NOT_FOUND` for an unknown floor. A snapshot is one floor lookup plus one join query, whatever the floor size. (#3)
- Testcontainers PostgreSQL startup timeout raised to 4 minutes for slow local Docker VMs. (#3)
- `POST /api/bookings` `{deskId, date}` returns 201 `{id, deskId, floorId, date, seq}`; `DELETE /api/bookings/{id}` returns 204 (403 `FORBIDDEN` for someone else's booking, 404 `NOT_FOUND`); `GET /api/bookings/me` returns `[{id, deskId, deskLabel, floorId, floorName, date}]` from today onward, soonest first. Each booking or cancel takes a new desk version from `desk_status_seq` and stores it in `cells.last_seq`. (#4)

- **WebSocket contract:** STOMP over plain WebSocket (no SockJS) at `/ws`. Clients send `Authorization: Bearer <jwt>` in the STOMP CONNECT headers; a CONNECT without a valid JWT gets an ERROR frame and the connection is closed. Clients may only SUBSCRIBE to `/topic/floors/{floorId}/{date}`, and SEND is rejected. Each booking or cancel publishes one message for the changed desk: `{deskId, date, status, bookedBy, bookedByUsername, seq}`, where `seq` is the same value returned in the `POST /api/bookings` 201 body. Messages are sent only after the transaction commits (`@TransactionalEventListener(phase = AFTER_COMMIT)`), so rejected or rolled-back bookings publish nothing. (#6)
- `app.websocket.allowed-origin-patterns` (default `http://localhost:*`, `http://127.0.0.1:*`) for the WebSocket handshake `Origin` check, and 10-second STOMP heartbeats from the simple broker. (#6)

### Fixed
- The spacing rule is enforced: a booking next to a desk already booked on the same floor and date is rejected with 409 `SPACING_VIOLATION`. Neighbours come from a single `NeighbourPolicy` driven by the floor's `neighbour_mode` (`ORTHOGONAL` or `ALL`); walkways, walls, and rooms never count. Other rejections: 409 `DESK_TAKEN`, 409 `ALREADY_BOOKED_TODAY`, 400 `INVALID_DATE`, 400 `NOT_A_DESK`, 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`. Violations of the `(desk_id, date)` and `(user_id, date)` unique constraints are translated to `DESK_TAKEN` and `ALREADY_BOOKED_TODAY` instead of a 500. (#4)
- Concurrent bookings of neighbouring desks can no longer both succeed (write skew). A booking now locks the target desk and its neighbour desk rows with `SELECT ... FOR UPDATE` in ascending id order before checking and inserting, so conflicting bookings serialise; the loser gets 409 `SPACING_VIOLATION` or `DESK_TAKEN`. Cancelling locks the desk row before deleting and taking the new `seq`. The unique constraints stay as a second line of defence. (#5)
- `BookingConcurrencyTest` releases simultaneous bookings with a `CountDownLatch` start gate against Testcontainers PostgreSQL, repeated 50 times each: same desk, two neighbouring desks, a desk plus all its neighbours in both neighbour modes, and one user booking two desks at once. (#5)
