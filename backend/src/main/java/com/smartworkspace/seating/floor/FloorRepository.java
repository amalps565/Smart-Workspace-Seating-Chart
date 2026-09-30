package com.smartworkspace.seating.floor;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FloorRepository extends JpaRepository<Floor, Long> {

	List<Floor> findAllByOrderByIdAsc();

}
