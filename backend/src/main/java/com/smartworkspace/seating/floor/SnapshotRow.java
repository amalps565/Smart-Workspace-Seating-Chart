package com.smartworkspace.seating.floor;

/**
 * One cell of a floor joined with its booking (if any) for a date. Booking columns are null when the cell is free.
 */
public record SnapshotRow(Long cellId, int row, int col, CellType type, String label, long lastSeq, Long bookingId,
		Long bookedByUserId, String bookedByUsername, String bookedByName) {
}
