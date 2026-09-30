package com.smartworkspace.seating.booking;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record BookingRequest(@NotNull Long deskId, @NotNull LocalDate date) {
}
