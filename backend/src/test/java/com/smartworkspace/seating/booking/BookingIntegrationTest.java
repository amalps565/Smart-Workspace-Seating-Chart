package com.smartworkspace.seating.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;

import com.jayway.jsonpath.JsonPath;
import com.smartworkspace.seating.IntegrationTest;
import com.smartworkspace.seating.common.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

class BookingIntegrationTest extends IntegrationTest {

	/**
	 * The worked example from the Domain Rules wiki page.
	 *
	 * <pre>
	 *      c0   c1   c2
	 * r0   D    D    D
	 * r1   D    [B]  D
	 * r2   D    D    —
	 * </pre>
	 */
	private static final String[] WORKED_EXAMPLE = { "DDD", "DDD", "DD-" };

	@Autowired
	private MockMvc mvc;

	@Autowired
	private BookingWindow window;

	@Autowired
	private BookingRepository bookingRepository;

	private long floor3;

	private LocalDate today;

	@BeforeEach
	void setUp() {
		this.floor3 = floorId("Floor 3");
		this.today = this.window.today();
	}

	@Test
	void booksADeskAndShowsItInTheSnapshot() throws Exception {
		long desk = cellId(this.floor3, 0, 0);

		String body = book("alice", desk, this.today).andExpect(status().isCreated())
			.andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/bookings/")))
			.andExpect(jsonPath("$.id").isNumber())
			.andExpect(jsonPath("$.deskId").value(desk))
			.andExpect(jsonPath("$.floorId").value(this.floor3))
			.andExpect(jsonPath("$.date").value(this.today.toString()))
			.andExpect(jsonPath("$.seq").isNumber())
			.andReturn()
			.getResponse()
			.getContentAsString();
		long bookingId = ((Number) JsonPath.read(body, "$.id")).longValue();
		long seq = ((Number) JsonPath.read(body, "$.seq")).longValue();

		this.mvc
			.perform(get("/api/floors/{id}/snapshot", this.floor3).param("date", this.today.toString())
				.header("Authorization", bearer("alice")))
			.andExpect(jsonPath("$.cells[0].status").value("BOOKED"))
			.andExpect(jsonPath("$.cells[0].bookedBy").value("Alice Anders"))
			.andExpect(jsonPath("$.cells[0].bookingId").value(bookingId))
			.andExpect(jsonPath("$.cells[0].seq").value(seq));
	}

