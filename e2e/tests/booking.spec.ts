import { bookedDesks } from './support/api'
import { DESK_STATUS } from './support/app'
import { FLOOR_3, USERS } from './support/env'
import { expect, test } from './support/fixtures'

test.use({ dateOffset: 2 })

test('a signed-in user books an available desk and it becomes theirs', async ({ openApp, date }) => {
  const alice = await openApp(USERS.alice)
  await alice.showFloor(FLOOR_3, date)
  await alice.expectDesk('3-A1', DESK_STATUS.available)

  await alice.clickDesk('3-A1')

  await alice.expectDesk('3-A1', DESK_STATUS.mine)
  await expect(alice.announcer).toContainText(/booked for you/i)
  await expect(alice.myBookings.getByText(/3-A1/)).toBeVisible()
  expect(await bookedDesks(FLOOR_3, date), 'server-side bookings').toEqual({ '3-A1': USERS.alice.displayName })
})

test('the desks next to a booking show as blocked by the spacing rule', async ({ openApp, date }) => {
  const alice = await openApp(USERS.alice)
  const bob = await openApp(USERS.bob)
  await alice.showFloor(FLOOR_3, date)
  await bob.showFloor(FLOOR_3, date)

  await alice.clickDesk('3-C3')
  await alice.expectDesk('3-C3', DESK_STATUS.mine)

  // The spacing feedback is for other users: the booker can't take a second desk that day anyway.
  // Floor 3 is ORTHOGONAL: for Bob, the four desks on the sides are blocked, the diagonals are not.
  await bob.expectDesk('3-C3', DESK_STATUS.bookedBy(USERS.alice.displayName))
  for (const label of ['3-B3', '3-D3', '3-C2', '3-C4']) await bob.expectDesk(label, DESK_STATUS.blocked)
  for (const label of ['3-B2', '3-B4', '3-D2', '3-D4']) await bob.expectDesk(label, DESK_STATUS.available)
})
