package com.smartworkspace.seating.booking;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

	/** Which of the given desks are booked on a date. */
	@Query("select b.deskId from Booking b where b.deskId in :deskIds and b.date = :date")
	List<Long> findBookedDeskIds(@Param("deskIds") Collection<Long> deskIds, @Param("date") LocalDate date);

	boolean existsByUserIdAndDate(Long userId, LocalDate date);

	@Modifying
	@Query("delete from Booking b where b.id = :id")
	int deleteBookingById(@Param("id") long id);

	/** A user's bookings from a date onward, with desk and floor names, soonest first. */
	@Query("""
			select new com.smartworkspace.seating.booking.MyBooking(b.id, b.deskId, c.label, b.floorId, f.name, b.date)
			from Booking b
				join Cell c on c.id = b.deskId
				join Floor f on f.id = b.floorId
			where b.userId = :userId and b.date >= :from
			order by b.date
			""")
	List<MyBooking> findUpcoming(@Param("userId") long userId, @Param("from") LocalDate from);

}
