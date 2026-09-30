package com.smartworkspace.seating.floor;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CellRepository extends JpaRepository<Cell, Long> {

	/**
	 * Every cell of a floor with its booking and booker for one date, in a single query. Reading {@code last_seq}
	 * in the same statement as the bookings keeps each desk's status and version consistent with each other.
	 */
	@Query("""
			select new com.smartworkspace.seating.floor.SnapshotRow(
				c.id, c.row, c.col, c.type, c.label, c.lastSeq, b.id, b.userId, u.username, u.displayName)
			from Cell c
				left join Booking b on b.deskId = c.id and b.date = :date
				left join User u on u.id = b.userId
			where c.floorId = :floorId
			order by c.row, c.col
			""")
	List<SnapshotRow> findSnapshotRows(@Param("floorId") long floorId, @Param("date") LocalDate date);

}
