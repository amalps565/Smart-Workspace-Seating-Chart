# Changelog: Repository

Repository-wide changes: docs, Claude Code skills and agents, CI, and tooling. Application changes are in [`backend/CHANGELOG.md`](backend/CHANGELOG.md) and [`frontend/CHANGELOG.md`](frontend/CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Every entry ends with its number: `(#<issue>)` for issue work, `(PR #<n>)` for a PR without an issue, or the short commit hash for early commits made before issues existed.

## [Unreleased]

### Added
- `README.md` with the problem statement, and `CLAUDE.md` with the domain rules and fix rules. (ef63af6)
- Claude Code setup in `.claude/`: the skills `create-issue`, `start-issue`, `pr-review`, and `merge-pr`; the agents `senior-java-engineer`, `senior-frontend-engineer`, and `senior-qa-engineer`; and shared `settings.json` permissions. (d198190)
- Split guidance into the root `CLAUDE.md` (shared rules and the API and WebSocket contract), `backend/CLAUDE.md`, and `frontend/CLAUDE.md`, with a changelog per part and a root `.gitignore`. (d198190)
- API contract details: the 400, 403, and 404 error codes; `bookingId` in the snapshot; subscribe-then-buffer on the client; and the `bookings(floor_id, date)` index. (5906452)
- GitHub wiki with the design docs, linked from `README.md` and `CLAUDE.md`. (083e839)
- `triage-issue` skill. (7af6143)
- `.gitattributes` for LF line endings, `docker-compose.yml` with PostgreSQL 17, and GitHub Actions CI running the backend and frontend checks on every PR and on pushes to `main`. (#1)
- `pr-review` checks for a changelog entry and treats a missing one as blocking. (PR #10)
- This repository changelog, and the rule that every changelog entry ends with its issue or PR number. (PR #15)
- Playwright end-to-end tests in a top-level `e2e/` package (Chromium). They cover login and booking; the spacing rule in both neighbour modes; live updates between two browsers; cancelling from the map and from "My bookings"; and two users racing for neighbouring desks, diagonal desks, and the same desk. (#8)
- `e2e` CI job that runs the end-to-end tests against the real backend, frontend, and PostgreSQL, and uploads the Playwright report on failure. (#8)
- `README.md` sections for getting started, the repository structure, the three test suites, how each of the three problems was solved, and troubleshooting when port 5432 is taken. (#8)
- `POSTGRES_PORT` setting in `docker-compose.yml`, so PostgreSQL can run on another host port when 5432 is taken. (#8)

### Changed
- Backend stack moved from Spring Boot 3 to Spring Boot 4.1 in `README.md`, `CLAUDE.md`, and the Java agent, because Spring Initializr no longer offers 3.x. (#1)
- `CLAUDE.md` lists the `e2e/` commands and the port 5432 workaround, and `frontend/CLAUDE.md` points to `e2e/` for end-to-end tests. (#8)
- `README.md` has a full Troubleshooting section, covering running the app, low memory, and builds and tests, and links to the wiki's Troubleshooting page. It replaces the port-5432-only note. (PR #NUM)
- End-to-end race tests wait up to 30 seconds for a race to settle, instead of the global 10 seconds, so they pass on slow machines. Their time limit now grows with the number of rounds. (#19)
