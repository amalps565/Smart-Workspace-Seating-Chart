import { test as base } from '@playwright/test'
import { clearBookingsOn } from './api'
import { SeatingApp } from './app'
import { officeDate, type SeedUser } from './env'

interface Fixtures {
  /** Days after today (office time zone) that this test books on. Set it with `test.use`. */
  dateOffset: number
  /** The test's booking date. Every seeded user's bookings on it are cleared before and after the test. */
  date: string
  /** Opens a new browser context signed in as `user`. Contexts are closed after the test. */
  openApp: (user: SeedUser) => Promise<SeatingApp>
}

export const test = base.extend<Fixtures>({
  dateOffset: [1, { option: true }],

  date: async ({ dateOffset }, use) => {
    const date = officeDate(dateOffset)
    await clearBookingsOn(date)
    await use(date)
    await clearBookingsOn(date)
  },

  openApp: async ({ browser }, use) => {
    const apps: SeatingApp[] = []
    await use(async (user) => {
      const app = await SeatingApp.open(browser, user)
      apps.push(app)
      return app
    })
    await Promise.all(apps.map((app) => app.close()))
  },
})

export { expect } from '@playwright/test'
