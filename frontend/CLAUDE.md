# frontend/CLAUDE.md

Guidance for the React + TypeScript frontend. The domain rules and the API and WebSocket contract are in the root `CLAUDE.md`.

## Commands

The frontend hasn't been scaffolded yet. Once it is, list the real `package.json` scripts here. The planned scripts, run from `frontend/`, are:

- Install: `npm install`
- Dev server: `npm run dev` (expects the backend on its default port)
- Type-check: `npm run typecheck`
- Lint: `npm run lint`
- Unit tests: `npm test`, or one file: `npx vitest run src/features/floor/floorStore.test.ts`
- End-to-end tests: `npx playwright test` (needs the backend and database running), or one test: `npx playwright test -g "neighbour race"`

## Planned structure

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
