# Smart Workspace Seating Chart

An interactive **Office Hot-Desking Map**. Employees see an office floor as a grid of desks, watch desk statuses change in real time, and click a desk to reserve it for the day.

📖 The full design (architecture, data model, booking concurrency, API, and workflow) is in the [project wiki](https://github.com/amalps565/Smart-Workspace-Seating-Chart/wiki).

## Features

- **Floor grid:** each floor is a matrix of cells (rows × columns). A cell is a desk or a non-bookable space such as a walkway, wall, or meeting room.
- **Live desk status:** every open map shows each desk as available, reserved, or blocked, and updates as soon as anyone makes or cancels a booking.
- **Click to reserve:** employees pick a desk on the map and get an immediate result: confirmed, or rejected with a reason.

## Decisions

- **Booking period:** a reservation covers a whole day. A desk can have at most one booking per day, and an employee can hold at most one booking per day.
- **Spacing rule:** two desks that are neighbours can't both be booked on the same day. Each floor sets which desks count as neighbours:
  - `ORTHOGONAL` (default): the 4 desks above, below, left, and right.
  - `ALL`: all 8 surrounding desks, including diagonals.
- **Sign-in:** simple username and password login that issues a JWT. The app comes with seeded demo users. Employees can cancel only their own bookings.

## Tech stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Backend  | Java 21, Spring Boot 4, Spring Data JPA, Flyway, Spring Security (JWT), WebSocket (STOMP) |
| Frontend | React, TypeScript, Vite                                     |
| Database | PostgreSQL, run with Docker Compose                         |
| Testing  | JUnit 5 and Testcontainers (backend); Vitest and Testing Library (frontend); Playwright (end to end) |

## Structure

```
backend/             Spring Boot app (Maven wrapper), Flyway migrations and seed data
frontend/            React + TypeScript app (Vite)
e2e/                 Playwright end-to-end tests (own package)
docker-compose.yml   PostgreSQL for local development
.github/workflows/   CI: backend, frontend, and end-to-end jobs
```

## The three problems and how they're solved

### 1. Adjacent-seat race conditions ✅ ([#5](https://github.com/amalps565/Smart-Workspace-Seating-Chart/issues/5))

**Problem:** two employees reserving **neighbouring** desks at the same moment could both pass the spacing check before either was saved, so both succeeded. This is a *write skew* race: the requests touch different rows, so a unique constraint or a lock on only the booked desk can't stop it.

**Fix:** the booking runs as one transaction that locks the target desk **and its neighbours** (`SELECT ... FOR UPDATE`, in ascending desk-ID order to avoid deadlocks). It then checks for bookings on that date and inserts. Two bookings for neighbouring desks share locked rows, so the second waits and then gets `409 SPACING_VIOLATION`. A concurrency test fires simultaneous requests against real PostgreSQL and repeats them many times. Without the locks it failed 48 of 50 runs; with them every run passes.

### 2. Invalid spatial isolation selections ✅ ([#4](https://github.com/amalps565/Smart-Workspace-Seating-Chart/issues/4))

**Problem:** the backend accepted bookings next to an already-reserved desk.

**Fix:** a single neighbour policy reads each floor's `neighbour_mode`: `ORTHOGONAL` (4 sides) or `ALL` (8 including diagonals). Walkways, walls, and rooms never count as neighbours. The server rejects violations with `409 SPACING_VIOLATION`, `DESK_TAKEN`, or `ALREADY_BOOKED_TODAY`. The frontend shows "Too close to a booked desk" early, but the server's check is what counts.

### 3. No fluid matrix updates on the frontend ✅ ([#6](https://github.com/amalps565/Smart-Workspace-Seating-Chart/issues/6), [#7](https://github.com/amalps565/Smart-Workspace-Seating-Chart/issues/7))

**Problem:** the map needed a refresh to show changes, or redrew the whole grid for one desk.

**Fix:**
- After each booking or cancel commits, the server sends one small WebSocket (STOMP) message for the changed desk, carrying a version number (`seq`).
- The browser keeps desks by ID and ignores any update that isn't newer than what it has. It reloads the floor after a reconnect.
- Each desk is its own memoized cell, so one change redraws one cell.
- Bookings show instantly and roll back with a clear reason if the server rejects them.

## Getting started

### Prerequisites

- JDK 21 (for example Eclipse Temurin). Maven isn't needed; the backend ships the Maven wrapper.
- Node.js 24 with npm.
- Docker with Docker Compose, for PostgreSQL and for the backend's Testcontainers tests.

### Run the app

```sh
git clone https://github.com/amalps565/Smart-Workspace-Seating-Chart.git
cd Smart-Workspace-Seating-Chart

# 1. PostgreSQL 17 on localhost:5432 (database, user, and password: seating)
docker compose up -d --wait

# 2. Backend on http://localhost:8080 (Flyway creates the schema and seed data on first start)
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run

# 3. Frontend on http://localhost:5173, in a second terminal
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a seeded user: `alice`, `bob`, `carol`, `dave`, or `erin`, all with the password `password`. Floor 3 (8 × 12, `ORTHOGONAL` neighbours, a walkway down the middle) and Floor 4 (4 × 6, `ALL` neighbours) are seeded. Open a second browser (or a private window) as another user to watch bookings update live.

The Vite dev server forwards `/api` and `/ws` to the backend. The backend reads these environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/seating` | Database URL |
| `DB_USERNAME` / `DB_PASSWORD` | `seating` / `seating` | Database credentials |
| `JWT_SECRET` | a dev-only value | JWT signing key (at least 32 bytes); always set it outside local development |
| `BOOKING_ZONE` | `UTC` | The office time zone that defines "today" |

Bookings are open from today up to 14 days ahead. To stop PostgreSQL, run `docker compose down` (add `-v` to delete its data).

### Troubleshooting: port 5432 is already in use

If another PostgreSQL is already running on port 5432 (for example a local Windows service), the backend connects to it and fails with `password authentication failed for user "seating"`. You have two options.

- **Run Compose on another port:**
  ```sh
  POSTGRES_PORT=5433 docker compose up -d --wait
  DB_URL=jdbc:postgresql://localhost:5433/seating ./mvnw spring-boot:run
  ```
  In PowerShell, set `$env:POSTGRES_PORT="5433"` and `$env:DB_URL="jdbc:postgresql://localhost:5433/seating"` first.
- **Skip Compose:** run `./mvnw spring-boot:test-run` in `backend/`. It starts the backend with its own throwaway Testcontainers PostgreSQL. It needs Docker, and its data is lost when it stops.

### Run the tests

| Suite | Where | Command | Needs |
| --- | --- | --- | --- |
| Backend unit, integration, and concurrency tests | `backend/` | `./mvnw verify` | Docker (Testcontainers) |
| Frontend type-check, lint, and unit tests | `frontend/` | `npm run typecheck`, `npm run lint`, `npm test` | |
| End-to-end tests (Playwright, Chromium) | `e2e/` | `npm install`, `npm run install:browsers`, then `npm test` | `docker compose up -d --wait` and `npm install` in `frontend/` |

The end-to-end tests start the backend and the frontend themselves, or reuse ones that are already running. Set `PLAYWRIGHT_BROWSERS_PATH=./.playwright-browsers` for both the browser install and the test run if you want the browser kept inside the repo instead of your user cache. See [`e2e/README.md`](e2e/README.md) for running single tests, debugging, and reports.

CI (`.github/workflows/ci.yml`) runs all three suites on every pull request and push to `main`.
