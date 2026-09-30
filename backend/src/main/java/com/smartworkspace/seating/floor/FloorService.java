package com.smartworkspace.seating.floor;

import java.time.LocalDate;
import java.util.List;

import com.smartworkspace.seating.booking.BookingWindow;
import com.smartworkspace.seating.common.ApiException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads floors and floor snapshots. A snapshot runs a fixed number of queries whatever the floor size.
 */
@Service
public class FloorService {

	private final FloorRepository floors;

	private final CellRepository cells;

	private final BookingWindow window;

	public FloorService(FloorRepository floors, CellRepository cells, BookingWindow window) {
		this.floors = floors;
		this.cells = cells;
		this.window = window;
	}

	@Transactional(readOnly = true)
	public List<FloorSummary> listFloors() {
		return this.floors.findAllByOrderByIdAsc().stream().map(FloorSummary::from).toList();
	}

	@Transactional(readOnly = true)
	public FloorSnapshot snapshot(long floorId, LocalDate date, long callerUserId) {
		this.window.check(date);
		Floor floor = this.floors.findById(floorId)
			.orElseThrow(() -> ApiException.notFound("Floor " + floorId + " does not exist."));
		List<CellView> cellViews = this.cells.findSnapshotRows(floorId, date)
			.stream()
			.map((row) -> CellView.from(row, callerUserId))
			.toList();
		return new FloorSnapshot(floor.getId(), date, floor.getRows(), floor.getCols(), floor.getNeighbourMode(),
				cellViews);
	}

}
