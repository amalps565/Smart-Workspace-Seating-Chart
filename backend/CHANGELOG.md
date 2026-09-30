# Changelog: Backend

All notable changes to the backend (`backend/`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `backend/CLAUDE.md` with the planned commands, structure, and conventions for the Spring Boot backend.
- Spring Boot 4.1 project on Java 21 with the Maven wrapper, with Web MVC, Data JPA, Security, WebSocket, Validation, Flyway, and PostgreSQL. (#1)
- `application.yml` with database settings that can be overridden through environment variables, and a schema owned only by Flyway (`ddl-auto: validate`). (#1)
- Testcontainers PostgreSQL test setup and a smoke test that connects to the database. (#1)
- `docker-compose.yml` with PostgreSQL 17 for local development, and a CI job that runs `./mvnw verify`. (#1)
- Flyway migrations `V1__schema.sql` (`users`, `floors`, `cells`, `bookings`, unique `(desk_id, date)` and `(user_id, date)`, index on `bookings(floor_id, date)`, sequence `desk_status_seq`) and `V2__seed.sql` (five demo users, "Floor 3" 8x12 `ORTHOGONAL` with a walkway column, "Floor 4" 4x6 `ALL`). (#2)
- `POST /api/auth/login` returns `{token, username, displayName}` (HS256 JWT, 8h by default), or 401 `INVALID_CREDENTIALS`. (#2)
- Stateless Spring Security (OAuth2 resource server): every `/api/**` endpoint except login needs a valid bearer token; 401 and 403 use the `{code, message}` body. (#2)
- Shared `@RestControllerAdvice` with `ApiException`, mapping validation errors to 400 `VALIDATION_ERROR` and every error to `{code, message}`. (#2)
- Configuration `app.jwt.secret` (`JWT_SECRET`), `app.jwt.ttl`, `app.booking.zone`, `app.booking.window-days`, and an injectable `Clock` in the office time zone. (#2)
