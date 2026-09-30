package com.smartworkspace.seating.floor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import jakarta.persistence.EntityManagerFactory;

import com.smartworkspace.seating.IntegrationTest;
import com.smartworkspace.seating.booking.BookingWindow;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

class FloorIntegrationTest extends IntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private BookingWindow window;

	@Autowired
	private EntityManagerFactory entityManagerFactory;

	private long floor3;

	private LocalDate today;

	@BeforeEach
	void setUp() {
		this.floor3 = floorId("Floor 3");
		this.today = this.window.today();
	}

	@Test
	void listsSeededFloors() throws Exception {
		this.mvc.perform(get("/api/floors").header("Authorization", bearer("alice")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value(this.floor3))
			.andExpect(jsonPath("$[0].name").value("Floor 3"))
			.andExpect(jsonPath("$[0].rows").value(8))
			.andExpect(jsonPath("$[0].cols").value(12))
			.andExpect(jsonPath("$[0].neighbourMode").value("ORTHOGONAL"))
			.andExpect(jsonPath("$[1].name").value("Floor 4"))
			.andExpect(jsonPath("$[1].neighbourMode").value("ALL"));
	}

	@Test
	void snapshotOfEmptyFloorHasEveryCellAvailable() throws Exception {
		long desk = cellId(this.floor3, 0, 0);
		long walkway = cellId(this.floor3, 0, 6);

		snapshot("alice", this.floor3, this.today).andExpect(status().isOk())
			.andExpect(jsonPath("$.floorId").value(this.floor3))
			.andExpect(jsonPath("$.date").value(this.today.toString()))
			.andExpect(jsonPath("$.rows").value(8))
			.andExpect(jsonPath("$.cols").value(12))
			.andExpect(jsonPath("$.neighbourMode").value("ORTHOGONAL"))
			.andExpect(jsonPath("$.cells", hasSize(96)))
			.andExpect(jsonPath("$.cells[?(@.status == 'BOOKED')]", hasSize(0)))
			.andExpect(jsonPath("$.cells[?(@.type == 'WALKWAY')]", hasSize(8)))
			.andExpect(jsonPath("$.cells[0].id").value(desk))
			.andExpect(jsonPath("$.cells[0].row").value(0))
			.andExpect(jsonPath("$.cells[0].col").value(0))
			.andExpect(jsonPath("$.cells[0].type").value("DESK"))
			.andExpect(jsonPath("$.cells[0].label").value("3-A1"))
			.andExpect(jsonPath("$.cells[0].status").value("AVAILABLE"))
			.andExpect(jsonPath("$.cells[0].bookedBy").value(nullValue()))
			.andExpect(jsonPath("$.cells[0].bookingId").value(nullValue()))
			.andExpect(jsonPath("$.cells[0].seq").isNumber())
			.andExpect(jsonPath("$.cells[6].id").value(walkway))
			.andExpect(jsonPath("$.cells[6].type").value("WALKWAY"))
			.andExpect(jsonPath("$.cells[6].status").value(nullValue()));
	}

	@Test
	void snapshotShowsBookingsAndBookingIdOnlyForTheCaller() throws Exception {
		long aliceDesk = cellId(this.floor3, 0, 0);
		long bobDesk = cellId(this.floor3, 2, 2);
		long aliceBooking = book(aliceDesk, "alice", this.today);
		book(bobDesk, "bob", this.today);
		// A booking on another date must not show up.
		book(cellId(this.floor3, 4, 4), "carol", this.today.plusDays(1));
		this.jdbc.update("update cells set last_seq = 42 where id = ?", aliceDesk);

		snapshot("alice", this.floor3, this.today).andExpect(status().isOk())
			.andExpect(jsonPath("$.cells[?(@.status == 'BOOKED')]", hasSize(2)))
			.andExpect(jsonPath("$.cells[0].status").value("BOOKED"))
			.andExpect(jsonPath("$.cells[0].bookedBy").value("Alice Anders"))
			.andExpect(jsonPath("$.cells[0].bookedByUsername").value("alice"))
			.andExpect(jsonPath("$.cells[0].bookingId").value(aliceBooking))
			.andExpect(jsonPath("$.cells[0].seq").value(42))
			.andExpect(jsonPath("$.cells[26].id").value(bobDesk))
			.andExpect(jsonPath("$.cells[26].status").value("BOOKED"))
			.andExpect(jsonPath("$.cells[26].bookedBy").value("Bob Brown"))
			.andExpect(jsonPath("$.cells[26].bookingId").value(nullValue()));

		// Bob sees his own bookingId but not Alice's.
		snapshot("bob", this.floor3, this.today).andExpect(status().isOk())
			.andExpect(jsonPath("$.cells[0].bookedBy").value("Alice Anders"))
			.andExpect(jsonPath("$.cells[0].bookingId").value(nullValue()))
			.andExpect(jsonPath("$.cells[26].bookingId").isNumber());
	}

	@Test
	void snapshotRunsAFixedNumberOfQueriesWhateverTheFloorSize() throws Exception {
		long floor4 = floorId("Floor 4");
		book(cellId(this.floor3, 0, 0), "alice", this.today);
		book(cellId(this.floor3, 2, 2), "bob", this.today);
		book(cellId(this.floor3, 4, 4), "carol", this.today);
		book(cellId(floor4, 0, 0), "dave", this.today);

		long large = queriesFor(this.floor3);
		long small = queriesFor(floor4);

		assertThat(large).isEqualTo(small).isEqualTo(2);
	}

	@Test
	void pastDateIsRejected() throws Exception {
		snapshot("alice", this.floor3, this.today.minusDays(1)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_DATE"));
	}

	@Test
	void dateBeyondTheWindowIsRejected() throws Exception {
		snapshot("alice", this.floor3, this.window.lastDay()).andExpect(status().isOk());
		snapshot("alice", this.floor3, this.window.lastDay().plusDays(1)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_DATE"));
	}

	@Test
	void malformedOrMissingDateIsRejected() throws Exception {
		this.mvc.perform(get("/api/floors/{id}/snapshot", this.floor3).param("date", "tomorrow")
			.header("Authorization", bearer("alice")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_DATE"));
		this.mvc.perform(get("/api/floors/{id}/snapshot", this.floor3).header("Authorization", bearer("alice")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_DATE"));
	}

	@Test
	void unknownFloorIsNotFound() throws Exception {
		snapshot("alice", 999_999, this.today).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	@Test
	void snapshotNeedsAToken() throws Exception {
		this.mvc.perform(get("/api/floors/{id}/snapshot", this.floor3).param("date", this.today.toString()))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	private long queriesFor(long floorId) throws Exception {
		String authorization = bearer("alice");
		Statistics statistics = this.entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
		statistics.clear();
		this.mvc
			.perform(get("/api/floors/{id}/snapshot", floorId).param("date", this.today.toString())
				.header("Authorization", authorization))
			.andExpect(status().isOk());
		return statistics.getPrepareStatementCount();
	}

	private ResultActions snapshot(String username, long floorId, LocalDate date) throws Exception {
		return this.mvc.perform(get("/api/floors/{id}/snapshot", floorId).param("date", date.toString())
			.header("Authorization", bearer(username)));
	}

	private long book(long deskId, String username, LocalDate date) {
		return this.jdbc.queryForObject(
				"insert into bookings (desk_id, floor_id, user_id, date) select id, floor_id, ?, ? from cells where id = ? returning id",
				Long.class, userId(username), date, deskId);
	}

}
