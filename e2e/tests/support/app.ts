import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'
import type { SeedUser } from './env'

/**
 * Page object for the hot-desking UI. Every selector the specs rely on lives in this file,
 * so a change in the frontend's markup or wording needs an update here only.
 *
 * The selectors use accessible roles and names from the frontend conventions:
 * - login form: "Username" and "Password" fields and a "Sign in" button
 * - toolbar: "Floor" and "Day" selects (the day options' values are ISO dates) and a
 *   connection indicator that reads "Live" once the socket is connected
 * - the map: `role="grid"`; each cell is a button named like "Desk 3-A1, available"
 * - an `aria-live="polite"` region that announces booking results and conflicts
 * - a "My bookings" list whose buttons are named like "Cancel desk 3-A1 on Thu, 1 Oct"
 */

/** Accessible-name fragments that describe a desk's status (after "Desk <label>, "). */
export const DESK_STATUS = {
  available: /available/i,
  mine: /booked by you/i,
  bookedBy: (displayName: string) => new RegExp(`booked by ${escapeRegExp(displayName)}`, 'i'),
  blocked: /unavailable|blocked|next to a booked desk|spacing/i,
  pending: /in progress|cancelling/i,
} as const

/** Wording the live region uses when a booking is rejected (409 DESK_TAKEN or SPACING_VIOLATION). */
export const CONFLICT_MESSAGE =
  /could not book|next to a booked desk|can't be booked|already booked|just booked|spacing|taken/i

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export class SeatingApp {
  constructor(
    readonly page: Page,
    readonly user: SeedUser,
  ) {}

  /** Opens a fresh browser context (own storage, so own session) and signs in. */
  static async open(browser: Browser, user: SeedUser): Promise<SeatingApp> {
    const context = await browser.newContext()
    const app = new SeatingApp(await context.newPage(), user)
    await app.signIn()
    return app
  }

  get context(): BrowserContext {
    return this.page.context()
  }

  async signIn(): Promise<void> {
    await this.page.goto('/')
    await this.page.getByLabel(/^username/i).fill(this.user.username)
    await this.page.getByLabel(/^password/i).fill(this.user.password)
    await this.page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(this.page.getByText(new RegExp(escapeRegExp(this.user.displayName))).first()).toBeVisible()
  }

  /** Picks the floor and date, then waits for the grid and a live socket connection. */
  async showFloor(floorName: string, date: string): Promise<void> {
    await this.page.getByLabel(/^floor/i).selectOption({ label: floorName })
    await this.page.getByLabel(/^(day|date)/i).selectOption(date)
    await expect(this.grid).toBeVisible()
    await expect(this.connectionStatus).toHaveText(/live|connected/i)
    // A desk with a status in its name means the snapshot for this floor and date has loaded.
    await expect(this.grid.getByRole('button', { name: /^Desk .+, / }).first()).toBeVisible()
  }

  get grid(): Locator {
    return this.page.getByRole('grid')
  }

  get connectionStatus(): Locator {
    return this.page.getByTestId('connection-status')
  }

  /** The polite live region that announces booking results and conflicts. */
  get announcer(): Locator {
    return this.page.locator('[aria-live="polite"]').first()
  }

  /** The button for one desk, e.g. `desk('3-B2')`; matches "Desk 3-B2, ..." but not "Desk 3-B12". */
  desk(label: string): Locator {
    return this.grid.getByRole('button', { name: new RegExp(`^Desk ${escapeRegExp(label)}(,|$)`) })
  }

  /** Clicks a desk. On an available desk this books it; on your own desk it cancels. */
  async clickDesk(label: string): Promise<void> {
    await this.desk(label).click()
  }

  async expectDesk(label: string, status: RegExp): Promise<void> {
    await expect(this.desk(label), `desk ${label} as seen by ${this.user.username}`).toHaveAccessibleName(status)
  }

  get myBookings(): Locator {
    return this.page.getByRole('region', { name: /my bookings/i })
  }

  /** Cancels a booking from the "My bookings" list. */
  async cancelFromMyBookings(label: string): Promise<void> {
    await this.myBookings.getByRole('button', { name: new RegExp(`^Cancel desk ${escapeRegExp(label)}\\b`, 'i') }).click()
  }

  async close(): Promise<void> {
    await this.context.close()
  }
}
