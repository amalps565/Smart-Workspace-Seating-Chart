# Roadmap

Each milestone is its own branch and PR.

| # | Branch | Deliverable | Fixes |
|---|---|---|---|
| 0 | `chore/scaffold` | `docker-compose.yml` (PostgreSQL); Spring Boot app (Web, JPA, Security, WebSocket, Validation, Flyway, Testcontainers); Vite React app; `.gitattributes`; GitHub Actions CI | |
| 1 | `feat/schema-auth` | Flyway migrations and seed data; JWT login; security configuration | |
| 2 | `feat/floor-snapshot` | `GET /api/floors` and the floor snapshot endpoint | |
| 3 | `feat/booking-rules` | Neighbour policy; locked booking and cancel; 409 error mapping; **concurrency tests** | Problems 1 and 2 |
| 4 | `feat/live-updates` | STOMP config; after-commit publisher; JWT check on WebSocket | Problem 3 (server side) |
| 5 | `feat/frontend-grid` | Login; floor grid; desk store; socket client; optimistic booking with rollback; accessibility | Problem 3 (client side) |
| 6 | `chore/e2e-docs` | Playwright tests; real commands in `README.md`, the `CLAUDE.md` files, and [[Getting Started]] | |

## Status

| Done | Item |
|---|---|
| ✅ | Problem statement and decisions (`README.md`) |
| ✅ | Shared rules and API contract (`CLAUDE.md`), per-part guidance (`backend/CLAUDE.md`, `frontend/CLAUDE.md`) |
| ✅ | Claude Code skills and agents (`.claude/`), `.gitignore`, changelogs |
| ⬜ | Milestone 0: scaffolding |
