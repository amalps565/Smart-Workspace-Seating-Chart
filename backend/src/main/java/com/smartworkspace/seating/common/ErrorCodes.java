package com.smartworkspace.seating.common;

/**
 * Error codes returned in the {@code code} field of {@link ErrorResponse}. Part of the API contract.
 */
public final class ErrorCodes {

	public static final String VALIDATION_ERROR = "VALIDATION_ERROR";

	public static final String UNAUTHORIZED = "UNAUTHORIZED";

	public static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS";

	public static final String FORBIDDEN = "FORBIDDEN";

	public static final String NOT_FOUND = "NOT_FOUND";

	public static final String METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED";

	public static final String INVALID_DATE = "INVALID_DATE";

	public static final String NOT_A_DESK = "NOT_A_DESK";

	public static final String DESK_TAKEN = "DESK_TAKEN";

	public static final String SPACING_VIOLATION = "SPACING_VIOLATION";

	public static final String ALREADY_BOOKED_TODAY = "ALREADY_BOOKED_TODAY";

	public static final String CONFLICT = "CONFLICT";

	public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

	private ErrorCodes() {
	}

}
