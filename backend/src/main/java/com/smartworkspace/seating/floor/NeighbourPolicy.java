package com.smartworkspace.seating.floor;

import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Component;

/**
 * The single place that decides which desks are neighbours, driven by the floor's {@link NeighbourMode}.
 * <p>
 * {@code ORTHOGONAL}: the 4 cells sharing an edge. {@code ALL}: the 8 surrounding cells. Only {@code DESK} cells
 * count; walkways, walls, and rooms are never neighbours. Edge and corner desks simply have fewer neighbours.
 */
@Component
public class NeighbourPolicy {

	/** How far (in rows and columns) a neighbour can be in any supported mode. */
	static final int REACH = 1;

	private final CellRepository cells;

	public NeighbourPolicy(CellRepository cells) {
		this.cells = cells;
	}

	/**
	 * Loads the neighbouring desks of {@code desk} on {@code floor}. Reads only the cells around the desk.
	 */
	public List<Cell> neighbourDesks(Floor floor, Cell desk) {
		List<Cell> nearby = this.cells.findByFloorIdAndRowBetweenAndColBetween(floor.getId(), desk.getRow() - REACH,
				desk.getRow() + REACH, desk.getCol() - REACH, desk.getCol() + REACH);
		return neighbourDesks(floor.getNeighbourMode(), desk, nearby);
	}

	/**
	 * Filters {@code candidates} down to the desks that neighbour {@code desk} under {@code mode}.
	 */
	public List<Cell> neighbourDesks(NeighbourMode mode, Cell desk, Collection<Cell> candidates) {
		return candidates.stream()
			.filter(Cell::isDesk)
			.filter((cell) -> cell.getFloorId().equals(desk.getFloorId()))
			.filter((cell) -> areNeighbours(mode, desk.getRow(), desk.getCol(), cell.getRow(), cell.getCol()))
			.toList();
	}

	/**
	 * Whether the cells at the two positions are neighbours under {@code mode}. A cell is never its own neighbour.
	 */
	public boolean areNeighbours(NeighbourMode mode, int row1, int col1, int row2, int col2) {
		int rowDistance = Math.abs(row1 - row2);
		int colDistance = Math.abs(col1 - col2);
		if (rowDistance == 0 && colDistance == 0) {
			return false;
		}
		return switch (mode) {
			case ORTHOGONAL -> rowDistance + colDistance == 1;
			case ALL -> rowDistance <= REACH && colDistance <= REACH;
		};
	}

}
