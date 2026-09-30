package com.smartworkspace.seating.booking;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;

import com.smartworkspace.seating.security.CurrentUser;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
class BookingController {

	private final BookingService bookingService;

	BookingController(BookingService bookingService) {
		this.bookingService = bookingService;
	}

	@PostMapping
	ResponseEntity<BookingResponse> book(@Valid @RequestBody BookingRequest request, @AuthenticationPrincipal Jwt jwt) {
		BookingResponse booking = this.bookingService.book(CurrentUser.from(jwt), request.deskId(), request.date());
		return ResponseEntity.created(URI.create("/api/bookings/" + booking.id())).body(booking);
	}

	@DeleteMapping("/{id}")
	ResponseEntity<Void> cancel(@PathVariable long id, @AuthenticationPrincipal Jwt jwt) {
		this.bookingService.cancel(CurrentUser.from(jwt), id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/me")
	List<MyBooking> mine(@AuthenticationPrincipal Jwt jwt) {
		return this.bookingService.upcoming(CurrentUser.from(jwt));
	}

}
