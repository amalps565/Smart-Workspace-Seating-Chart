# backend/CLAUDE.md

Guidance for the Spring Boot backend. The domain rules and the rules every fix must follow are in the root `CLAUDE.md`.

## Commands

Spring Boot 4.1 on Java 21, built with the Maven wrapper (no local Maven needed). Run from `backend/`:

- Build and run all tests: `./mvnw verify` (Testcontainers needs Docker running)
- Compile only: `./mvnw test-compile`
- Run one test class: `./mvnw test -Dtest=ApplicationSmokeTest`
- Run one test method: `./mvnw test -Dtest=ApplicationSmokeTest#contextLoadsAndConnectsToPostgres`
- Run the app against Compose PostgreSQL: `docker compose up -d` from the repo root, then `./mvnw spring-boot:run` (port 8080)
- Run the app against a throwaway Testcontainers database: `./mvnw spring-boot:test-run` (uses `TestSeatingApplication`)

The database connection defaults to the Compose values (`seating`/`seating` on `localhost:5432`). Override it with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.

Base package: `com.smartworkspace.seating`. Integration tests extend `IntegrationTest` (Testcontainers PostgreSQL via `TestcontainersConfiguration`, MockMvc), so they share one application context and one container. The PostgreSQL image must match `docker-compose.yml`.

## Configuration

- `app.jwt.secret` (env `JWT_SECRET`): HMAC-SHA256 signing key, at least 32 bytes. The default in `application.yml` is for local development only.
- `app.jwt.ttl` (env `JWT_TTL`, default `8h`): token lifetime.
- `app.booking.zone` (env `BOOKING_ZONE`, default `UTC`): the office time zone that defines "today". Inject the `Clock` bean instead of calling `now()`.
- `app.booking.window-days` (default `14`): bookings are allowed from today up to this many days ahead.

## Demo users

Seeded by `V2__seed.sql`. Every password is `password`.

| Username | Display name |
|---|---|
| `alice` | Alice Anders |
| `bob` | Bob Brown |
| `carol` | Carol Chen |
| `dave` | Dave Diaz |
| `erin` | Erin Evans |

Seeded floors: "Floor 3" (8 rows x 12 cols, `ORTHOGONAL`, column 6 is a walkway, desks labelled `3-A1` to `3-H12`) and "Floor 4" (4 x 6, all desks, `ALL`).

## Structure

- Layers: REST controllers → services (own transactions and booking rules) → Spring Data JPA repositories.
- Controllers use DTOs (records) and never expose entities.
- One neighbour policy computes neighbours from the floor's `neighbour_mode`. Nothing else implements neighbour logic.
- The booking service performs the locked check-and-save described in the root `CLAUDE.md`.
- One exception handler (`@RestControllerAdvice`) maps domain errors and constraint violations to the `{code, message}` body: 400, 403, 404, or 409.
- After commit, a WebSocket (STOMP) publisher sends desk updates to `/topic/floors/{floorId}/{date}`.
- Spring Security validates the JWT on REST calls and on the STOMP connection.

## Conventions

- Schema and seed data (demo users, sample floor) change only through Flyway migrations in `src/main/resources/db/migration`. Never edit a merged migration; add a new one. Never use `ddl-auto` for the schema.
- Integration and concurrency tests use Testcontainers PostgreSQL, never H2.
- Keep local-only configuration in `application-local.yml`, which is gitignored.
- Record every notable backend change under `## [Unreleased]` in `backend/CHANGELOG.md`, in the same PR. Use the Keep a Changelog sections (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`), and call out API or WebSocket contract changes explicitly.
