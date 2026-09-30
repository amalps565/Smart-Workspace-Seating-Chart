# Changelog: Frontend

All notable changes to the frontend (`frontend/`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `frontend/CLAUDE.md` with the planned commands, structure, and conventions for the React + TypeScript frontend.
- Vite + React + TypeScript app with oxlint, Vitest, and Testing Library, plus `typecheck`, `lint`, `test`, and `build` scripts. (#1)
- Development proxy from `/api` and `/ws` to the backend on port 8080. (#1)
- A placeholder home page with a smoke test, and a CI job that runs type-check, lint, tests, and build. (#1)
