# frontend/CLAUDE.md

Guidance for the React + TypeScript frontend. The domain rules and the API and WebSocket contract are in the root `CLAUDE.md`.

## Commands

React 19 + TypeScript 6, built with Vite 8, linted with oxlint, and tested with Vitest 5 + Testing Library (jsdom). Run from `frontend/`:

- Install: `npm install` (CI uses `npm ci`)
- Dev server: `npm run dev`. It proxies `/api` and `/ws` to the backend on `localhost:8080` (see `vite.config.ts`).
- Type-check: `npm run typecheck`
- Lint: `npm run lint`
- Unit tests: `npm test`. For one file: `npx vitest run src/App.test.tsx`. For one test by name: `npx vitest run -t "renders the page heading"`.
- Production build: `npm run build`
- End-to-end tests (planned, #8): `npx playwright test`

The first Vitest run on Windows can time out while jsdom starts; rerunning fixes it. Test setup (jest-dom matchers and cleanup) is in `src/test/setup.ts`.

## Structure

- Pages: login, and a floor page with a date picker and the grid.
- The floor store holds desks normalized by desk ID. It loads from the REST snapshot, then applies socket updates, ignoring any update not newer than the stored version. It reloads the snapshot after reconnecting.
- The grid renders memoized `DeskCell` components, and each cell reads only its own desk.
- Bookings show optimistically and roll back on a 409, showing the reason from the error `code`.
- Libraries: TanStack Query for REST calls, `@stomp/stompjs` for the socket, and a small store (Zustand or `useSyncExternalStore`).

## Conventions

- Cells are `button`s with arrow-key grid navigation. Status uses an icon and label as well as colour.
- Booking results and conflicts are announced through an `aria-live` region.
- Tests use Vitest and Testing Library, with MSW and a mocked socket. Never store or log the JWT anywhere except the auth module.
- Record every notable frontend change under `## [Unreleased]` in `frontend/CHANGELOG.md`, in the same PR. Use the Keep a Changelog sections (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`).
