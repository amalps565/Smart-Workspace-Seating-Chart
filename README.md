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

## Planned structure

```
backend/             Spring Boot app (Maven wrapper)
frontend/            React + TypeScript app (Vite)
docker-compose.yml   PostgreSQL for local development
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

Setup, build, and run instructions will be added once the backend and frontend code is in this repository.
