package com.smartworkspace.seating.floor;

/**
 * Which surrounding desks count as neighbours on a floor. Interpreted only by the neighbour policy.
 */
public enum NeighbourMode {

	/** The 4 desks sharing an edge. */
	ORTHOGONAL,

	/** All 8 surrounding desks, including diagonals. */
	ALL

}
