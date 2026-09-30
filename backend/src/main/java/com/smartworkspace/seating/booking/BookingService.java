package com.smartworkspace.seating.booking;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.smartworkspace.seating.common.ApiException;
import com.smartworkspace.seating.common.ErrorCodes;
import com.smartworkspace.seating.floor.Cell;
import com.smartworkspace.seating.floor.CellRepository;
import com.smartworkspace.seating.floor.Floor;
import com.smartworkspace.seating.floor.FloorRepository;
import com.smartworkspace.seating.floor.NeighbourPolicy;
import com.smartworkspace.seating.security.CurrentUser;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Books and cancels desks, enforcing the booking window, desk-only booking, one booking per desk and per user per
 * day, and the spacing rule. Every change takes a new desk version from {@code desk_status_seq} while holding the
 * desk's row lock, so each desk's versions increase in commit order.
 * <p>
 * Concurrency: a booking locks the target desk and its neighbour desk rows ({@code SELECT ... FOR UPDATE}, ascending
 * id) before checking for existing bookings, so two bookings of the same or neighbouring desks serialise. The unique
 * constraints on {@code (desk_id, date)} and {@code (user_id, date)} remain as a second line of defence; the second
 * one is what stops one user booking two unrelated desks at the same moment.
 */
@Service
public class BookingService {

	private final BookingRepository bookings;

	private final CellRepository cells;

	private final FloorRepository floors;

	private final NeighbourPolicy neighbourPolicy;

	private final BookingWindow window;

	private final Clock clock;

	public BookingService(BookingRepository bookings, CellRepository cells, FloorRepository floors,
			NeighbourPolicy neighbourPolicy, BookingWindow window, Clock clock) {
		this.bookings = bookings;
		this.cells = cells;
		this.floors = floors;
		this.neighbourPolicy = neighbourPolicy;
		this.window = window;
		this.clock = clock;
	}

	@Transactional
	public BookingResponse book(CurrentUser user, long deskId, LocalDate date) {
		this.window.check(date);
		Cell desk = this.cells.findById(deskId)
			.orElseThrow(() -> ApiException.notFound("Desk " + deskId + " does not exist."));
		if (!desk.isDesk()) {
			throw ApiException.badRequest(ErrorCodes.NOT_A_DESK, "Cell " + deskId + " is not a bookable desk.");
		}
		Floor floor = this.floors.findById(desk.getFloorId()).orElseThrow();
		// The grid layout never changes at runtime, so the neighbours can be read without a lock.
		List<Cell> neighbours = this.neighbourPolicy.neighbourDesks(floor, desk);

		List<Long> deskIds = new ArrayList<>();
		deskIds.add(desk.getId());
		neighbours.forEach((neighbour) -> deskIds.add(neighbour.getId()));
		deskIds.sort(null);
		// Locked check-and-save: lock the target desk and its neighbours (ascending id) before checking. Any booking
		// or cancel of an overlapping desk holds one of these rows, so it waits here until the other transaction
		// commits, and the check below (a new statement under READ COMMITTED) then sees its result.
		this.cells.lockInIdOrder(deskIds);
		List<Long> booked = this.bookings.findBookedDeskIds(deskIds, date);
		if (booked.contains(desk.getId())) {
			throw ApiException.conflict(ErrorCodes.DESK_TAKEN, "The desk is already booked for " + date + ".");
		}
		if (this.bookings.existsByUserIdAndDate(user.id(), date)) {
			throw ApiException.conflict(ErrorCodes.ALREADY_BOOKED_TODAY,
					"You already have a booking for " + date + ".");
		}
		if (!booked.isEmpty()) {
			throw ApiException.conflict(ErrorCodes.SPACING_VIOLATION,
					"A neighbouring desk is already booked for " + date + ".");
		}

		Booking booking = insert(new Booking(desk.getId(), floor.getId(), user.id(), date, this.clock.instant()));
		long seq = bumpVersion(desk);
		return new BookingResponse(booking.getId(), desk.getId(), floor.getId(), date, seq);
	}

	@Transactional
	public void cancel(CurrentUser user, long bookingId) {
		Booking booking = this.bookings.findById(bookingId)
			.orElseThrow(() -> ApiException.notFound("Booking " + bookingId + " does not exist."));
		if (!booking.getUserId().equals(user.id())) {
			throw ApiException.forbidden("You can cancel only your own bookings.");
		}
		// Lock the desk so the version bump is ordered with any concurrent booking that involves this desk.
		Cell desk = this.cells.lockInIdOrder(List.of(booking.getDeskId())).get(0);
		if (this.bookings.deleteBookingById(bookingId) == 0) {
			throw ApiException.notFound("Booking " + bookingId + " does not exist.");
		}
		bumpVersion(desk);
	}

	@Transactional(readOnly = true)
	public List<MyBooking> upcoming(CurrentUser user) {
		return this.bookings.findUpcoming(user.id(), this.window.today());
	}

	private Booking insert(Booking booking) {
		try {
			return this.bookings.saveAndFlush(booking);
		}
		catch (DataIntegrityViolationException ex) {
			throw BookingConstraints.translate(ex);
		}
	}

	private long bumpVersion(Cell desk) {
		long seq = this.cells.nextDeskSeq();
		desk.setLastSeq(seq);
		return seq;
	}

}
