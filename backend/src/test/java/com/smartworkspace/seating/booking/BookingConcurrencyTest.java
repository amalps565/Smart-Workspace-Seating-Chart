package com.smartworkspace.seating.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import com.smartworkspace.seating.IntegrationTest;
import com.smartworkspace.seating.common.ApiException;
import com.smartworkspace.seating.floor.NeighbourMode;
import com.smartworkspace.seating.floor.NeighbourPolicy;
import com.smartworkspace.seating.security.CurrentUser;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.TestInstance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

/**
 * Fires simultaneous bookings (released together by a start gate) against Testcontainers PostgreSQL and checks
 * that the locked check-and-save keeps exactly one winner per conflict and the spacing rule intact.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BookingConcurrencyTest extends IntegrationTest {

	private static final int USERS = 9;

	@Autowired
	private BookingService bookingService;

	@Autowired
	private BookingWindow window;

	@Autowired
	private NeighbourPolicy neighbourPolicy;

	private ExecutorService executor;

	private final List<CurrentUser> users = new ArrayList<>();

	private LocalDate date;

	@BeforeAll
	void startExecutor() {
		this.executor = Executors.newFixedThreadPool(USERS);
	}

	@AfterAll
	void stopExecutor() {
		this.executor.shutdownNow();
	}

	@BeforeEach
	void setUp() {
		if (this.users.isEmpty()) {
			for (int i = 0; i < USERS; i++) {
				String username = "race-user-" + i;
				this.users.add(new CurrentUser(ensureUser(username), username, "User " + username));
			}
			// Warm up: open a pooled connection per thread and load the booking code paths once, so the first timed
			// repetition isn't dominated by cold-start work on slow machines.
			List<Callable<Long>> warmUp = new ArrayList<>();
			for (CurrentUser user : this.users) {
				warmUp.add(() -> (long) this.bookingService.upcoming(user).size());
			}
			assertThatNoException().isThrownBy(() -> race(warmUp));
		}
		this.date = this.window.today().plusDays(1);
	}

	/** Scenario A: many users book the same desk. Exactly one wins; the rest get DESK_TAKEN. */
	@RepeatedTest(50)
	void sameDesk() throws Exception {
		long desk = cellId(floorId("Floor 3"), 3, 3);
		List<Callable<Long>> attempts = new ArrayList<>();
		for (CurrentUser user : this.users) {
			attempts.add(() -> this.bookingService.book(user, desk, this.date).id());
		}

		List<Outcome> outcomes = race(attempts);

		assertThat(outcomes).filteredOn(Outcome::won).hasSize(1);
		assertThat(outcomes).filteredOn((outcome) -> !outcome.won())
			.allSatisfy((outcome) -> assertThat(outcome.code()).isEqualTo("DESK_TAKEN"));
		assertThat(bookedDesks()).hasSize(1);
	}

	/** Scenario B: two users book neighbouring desks. Exactly one wins; the other gets SPACING_VIOLATION. */
	@RepeatedTest(50)
	void twoNeighbouringDesks() throws Exception {
		long floor = floorId("Floor 3");
		long left = cellId(floor, 4, 4);
		long right = cellId(floor, 4, 5);
		List<Callable<Long>> attempts = List.of(() -> this.bookingService.book(this.users.get(0), left, this.date).id(),
				() -> this.bookingService.book(this.users.get(1), right, this.date).id());

		List<Outcome> outcomes = race(attempts);

		assertThat(outcomes).filteredOn(Outcome::won).hasSize(1);
		assertThat(outcomes).filteredOn((outcome) -> !outcome.won())
			.singleElement()
			.satisfies((outcome) -> assertThat(outcome.code()).isEqualTo("SPACING_VIOLATION"));
		assertSpacingRuleHolds(NeighbourMode.ORTHOGONAL);
	}

	/**
	 * Scenario B: users book a desk and all of its neighbours at once, in both neighbour modes. Afterwards no two
	 * booked desks are neighbours, at least one booking won, and every loser got a 409.
	 */
	@RepeatedTest(50)
	void deskAndAllItsNeighbours() throws Exception {
		// ORTHOGONAL: the centre and its 4 edge neighbours on Floor 3.
		long floor3 = floorId("Floor 3");
		raceBlock(List.of(cellId(floor3, 2, 2), cellId(floor3, 1, 2), cellId(floor3, 3, 2), cellId(floor3, 2, 1),
				cellId(floor3, 2, 3)));
		assertSpacingRuleHolds(NeighbourMode.ORTHOGONAL);

		// ALL: a full 3x3 block on Floor 4.
		this.jdbc.update("delete from bookings");
		long floor4 = floorId("Floor 4");
		List<Long> block = new ArrayList<>();
		for (int r = 0; r < 3; r++) {
			for (int c = 1; c < 4; c++) {
				block.add(cellId(floor4, r, c));
			}
		}
		raceBlock(block);
		assertSpacingRuleHolds(NeighbourMode.ALL);
	}

	/** The same user books two far-apart desks at once: one wins, the other gets ALREADY_BOOKED_TODAY. */
	@RepeatedTest(20)
	void sameUserTwoDesks() throws Exception {
		long floor = floorId("Floor 3");
		CurrentUser user = this.users.get(0);
		long first = cellId(floor, 0, 0);
		long second = cellId(floor, 7, 11);
		List<Outcome> outcomes = race(List.of(() -> this.bookingService.book(user, first, this.date).id(),
				() -> this.bookingService.book(user, second, this.date).id()));

		assertThat(outcomes).filteredOn(Outcome::won).hasSize(1);
		assertThat(outcomes).filteredOn((outcome) -> !outcome.won())
			.singleElement()
			.satisfies((outcome) -> assertThat(outcome.code()).isEqualTo("ALREADY_BOOKED_TODAY"));
	}

	private void raceBlock(List<Long> desks) throws Exception {
		List<Callable<Long>> attempts = new ArrayList<>();
		for (int i = 0; i < desks.size(); i++) {
			CurrentUser user = this.users.get(i);
			long desk = desks.get(i);
			attempts.add(() -> this.bookingService.book(user, desk, this.date).id());
		}
		List<Outcome> outcomes = race(attempts);
		assertThat(outcomes).filteredOn(Outcome::won).isNotEmpty();
		assertThat(outcomes).filteredOn((outcome) -> !outcome.won())
			.allSatisfy((outcome) -> assertThat(outcome.code()).isIn("SPACING_VIOLATION", "DESK_TAKEN"));
	}

	/**
	 * Runs all attempts at once behind a start gate. Any exception other than a 409 {@link ApiException} (a 500,
	 * deadlock, or lock timeout) fails the test.
	 */
	private List<Outcome> race(List<Callable<Long>> attempts) throws Exception {
		CountDownLatch ready = new CountDownLatch(attempts.size());
		CountDownLatch start = new CountDownLatch(1);
		List<Future<Outcome>> futures = new ArrayList<>();
		for (Callable<Long> attempt : attempts) {
			futures.add(this.executor.submit(() -> {
				ready.countDown();
				start.await();
				try {
					attempt.call();
					return new Outcome(true, null);
				}
				catch (ApiException ex) {
					assertThat(ex.getStatus()).as("rejected booking status").isEqualTo(HttpStatus.CONFLICT);
					return new Outcome(false, ex.getCode());
				}
			}));
		}
		assertThat(ready.await(1, TimeUnit.MINUTES)).isTrue();
		start.countDown();
		List<Outcome> outcomes = new ArrayList<>();
		for (Future<Outcome> future : futures) {
			outcomes.add(future.get(2, TimeUnit.MINUTES));
		}
		return outcomes;
	}

	private List<Map<String, Object>> bookedDesks() {
		return this.jdbc.queryForList(
				"select c.floor_id, c.row, c.col from bookings b join cells c on c.id = b.desk_id where b.date = ?",
				this.date);
	}

	private void assertSpacingRuleHolds(NeighbourMode mode) {
		List<Map<String, Object>> booked = bookedDesks();
		for (Map<String, Object> a : booked) {
			for (Map<String, Object> b : booked) {
				if (a != b && a.get("floor_id").equals(b.get("floor_id"))) {
					assertThat(this.neighbourPolicy.areNeighbours(mode, (int) a.get("row"), (int) a.get("col"),
							(int) b.get("row"), (int) b.get("col")))
						.as("booked desks %s and %s are neighbours", a, b)
						.isFalse();
				}
			}
		}
	}

	private record Outcome(boolean won, String code) {
	}

}
