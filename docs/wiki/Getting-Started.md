# Getting Started

> **The code hasn't been scaffolded yet.** The commands below are *planned* and will be confirmed in milestone 0 (see [[Roadmap]]). Until then, they won't work.

## Prerequisites

- **JDK 21**
- **Node.js** (current LTS) and npm
- **Docker**, needed for PostgreSQL and for Testcontainers in backend tests
- **Git** and the **GitHub CLI** (`gh`), used by the workflow skills
- **Claude Code** (optional), started from the repo root

## Clone

```bash
git clone https://github.com/amalps565/Smart-Workspace-Seating-Chart.git
cd Smart-Workspace-Seating-Chart
```

## Planned: run locally

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Backend (from backend/)
./mvnw spring-boot:run

# 3. Frontend (from frontend/)
npm install
npm run dev
```

Sign in with one of the seeded demo users. Their names will be listed here once the seed migration exists.

## Planned: tests

```bash
# Backend (from backend/, Docker must be running)
./mvnw verify
./mvnw test -Dtest=BookingServiceTest

# Frontend (from frontend/)
npm run typecheck
npm run lint
npm test
npx playwright test
```

## Configuration

- Local-only backend settings go in `backend/src/main/resources/application-local.yml`, which is gitignored.
- Secrets go in `.env` files, which are gitignored. Commit an `.env.example` instead.
