package com.smartworkspace.seating.realtime;

import java.time.LocalDate;

import com.smartworkspace.seating.floor.DeskStatus;

/**
 * Published inside a booking or cancel transaction; broadcast only after that transaction commits.
 */
public record DeskStatusChanged(long floorId, long deskId, LocalDate date, DeskStatus status, String bookedBy,
		String bookedByUsername, long seq) {

	public static DeskStatusChanged booked(long floorId, long deskId, LocalDate date, String bookedBy,
			String bookedByUsername, long seq) {
		return new DeskStatusChanged(floorId, deskId, date, DeskStatus.BOOKED, bookedBy, bookedByUsername, seq);
	}

	public static DeskStatusChanged available(long floorId, long deskId, LocalDate date, long seq) {
		return new DeskStatusChanged(floorId, deskId, date, DeskStatus.AVAILABLE, null, null, seq);
	}

}
