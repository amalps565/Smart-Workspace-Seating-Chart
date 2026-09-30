package com.smartworkspace.seating.booking;

import java.time.Clock;
import java.time.LocalDate;

import com.smartworkspace.seating.common.ApiException;
import com.smartworkspace.seating.common.ErrorCodes;
import com.smartworkspace.seating.config.BookingProperties;

import org.springframework.stereotype.Component;

/**
 * The dates that can be viewed and booked: today (in the office time zone) up to {@code window-days} ahead.
 */
@Component
public class BookingWindow {

	private final Clock clock;

	private final int windowDays;

	public BookingWindow(Clock clock, BookingProperties properties) {
		this.clock = clock;
		this.windowDays = properties.windowDays();
	}

	public LocalDate today() {
		return LocalDate.now(this.clock);
	}

	public LocalDate lastDay() {
		return today().plusDays(this.windowDays);
	}

	/**
	 * Throws 400 {@code INVALID_DATE} unless the date is within the booking window.
	 */
	public void check(LocalDate date) {
		LocalDate today = today();
		if (date.isBefore(today)) {
			throw ApiException.badRequest(ErrorCodes.INVALID_DATE, "The date " + date + " is in the past.");
		}
		if (date.isAfter(today.plusDays(this.windowDays))) {
			throw ApiException.badRequest(ErrorCodes.INVALID_DATE,
					"Bookings are allowed only up to " + this.windowDays + " days ahead.");
		}
	}

}
