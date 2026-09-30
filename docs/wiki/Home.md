# Smart Workspace Seating Chart

An interactive **Office Hot-Desking Map**. Employees see an office floor as a grid of desks, watch desk statuses change in real time, and click a desk to reserve it for the day.

> **Status:** design phase. The decisions, contract, and architecture on this wiki are agreed; application code hasn't been scaffolded yet. Anything marked *planned* isn't built.

## The problem

The core booking backend works, but three problems make the map unreliable:

1. **Adjacent-seat race conditions.** Two people booking *neighbouring* desks at the same moment can both succeed, breaking the spacing rule.
2. **Invalid spatial isolation selections.** The backend accepts bookings next to already-reserved desks.
3. **No fluid matrix updates.** The grid doesn't update live, or redraws the whole floor for a single change.

See [[Problem Statement]] for details.

## Wiki pages

**Overview**
- [[Problem Statement]]: the three problems and the expected behavior
- [[Decisions and Assumptions]]: stack, booking rules, and what was assumed
- [[Getting Started]]: prerequisites and planned setup commands
- [[Roadmap]]: milestones from scaffolding to end-to-end tests

**Design**
- [[Architecture]]: how the backend, frontend, and database fit together
- [[Data Model]]: tables, constraints, and versioning
- [[Domain Rules]]: bookings, the spacing rule, and neighbour modes
- [[Booking Concurrency]]: the write-skew race and how locking fixes it
- [[API Reference]]: REST endpoints and error codes
- [[Real-Time Updates]]: the WebSocket contract and client resync
- [[Frontend Design]]: the store, grid rendering, optimistic booking, accessibility

**Process**
- [[Testing Strategy]]: test levels and the concurrency test recipe
- [[Development Workflow]]: issues, branches, PRs, Claude Code skills and agents

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Backend  | Java 21, Spring Boot 3, Spring Data JPA, Flyway, Spring Security (JWT), WebSocket (STOMP) |
| Frontend | React, TypeScript, Vite, TanStack Query, `@stomp/stompjs` |
| Database | PostgreSQL (Docker Compose) |
| Testing  | JUnit 5 + Testcontainers, Vitest + Testing Library, Playwright |
