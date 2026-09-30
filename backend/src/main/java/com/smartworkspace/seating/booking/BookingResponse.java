package com.smartworkspace.seating.booking;

import java.time.LocalDate;

/**
 * A created booking. {@code seq} is the desk's new version, the same value the WebSocket update carries.
 */
public record BookingResponse(long id, long deskId, long floorId, LocalDate date, long seq) {
}
