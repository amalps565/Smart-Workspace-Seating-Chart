package com.smartworkspace.seating.floor;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

class NeighbourPolicyTest {

	private final NeighbourPolicy policy = new NeighbourPolicy(null);

	/**
	 * <pre>
	 *      c0 c1 c2 c3
	 * r0   D  D  D  D
	 * r1   D  D  D  -
	 * r2   D  D  D  D
	 * r3   -  D  -  R
	 * </pre>
	 */
	private final List<Cell> grid = grid("DDDD", "DDD-", "DDDD", "-D-R");

	@Test
	void middleDeskHasFourOrthogonalNeighbours() {
		assertThat(positions(NeighbourMode.ORTHOGONAL, 1, 1)).containsExactlyInAnyOrder("0,1", "1,0", "1,2", "2,1");
	}

	@Test
	void middleDeskHasEightNeighboursInAllMode() {
		assertThat(positions(NeighbourMode.ALL, 1, 1)).containsExactlyInAnyOrder("0,0", "0,1", "0,2", "1,0", "1,2",
				"2,0", "2,1", "2,2");
	}

	@Test
	void cornerDeskHasTwoOrthogonalOrThreeAllNeighbours() {
		assertThat(positions(NeighbourMode.ORTHOGONAL, 0, 0)).containsExactlyInAnyOrder("0,1", "1,0");
		assertThat(positions(NeighbourMode.ALL, 0, 0)).containsExactlyInAnyOrder("0,1", "1,0", "1,1");
	}

	@Test
	void edgeDeskHasThreeOrthogonalOrFiveAllNeighbours() {
		assertThat(positions(NeighbourMode.ORTHOGONAL, 0, 1)).containsExactlyInAnyOrder("0,0", "0,2", "1,1");
		assertThat(positions(NeighbourMode.ALL, 0, 1)).containsExactlyInAnyOrder("0,0", "0,2", "1,0", "1,1", "1,2");
	}

	@Test
	void walkwaysAndRoomsAreNeverNeighbours() {
		// r2c3 sits between a walkway (r1c3) and a room (r3c3).
		assertThat(positions(NeighbourMode.ORTHOGONAL, 2, 3)).containsExactlyInAnyOrder("2,2");
		assertThat(positions(NeighbourMode.ALL, 2, 3)).containsExactlyInAnyOrder("1,2", "2,2");
	}

	@Test
	void deskSurroundedByWalkwaysHasOnlyItsDeskNeighbours() {
		// r3c1 has walkways left and right; only r2c1 above is a desk.
		assertThat(positions(NeighbourMode.ORTHOGONAL, 3, 1)).containsExactlyInAnyOrder("2,1");
		assertThat(positions(NeighbourMode.ALL, 3, 1)).containsExactlyInAnyOrder("2,0", "2,1", "2,2");
	}

	@Test
	void deskWithOnlyWalkwaysAroundHasNoNeighbours() {
		List<Cell> island = grid("---", "-D-", "---");
		Cell desk = at(island, 1, 1);
		assertThat(this.policy.neighbourDesks(NeighbourMode.ORTHOGONAL, desk, island)).isEmpty();
		assertThat(this.policy.neighbourDesks(NeighbourMode.ALL, desk, island)).isEmpty();
	}

	@Test
	void cellsOnOtherFloorsAreIgnored() {
		Cell desk = at(this.grid, 0, 0);
		Cell otherFloor = new Cell(999L, 2L, 0, 1, CellType.DESK, "x");
		assertThat(this.policy.neighbourDesks(NeighbourMode.ALL, desk, List.of(otherFloor))).isEmpty();
	}

	@Test
	void neighbourRelationIsSymmetricAndIrreflexive() {
		for (NeighbourMode mode : NeighbourMode.values()) {
			for (int r1 = 0; r1 < 3; r1++) {
				for (int c1 = 0; c1 < 3; c1++) {
					assertThat(this.policy.areNeighbours(mode, r1, c1, r1, c1)).isFalse();
					for (int r2 = 0; r2 < 3; r2++) {
						for (int c2 = 0; c2 < 3; c2++) {
							assertThat(this.policy.areNeighbours(mode, r1, c1, r2, c2))
								.isEqualTo(this.policy.areNeighbours(mode, r2, c2, r1, c1));
						}
					}
				}
			}
		}
	}

	private List<String> positions(NeighbourMode mode, int row, int col) {
		return this.policy.neighbourDesks(mode, at(this.grid, row, col), this.grid)
			.stream()
			.map((cell) -> cell.getRow() + "," + cell.getCol())
			.toList();
	}

	private static Cell at(List<Cell> cells, int row, int col) {
		return cells.stream().filter((c) -> c.getRow() == row && c.getCol() == col).findFirst().orElseThrow();
	}

	private static List<Cell> grid(String... rows) {
		List<Cell> cells = new ArrayList<>();
		long id = 1;
		for (int r = 0; r < rows.length; r++) {
			for (int c = 0; c < rows[r].length(); c++) {
				CellType type = switch (rows[r].charAt(c)) {
					case 'D' -> CellType.DESK;
					case 'R' -> CellType.ROOM;
					case '#' -> CellType.WALL;
					default -> CellType.WALKWAY;
				};
				cells.add(new Cell(id++, 1L, r, c, type, type == CellType.DESK ? r + "-" + c : null));
			}
		}
		return cells;
	}

}
