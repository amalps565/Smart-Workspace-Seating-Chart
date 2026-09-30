package com.smartworkspace.seating.floor;

/**
 * The kind of a grid cell. Only {@link #DESK} cells are bookable or count as neighbours.
 */
public enum CellType {

	DESK, WALKWAY, WALL, ROOM

}
