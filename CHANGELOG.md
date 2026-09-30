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

### Changed
- Backend stack moved from Spring Boot 3 to Spring Boot 4.1 in `README.md`, `CLAUDE.md`, and the Java agent, because Spring Initializr no longer offers 3.x. (#1)
