package com.smartworkspace.seating.floor;

import java.time.LocalDate;
import java.util.List;

public record FloorSnapshot(long floorId, LocalDate date, int rows, int cols, NeighbourMode neighbourMode,
		List<CellView> cells) {
}