	@Test
	void deskAlreadyBookedIsTaken() throws Exception {
		long desk = cellId(this.floor3, 3, 3);
		book("alice", desk, this.today).andExpect(status().isCreated());

		book("bob", desk, this.today).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("DESK_TAKEN"));
		// The same desk on another day is fine.
		book("bob", desk, this.today.plusDays(1)).andExpect(status().isCreated());
	}

	@Test
	void secondBookingOnTheSameDayIsRejected() throws Exception {
		book("alice", cellId(this.floor3, 0, 0), this.today).andExpect(status().isCreated());

		book("alice", cellId(this.floor3, 7, 11), this.today).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ALREADY_BOOKED_TODAY"));
	}

	@Test
	void workedExampleInOrthogonalMode() throws Exception {
		long floor = ensureFloor("Worked example ORTHOGONAL", "ORTHOGONAL", WORKED_EXAMPLE);
		book("bob", cellId(floor, 1, 1), this.today).andExpect(status().isCreated());

		for (int[] position : new int[][] { { 0, 1 }, { 1, 0 }, { 1, 2 }, { 2, 1 } }) {
			book("alice", cellId(floor, position[0], position[1]), this.today).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("SPACING_VIOLATION"));
		}
		// Diagonal to [B]: allowed in ORTHOGONAL mode.
		book("alice", cellId(floor, 0, 0), this.today).andExpect(status().isCreated());
		// The walkway is never bookable.
		book("carol", cellId(floor, 2, 2), this.today).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("NOT_A_DESK"));
	}

	@Test
	void workedExampleInAllMode() throws Exception {
		long floor = ensureFloor("Worked example ALL", "ALL", WORKED_EXAMPLE);
		book("bob", cellId(floor, 1, 1), this.today).andExpect(status().isCreated());

		for (int[] position : new int[][] { { 0, 0 }, { 0, 1 }, { 0, 2 }, { 1, 0 }, { 1, 2 }, { 2, 0 }, { 2, 1 } }) {
			book("alice", cellId(floor, position[0], position[1]), this.today).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("SPACING_VIOLATION"));
		}
	}

	@Test
	void walkwaysDoNotCountAsNeighbours() throws Exception {
		// Seeded Floor 3 has a walkway down column 6, so desks in columns 5 and 7 are not neighbours.
		book("alice", cellId(this.floor3, 2, 5), this.today).andExpect(status().isCreated());
		book("bob", cellId(this.floor3, 2, 7), this.today).andExpect(status().isCreated());
	}

	@Test
	void spacingIsPerDate() throws Exception {
		book("alice", cellId(this.floor3, 0, 0), this.today).andExpect(status().isCreated());
		book("bob", cellId(this.floor3, 0, 1), this.today.plusDays(1)).andExpect(status().isCreated());
	}

	@Test
	void invalidDatesAreRejected() throws Exception {
		long desk = cellId(this.floor3, 0, 0);
		book("alice", desk, this.today.minusDays(1)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_DATE"));
		book("alice", desk, this.window.lastDay().plusDays(1)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_DATE"));
		book("alice", desk, this.window.lastDay()).andExpect(status().isCreated());
	}

	@Test
	void walkwayIsNotADesk() throws Exception {
		book("alice", cellId(this.floor3, 0, 6), this.today).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("NOT_A_DESK"));
	}

	@Test
	void unknownDeskIsNotFound() throws Exception {
		book("alice", 999_999, this.today).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	@Test
	void malformedRequestIsAValidationError() throws Exception {
		this.mvc
			.perform(post("/api/bookings").header("Authorization", bearer("alice"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"date\":\"" + this.today + "\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
		this.mvc
			.perform(post("/api/bookings").header("Authorization", bearer("alice"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"deskId\":1,\"date\":\"not-a-date\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void bookingNeedsAToken() throws Exception {
		this.mvc
			.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON)
				.content("{\"deskId\":1,\"date\":\"" + this.today + "\"}"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void ownerCancelsAndTheDeskBecomesAvailableWithANewSeq() throws Exception {
		long desk = cellId(this.floor3, 5, 5);
		String body = book("alice", desk, this.today).andReturn().getResponse().getContentAsString();
		long bookingId = ((Number) JsonPath.read(body, "$.id")).longValue();
		long bookedSeq = ((Number) JsonPath.read(body, "$.seq")).longValue();

		this.mvc.perform(delete("/api/bookings/{id}", bookingId).header("Authorization", bearer("alice")))
			.andExpect(status().isNoContent());

		assertThat(this.bookingRepository.existsById(bookingId)).isFalse();
		long seqAfterCancel = this.jdbc.queryForObject("select last_seq from cells where id = ?", Long.class, desk);
		assertThat(seqAfterCancel).isGreaterThan(bookedSeq);
		// The neighbour is free again.
		book("bob", cellId(this.floor3, 5, 4), this.today).andExpect(status().isCreated());
	}

	@Test
	void cancellingSomeoneElsesBookingIsForbidden() throws Exception {
		String body = book("alice", cellId(this.floor3, 0, 0), this.today).andReturn().getResponse().getContentAsString();
		long bookingId = ((Number) JsonPath.read(body, "$.id")).longValue();

		this.mvc.perform(delete("/api/bookings/{id}", bookingId).header("Authorization", bearer("bob")))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("FORBIDDEN"));
		assertThat(this.bookingRepository.existsById(bookingId)).isTrue();
	}

	@Test
	void cancellingAnUnknownBookingIsNotFound() throws Exception {
		this.mvc.perform(delete("/api/bookings/{id}", 999_999).header("Authorization", bearer("alice")))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	@Test
	void myBookingsListsOnlyMineFromTodaySorted() throws Exception {
		long floor4 = floorId("Floor 4");
		book("alice", cellId(this.floor3, 0, 0), this.today.plusDays(2)).andExpect(status().isCreated());
		book("alice", cellId(floor4, 0, 0), this.today).andExpect(status().isCreated());
		book("bob", cellId(this.floor3, 7, 11), this.today).andExpect(status().isCreated());
		// A past booking (inserted directly, since the API rejects past dates) is not listed.
		this.jdbc.update("insert into bookings (desk_id, floor_id, user_id, date) values (?, ?, ?, ?)",
				cellId(this.floor3, 3, 3), this.floor3, userId("alice"), this.today.minusDays(1));

		this.mvc.perform(get("/api/bookings/me").header("Authorization", bearer("alice")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(2)))
			.andExpect(jsonPath("$[0].date").value(this.today.toString()))
			.andExpect(jsonPath("$[0].deskId").value(cellId(floor4, 0, 0)))
			.andExpect(jsonPath("$[0].deskLabel").value("4-A1"))
			.andExpect(jsonPath("$[0].floorId").value(floor4))
			.andExpect(jsonPath("$[0].floorName").value("Floor 4"))
			.andExpect(jsonPath("$[0].id").isNumber())
			.andExpect(jsonPath("$[1].date").value(this.today.plusDays(2).toString()))
			.andExpect(jsonPath("$[1].deskLabel").value("3-A1"));
	}

	@Test
	void uniqueConstraintViolationsTranslateTo409Codes() {
		long desk = cellId(this.floor3, 4, 0);
		long alice = userId("alice");
		long bob = userId("bob");
		this.bookingRepository.saveAndFlush(new Booking(desk, this.floor3, alice, this.today, Instant.now()));

		DataIntegrityViolationException deskClash = catchViolation(
				new Booking(desk, this.floor3, bob, this.today, Instant.now()));
		assertThat(BookingConstraints.translate(deskClash)).isInstanceOf(ApiException.class)
			.extracting("code")
			.isEqualTo("DESK_TAKEN");

		DataIntegrityViolationException userClash = catchViolation(
				new Booking(cellId(this.floor3, 7, 0), this.floor3, alice, this.today, Instant.now()));
		assertThat(BookingConstraints.translate(userClash)).isInstanceOf(ApiException.class)
			.extracting("code")
			.isEqualTo("ALREADY_BOOKED_TODAY");
	}

	private DataIntegrityViolationException catchViolation(Booking booking) {
		try {
			this.bookingRepository.saveAndFlush(booking);
		}
		catch (DataIntegrityViolationException ex) {
			return ex;
		}
		throw new AssertionError("expected a unique constraint violation");
	}

	private ResultActions book(String username, long deskId, LocalDate date) throws Exception {
		return this.mvc.perform(post("/api/bookings").header("Authorization", bearer(username))
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"deskId\":" + deskId + ",\"date\":\"" + date + "\"}"));
	}

}
