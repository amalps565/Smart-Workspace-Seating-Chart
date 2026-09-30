# Changelog: Frontend

All notable changes to the frontend (`frontend/`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `frontend/CLAUDE.md` with the planned commands, structure, and conventions for the React + TypeScript frontend.
- Vite + React + TypeScript app with oxlint, Vitest, and Testing Library, plus `typecheck`, `lint`, `test`, and `build` scripts. (#1)
- Development proxy from `/api` and `/ws` to the backend on port 8080. (#1)
- A placeholder home page with a smoke test, and a CI job that runs type-check, lint, tests, and build. (#1)
- Login page and a live floor page with floor and day pickers, a connection indicator, a legend, and a "My bookings" list with cancel buttons. (#7)
- Floor store normalized by desk ID that subscribes first, buffers socket updates until the snapshot arrives, applies only updates with a newer `seq`, and reloads the snapshot after every reconnect. (#7)
- Accessible floor grid of memoized desk cells with arrow-key navigation, icon and text for every status, derived `BLOCKED_BY_SPACING` feedback, CSS transitions, batched socket updates, and light and dark themes. (#7)
- Optimistic booking and cancelling with rollback, friendly messages for each error code, and `aria-live` announcements for results, conflicts, and desks taken by others. (#7)
- Vitest tests with MSW and a fake STOMP socket for the store, neighbour rule, login, optimistic booking, rollback, reconnect, keyboard use, and per-cell re-rendering. (#7)
