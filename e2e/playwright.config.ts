import { defineConfig, devices } from '@playwright/test'
import { API_URL, BASE_URL, OFFICE_TIME_ZONE } from './tests/support/env'

const isCI = !!process.env.CI
const isWindows = process.platform === 'win32'

export default defineConfig({
  testDir: './tests',
  // All tests share one database, so run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [['list'], ['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // The frontend offers dates in the browser's time zone; keep it equal to the backend's BOOKING_ZONE.
    timezoneId: OFFICE_TIME_ZONE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Set E2E_NO_SERVER=1 to skip starting the servers (when both already run, or to list tests).
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          name: 'backend',
          // Needs PostgreSQL: run `docker compose up -d --wait` in the repo root first.
          command: isWindows ? 'mvnw.cmd -B spring-boot:run' : './mvnw -B spring-boot:run',
          cwd: '../backend',
          // A protected endpoint answers 401 without a token, which Playwright treats as ready.
          url: `${API_URL}/api/floors`,
          env: { BOOKING_ZONE: OFFICE_TIME_ZONE },
          reuseExistingServer: !isCI,
          // The first start compiles the app and may download dependencies.
          timeout: 300_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          name: 'frontend',
          command: 'npm run dev -- --port 5173 --strictPort',
          cwd: '../frontend',
          url: BASE_URL,
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
      ],
})
