import { DESK_STATUS } from './support/app'
import { FLOOR_3, USERS } from './support/env'
import { expect, test } from './support/fixtures'

test.describe('a booking in one browser', () => {
  test.use({ dateOffset: 3 })

  test('appears in the other browser without a refresh', async ({ openApp, date }) => {
    const alice = await openApp(USERS.alice)
    const bob = await openApp(USERS.bob)
    await alice.showFloor(FLOOR_3, date)
    await bob.showFloor(FLOOR_3, date)
    await bob.expectDesk('3-E5', DESK_STATUS.available)

    // The update must arrive over the socket, so fail if Bob's page navigates or reloads.
    let bobNavigations = 0
    bob.page.on('framenavigated', (frame) => {
      if (frame === bob.page.mainFrame()) bobNavigations++
    })

    await alice.clickDesk('3-E5')
    await alice.expectDesk('3-E5', DESK_STATUS.mine)

    await bob.expectDesk('3-E5', DESK_STATUS.bookedBy(USERS.alice.displayName))
    await bob.expectDesk('3-E4', DESK_STATUS.blocked)
    expect(bobNavigations, "Bob's page must not reload to see the booking").toBe(0)
  })
})

test.describe('cancelling from "My bookings"', () => {
  test.use({ dateOffset: 4 })

  test('frees the desk in both browsers', async ({ openApp, date }) => {
    const alice = await openApp(USERS.alice)
    const bob = await openApp(USERS.bob)
    await alice.showFloor(FLOOR_3, date)
    await bob.showFloor(FLOOR_3, date)

    await alice.clickDesk('3-F9')
    await alice.expectDesk('3-F9', DESK_STATUS.mine)
    await bob.expectDesk('3-F9', DESK_STATUS.bookedBy(USERS.alice.displayName))
    await bob.expectDesk('3-F10', DESK_STATUS.blocked)

    await alice.cancelFromMyBookings('3-F9')

    await expect(alice.announcer).toContainText(/cancelled/i)
    for (const app of [alice, bob]) {
      await app.expectDesk('3-F9', DESK_STATUS.available)
      await app.expectDesk('3-F10', DESK_STATUS.available)
    }
    await expect(alice.myBookings.getByText(/3-F9/)).toHaveCount(0)
  })
})

test.describe('cancelling from the map', () => {
  test.use({ dateOffset: 5 })

  test('clicking your own desk frees it in both browsers', async ({ openApp, date }) => {
    const alice = await openApp(USERS.alice)
    const bob = await openApp(USERS.bob)
    await alice.showFloor(FLOOR_3, date)
    await bob.showFloor(FLOOR_3, date)

    await alice.clickDesk('3-H12')
    await alice.expectDesk('3-H12', DESK_STATUS.mine)
    await bob.expectDesk('3-H12', DESK_STATUS.bookedBy(USERS.alice.displayName))

    await alice.clickDesk('3-H12')

    await alice.expectDesk('3-H12', DESK_STATUS.available)
    await bob.expectDesk('3-H12', DESK_STATUS.available)
  })
})
