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

The first Vitest run on Windows can time out while jsdom starts; rerunning fixes it. On a slow machine, run files one at a time or add `--no-file-parallelism`. Test setup (jest-dom matchers and cleanup) is in `src/test/setup.ts`.

## Structure

- `src/api/`: `http.ts` (fetch wrapper: adds the bearer token, turns `{code, message}` bodies into `ApiError`, signs out on any 401), `endpoints.ts` (one function per endpoint plus TanStack Query keys), `types.ts` (contract DTOs), `errors.ts` (friendly text per error `code`).
- `src/auth/`: `session.ts` is the only module that holds the JWT (memory plus `sessionStorage`); `LoginPage.tsx`.
- `src/features/floor/`:
  - `store.ts`: a Zustand vanilla store per floor page. Desks are normalized by ID; updates apply only when `seq` is newer; updates are buffered while a snapshot loads. `deriveCellView` works out `AVAILABLE`, `MINE`, `BOOKED`, `BLOCKED_BY_SPACING`, and `NOT_A_DESK`, overlaying pending optimistic actions on the untouched server state.
  - `neighbours.ts`: the single client-side neighbour rule (`ORTHOGONAL` or `ALL`, desks only).
  - `socket.ts`: the `FloorSocket` interface and its `@stomp/stompjs` implementation (`ws(s)://<host>/ws`, token in the CONNECT headers, resubscribes after reconnects). Tests inject `src/test/fakeSocket.ts`.
  - `useFloorFeed.ts`: subscribe first, then load the snapshot; reload it on every (re)connect; unsubscribe on floor or date change. `batcher.ts` hands socket bursts to the store once per animation frame.
  - `FloorGrid.tsx` and `DeskCell.tsx`: a `role="grid"` CSS grid with roving tabindex and arrow keys. Each memoized `DeskCell` selects only its own derived view (shallow-compared), so one update re-renders that cell and any neighbour whose status changes. `renderProbe.ts` lets tests count cell renders.
  - `FloorPage.tsx`: floor and day pickers, connection indicator, grid, legend, and "My bookings".
- `src/features/bookings/`: `useBookingActions.ts` (optimistic book and cancel with rollback; reloads the snapshot after a 400/403/404/409), `MyBookings.tsx`, `dates.ts` (booking window of today plus 14 days).
- `src/components/`: the `aria-live` announcer (`useAnnounce`).
- `src/test/`: MSW server, fake socket, fixtures (`makeSnapshot`), and render helpers.
- Libraries: TanStack Query for REST, `@stomp/stompjs` for the socket, Zustand for the floor store, MSW for tests. No UI framework; plain CSS in `src/index.css` with light and dark schemes.

## Conventions

- Cells are `button`s with arrow-key grid navigation. Status uses an icon and label as well as colour.
- Booking results and conflicts are announced through an `aria-live` region.
- Tests use Vitest and Testing Library, with MSW and a mocked socket. Never store or log the JWT anywhere except the auth module.
- Record every notable frontend change under `## [Unreleased]` in `frontend/CHANGELOG.md`, in the same PR. Use the Keep a Changelog sections (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`).
