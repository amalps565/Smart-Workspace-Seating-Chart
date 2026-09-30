package com.smartworkspace.seating.booking;

import java.time.LocalDate;

public record MyBooking(long id, long deskId, String deskLabel, long floorId, String floorName, LocalDate date) {
}
