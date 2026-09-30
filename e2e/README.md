# End-to-end tests

Playwright tests that drive the real app in Chromium: the Vite dev server (`frontend/`), the Spring Boot backend (`backend/`), and PostgreSQL from `docker-compose.yml`. They live in their own package, so their dependencies stay separate from the frontend's.

## What they cover

- `booking.spec.ts`: sign in, book a desk, see it as yours, and see its neighbours blocked.
- `realtime.spec.ts`: a booking made in one browser appears in another without a refresh; cancelling (from "My bookings" or from the map) frees the desk in both.
- `race.spec.ts`: two browser contexts (Alice and Bob) click conflicting desks at the same moment: side-by-side and above/below neighbours on Floor 3 (`ORTHOGONAL`), diagonal neighbours on Floor 4 (`ALL`), and the same desk. Exactly one wins, the other sees the conflict message and the winner's booking, and the server holds one booking. Each race runs 3 rounds (set `E2E_RACE_ROUNDS` for more). A control test checks that desks on either side of a walkway can both be booked.

## Setup

From the repo root, start PostgreSQL, then install the tests' dependencies and Chromium:

```sh
docker compose up -d --wait
cd frontend && npm install && cd ..
cd e2e
npm install
npm run install:browsers
```

To keep the browser download inside the repo instead of your user cache, set `PLAYWRIGHT_BROWSERS_PATH` for both the install and every run, for example `export PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers"` (gitignored). On Linux CI, use `npx playwright install --with-deps chromium` to get the system libraries too.

## Run

```sh
npm test                                  # all tests, headless
npx playwright test race.spec.ts          # one file
npx playwright test -g "same desk"        # tests whose title matches
npm run test:headed                       # watch the browsers
npm run test:ui                           # Playwright UI mode: pick tests, time-travel through steps
npx playwright test --debug -g "cancel"   # step through with the inspector
```

Playwright starts the backend (`./mvnw spring-boot:run`, ready when `GET /api/floors` answers) and the frontend (`npm run dev` on port 5173) itself. Locally it reuses servers that are already running, so you can keep them open between runs; in CI it always starts fresh ones. The first backend start compiles the app and can take a few minutes.

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:5173` | Frontend URL |
| `E2E_API_URL` | `http://localhost:8080` | Backend URL, used for setup and cleanup |
| `E2E_TIME_ZONE` | `UTC` | Browser time zone; also passed to the backend as `BOOKING_ZONE`. They must match. |
| `E2E_NO_SERVER` | unset | Set to `1` to skip starting servers (for example, with `--list`) |
| `E2E_RACE_ROUNDS` | `3` | Rounds per race scenario |

## Test data

The tests use the seeded users (`alice`, `bob`, and so on, password `password`) and floors. Each test books on its own date (today + N days, N from 2 to 10), and clears every seeded user's bookings on that date before and after it runs, through the REST API. Tests don't depend on each other or on their order. They run one at a time (`workers: 1`) because they share one database. Running them against your local database cancels any bookings on those dates.

## Reports and debugging

- HTML report: `playwright-report/` (open with `npm run report`).
- Failure screenshots, videos, and traces: `test-results/`. Traces are recorded on the first retry (CI retries once); open one with `npx playwright show-trace <path>/trace.zip`.
- In CI, both folders are uploaded as the `playwright-report` artifact when the job fails.

## Selectors

All selectors are in `tests/support/app.ts` and use accessible roles and names: the "Username"/"Password" fields and "Sign in" button, the "Floor" and "Day" selects, the connection indicator (`data-testid="connection-status"`, reads "Live"), the `grid` whose desk buttons are named like `Desk 3-A1, available`, the `aria-live="polite"` region, and the "My bookings" region. If the UI wording changes, update that file only.
