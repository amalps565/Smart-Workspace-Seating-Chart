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

## Known problems

The core backend works, but three problems need fixing before the map is reliable.

### 1. Adjacent-seat race conditions

Each booking is checked against the desks next to it before it's saved. When two employees reserve **neighbouring** desks for the same day at the same moment, both requests can pass that check before either is saved, so both succeed and the spacing rule is broken. This is a *write skew* race: the two requests touch different rows, so locking or constraining only the desk being booked doesn't stop it.

**Expected:** among conflicting concurrent requests, exactly one succeeds and the others are rejected with a clear conflict error.

### 2. Invalid spatial isolation selections

The backend accepts reservations that break the spacing rule, for example booking a desk next to one that's already reserved for the same day.

**Expected:** the server rejects every booking that would place two booked desks next to each other on the same day, using the floor's neighbour setting (`ORTHOGONAL` or `ALL`). The frontend may also warn early, but the server's check is what counts.

### 3. No fluid matrix updates on the frontend

The map doesn't update smoothly when desk statuses change. It needs a refresh, or it re-renders the whole grid instead of just the changed desk.

**Expected:** status changes reach every open map within moments and update only the affected cells. The map recovers correctly after a dropped connection, and shows no booking that the server rolled back or rejected.

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

### Run the tests

| Suite | Where | Command | Needs |
| --- | --- | --- | --- |
| Backend unit, integration, and concurrency tests | `backend/` | `./mvnw verify` | Docker (Testcontainers) |
| Frontend type-check, lint, and unit tests | `frontend/` | `npm run typecheck`, `npm run lint`, `npm test` | |
| End-to-end tests (Playwright, Chromium) | `e2e/` | `npm install`, `npm run install:browsers`, then `npm test` | `docker compose up -d --wait` and `npm install` in `frontend/` |

The end-to-end tests start the backend and the frontend themselves, or reuse ones that are already running. Set `PLAYWRIGHT_BROWSERS_PATH=./.playwright-browsers` for both the browser install and the test run if you want the browser kept inside the repo instead of your user cache. See [`e2e/README.md`](e2e/README.md) for running single tests, debugging, and reports.

CI (`.github/workflows/ci.yml`) runs all three suites on every pull request and push to `main`.
