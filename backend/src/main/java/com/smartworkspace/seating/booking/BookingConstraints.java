package com.smartworkspace.seating.booking;

import java.util.Locale;

import com.smartworkspace.seating.common.ApiException;
import com.smartworkspace.seating.common.ErrorCodes;

import org.springframework.dao.DataIntegrityViolationException;

/**
 * Translates violations of the booking unique constraints (the second line of defence behind the service checks)
 * into the matching 409 error.
 */
final class BookingConstraints {

	static final String DESK_DATE = "uq_bookings_desk_date";

	static final String USER_DATE = "uq_bookings_user_date";

	private BookingConstraints() {
	}

	/**
	 * Returns the 409 for a known booking constraint, or the original exception for anything else.
	 */
	static RuntimeException translate(DataIntegrityViolationException ex) {
		String constraint = constraintName(ex);
		if (DESK_DATE.equals(constraint)) {
			return ApiException.conflict(ErrorCodes.DESK_TAKEN, "The desk is already booked for that date.");
		}
		if (USER_DATE.equals(constraint)) {
			return ApiException.conflict(ErrorCodes.ALREADY_BOOKED_TODAY, "You already have a booking for that date.");
		}
		return ex;
	}

	private static String constraintName(DataIntegrityViolationException ex) {
		for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
			if (cause instanceof org.hibernate.exception.ConstraintViolationException violation
					&& violation.getConstraintName() != null) {
				return violation.getConstraintName().toLowerCase(Locale.ROOT);
			}
		}
		String message = String.valueOf(ex.getMostSpecificCause().getMessage()).toLowerCase(Locale.ROOT);
		if (message.contains(DESK_DATE)) {
			return DESK_DATE;
		}
		if (message.contains(USER_DATE)) {
			return USER_DATE;
		}
		return null;
	}

}
