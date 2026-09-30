# backend/CLAUDE.md

Guidance for the Spring Boot backend. The domain rules and the rules every fix must follow are in the root `CLAUDE.md`.

## Commands

The backend hasn't been scaffolded yet. Once it is, list the real commands here. The planned commands, run from `backend/`, are:

- Build and run all tests: `./mvnw verify` (Testcontainers needs Docker running)
- Run one test class: `./mvnw test -Dtest=BookingServiceTest`
- Run one test method: `./mvnw test -Dtest=BookingServiceTest#rejectsNeighbourBooking`
- Run the app: `docker compose up -d` from the repo root, then `./mvnw spring-boot:run`

## Planned structure

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
