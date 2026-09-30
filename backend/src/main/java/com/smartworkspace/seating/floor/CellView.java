package com.smartworkspace.seating.floor;

/**
 * One cell in a floor snapshot. For non-desk cells, {@code status}, {@code seq}, and the booking fields are null.
 * {@code bookingId} is set only on the caller's own booking.
 */
public record CellView(long id, int row, int col, CellType type, String label, DeskStatus status, String bookedBy,
		String bookedByUsername, Long bookingId, Long seq) {

	static CellView from(SnapshotRow row, long callerUserId) {
		if (row.type() != CellType.DESK) {
			return new CellView(row.cellId(), row.row(), row.col(), row.type(), row.label(), null, null, null, null,
					null);
		}
		boolean booked = row.bookingId() != null;
		boolean mine = booked && row.bookedByUserId() == callerUserId;
		return new CellView(row.cellId(), row.row(), row.col(), row.type(), row.label(),
				booked ? DeskStatus.BOOKED : DeskStatus.AVAILABLE, row.bookedByName(), row.bookedByUsername(),
				mine ? row.bookingId() : null, row.lastSeq());
	}

}
