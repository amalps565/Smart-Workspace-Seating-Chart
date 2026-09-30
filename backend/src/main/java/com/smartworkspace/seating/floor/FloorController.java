package com.smartworkspace.seating.floor;

import java.time.LocalDate;
import java.util.List;

import com.smartworkspace.seating.security.CurrentUser;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/floors")
class FloorController {

	private final FloorService floorService;

	FloorController(FloorService floorService) {
		this.floorService = floorService;
	}

	@GetMapping
	List<FloorSummary> list() {
		return this.floorService.listFloors();
	}

	@GetMapping("/{id}/snapshot")
	FloorSnapshot snapshot(@PathVariable long id, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
			@AuthenticationPrincipal Jwt jwt) {
		return this.floorService.snapshot(id, date, CurrentUser.from(jwt).id());
	}

}
