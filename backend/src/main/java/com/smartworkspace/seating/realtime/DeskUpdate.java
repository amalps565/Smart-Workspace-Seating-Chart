package com.smartworkspace.seating.realtime;

import java.time.LocalDate;

import com.smartworkspace.seating.floor.DeskStatus;

/**
 * The message on {@code /topic/floors/{floorId}/{date}}: one changed desk, never the whole floor.
 */
public record DeskUpdate(long deskId, LocalDate date, DeskStatus status, String bookedBy, String bookedByUsername,
		long seq) {

	static DeskUpdate from(DeskStatusChanged event) {
		return new DeskUpdate(event.deskId(), event.date(), event.status(), event.bookedBy(), event.bookedByUsername(),
				event.seq());
	}

}
