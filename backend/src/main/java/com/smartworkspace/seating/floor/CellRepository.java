package com.smartworkspace.seating.floor;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

	/** The cells in a rectangle of a floor; used by the neighbour policy to read the cells around a desk. */
	List<Cell> findByFloorIdAndRowBetweenAndColBetween(long floorId, int rowFrom, int rowTo, int colFrom, int colTo);

	/**
	 * Locks the given cells with {@code SELECT ... FOR UPDATE}, in ascending id order. PostgreSQL applies the row
	 * locks after the sort, so every transaction acquires overlapping locks in the same order and cannot deadlock.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select c from Cell c where c.id in :ids order by c.id")
	List<Cell> lockInIdOrder(@Param("ids") Collection<Long> ids);

	/** The next desk version from {@code desk_status_seq}. */
	@Query(value = "select nextval('desk_status_seq')", nativeQuery = true)
	long nextDeskSeq();

}
