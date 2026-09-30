package com.smartworkspace.seating.floor;

public record FloorSummary(long id, String name, int rows, int cols, NeighbourMode neighbourMode) {

	static FloorSummary from(Floor floor) {
		return new FloorSummary(floor.getId(), floor.getName(), floor.getRows(), floor.getCols(),
				floor.getNeighbourMode());
	}

}
