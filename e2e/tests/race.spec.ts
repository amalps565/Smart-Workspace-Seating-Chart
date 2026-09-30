import { bookedDesks, clearBookingsOn } from './support/api'
import { CONFLICT_MESSAGE, DESK_STATUS, type SeatingApp } from './support/app'
import { FLOOR_3, FLOOR_4, USERS } from './support/env'
import { expect, test } from './support/fixtures'

/**
 * Two browsers (Alice and Bob) click conflicting desks at the same moment. The server must let
 * exactly one booking through; the loser sees a conflict message and the winner's booking on
 * their map, without a reload.
 *
 * Each scenario runs several rounds, clearing the date through the API between rounds, because
 * one pass of a race proves little. Raise it with E2E_RACE_ROUNDS.
 */
const ROUNDS = Number(process.env.E2E_RACE_ROUNDS ?? 3)

/**
 * How long to wait for a race to settle. Longer than the global 10s expect timeout, because on a
 * slow machine the locked booking and the loser's resync can take a while. On CI it settles in
 * about a second.
 */
const RACE_WAIT = 30_000
const settle = { timeout: RACE_WAIT }

// Each round may wait up to RACE_WAIT several times, so the default 60s test limit isn't enough.
test.describe.configure({ timeout: 60_000 + ROUNDS * 3 * RACE_WAIT })

interface Scenario {
  title: string
  floor: string
  aliceDesk: string
  bobDesk: string
  dateOffset: number
  /** What the loser's own desk looks like once the winner's booking reaches them. */
  loserDeskStatus: 'blocked' | 'bookedByWinner'
}

const scenarios: Scenario[] = [
  {
    title: 'side-by-side neighbours (ORTHOGONAL floor)',
    floor: FLOOR_3,
    aliceDesk: '3-B2',
    bobDesk: '3-B3',
    dateOffset: 6,
    loserDeskStatus: 'blocked',
  },
  {
    title: 'neighbours above and below (ORTHOGONAL floor)',
    floor: FLOOR_3,
    aliceDesk: '3-C4',
    bobDesk: '3-D4',
    dateOffset: 7,
    loserDeskStatus: 'blocked',
  },
  {
    title: 'diagonal neighbours (ALL floor)',
    floor: FLOOR_4,
    aliceDesk: '4-B2',
    bobDesk: '4-C3',
    dateOffset: 8,
    loserDeskStatus: 'blocked',
  },
  {
    title: 'the same desk',
    floor: FLOOR_3,
    aliceDesk: '3-D10',
    bobDesk: '3-D10',
    dateOffset: 9,
    loserDeskStatus: 'bookedByWinner',
  },
]

for (const scenario of scenarios) {
  test.describe(`racing for ${scenario.title}`, () => {
    test.use({ dateOffset: scenario.dateOffset })

    test(`exactly one of two simultaneous bookings wins (${scenario.aliceDesk} vs ${scenario.bobDesk})`, async ({
      openApp,
      date,
    }) => {
      const alice = await openApp(USERS.alice)
      const bob = await openApp(USERS.bob)
      await Promise.all([alice.showFloor(scenario.floor, date), bob.showFloor(scenario.floor, date)])

      for (let round = 1; round <= ROUNDS; round++) {
        await test.step(`round ${round} of ${ROUNDS}`, async () => {
          await raceOnce(scenario, date, alice, bob)
          await clearBookingsOn(date)
          // The cancellations reach both maps over the socket before the next round.
          for (const app of [alice, bob]) {
            await app.expectDesk(scenario.aliceDesk, DESK_STATUS.available)
            await app.expectDesk(scenario.bobDesk, DESK_STATUS.available)
          }
        })
      }
    })
  })
}

async function raceOnce(scenario: Scenario, date: string, alice: SeatingApp, bob: SeatingApp) {
  const contenders = [
    { app: alice, desk: scenario.aliceDesk },
    { app: bob, desk: scenario.bobDesk },
  ]
  for (const { app, desk } of contenders) await app.expectDesk(desk, DESK_STATUS.available)

  // Both desks are checked as available above, so both clicks can be dispatched at once.
  const buttons = contenders.map(({ app, desk }) => app.desk(desk))
  await Promise.all(buttons.map((button) => button.click()))

  // Wait until one browser shows its own booking. If both ever do, the server let both through.
  const mineCount = async () => {
    const names = await Promise.all(buttons.map((button) => button.getAttribute('aria-label')))
    return names.filter((name) => name !== null && DESK_STATUS.mine.test(name)).length
  }
  await expect.poll(mineCount, { message: 'exactly one browser should hold a booking', ...settle }).toBe(1)

  const aliceWon = DESK_STATUS.mine.test((await buttons[0].getAttribute('aria-label')) ?? '')
  const [winner, loser] = aliceWon ? contenders : [contenders[1], contenders[0]]

  // The loser is told why and sees the winner's booking, all without a reload.
  await expect(loser.app.announcer, `conflict message for ${loser.app.user.username}`).toContainText(
    CONFLICT_MESSAGE,
    settle,
  )
  await loser.app.expectDesk(winner.desk, DESK_STATUS.bookedBy(winner.app.user.displayName), settle)
  await loser.app.expectDesk(
    loser.desk,
    scenario.loserDeskStatus === 'blocked' ? DESK_STATUS.blocked : DESK_STATUS.bookedBy(winner.app.user.displayName),
    settle,
  )
  await winner.app.expectDesk(winner.desk, DESK_STATUS.mine, settle)
  expect(await mineCount(), 'only the winner holds a booking after both settle').toBe(1)

  // The server agrees: one booking, held by the winner.
  expect(await bookedDesks(scenario.floor, date), 'server-side bookings after the race').toEqual({
    [winner.desk]: winner.app.user.displayName,
  })
}

test.describe('desks on either side of a walkway', () => {
  test.use({ dateOffset: 10 })

  test('are not neighbours, so both simultaneous bookings succeed', async ({ openApp, date }) => {
    const alice = await openApp(USERS.alice)
    const bob = await openApp(USERS.bob)
    await Promise.all([alice.showFloor(FLOOR_3, date), bob.showFloor(FLOOR_3, date)])

    // Column 7 of Floor 3 is a walkway, so 3-A6 and 3-A8 are not adjacent desks.
    await Promise.all([alice.clickDesk('3-A6'), bob.clickDesk('3-A8')])

    await alice.expectDesk('3-A6', DESK_STATUS.mine, settle)
    await bob.expectDesk('3-A8', DESK_STATUS.mine, settle)
    await alice.expectDesk('3-A8', DESK_STATUS.bookedBy(USERS.bob.displayName), settle)
    await bob.expectDesk('3-A6', DESK_STATUS.bookedBy(USERS.alice.displayName), settle)
    expect(await bookedDesks(FLOOR_3, date)).toEqual({
      '3-A6': USERS.alice.displayName,
      '3-A8': USERS.bob.displayName,
    })
  })
})
