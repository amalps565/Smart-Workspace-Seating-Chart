package com.smartworkspace.seating.booking;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One desk booked by one user for one whole day. Cancelling deletes the row.
 */
@Entity
@Table(name = "bookings")
public class Booking {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "desk_id", nullable = false)
	private Long deskId;

	@Column(name = "floor_id", nullable = false)
	private Long floorId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "date", nullable = false)
	private LocalDate date;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Booking() {
	}

	public Booking(Long deskId, Long floorId, Long userId, LocalDate date, Instant createdAt) {
		this.deskId = deskId;
		this.floorId = floorId;
		this.userId = userId;
		this.date = date;
		this.createdAt = createdAt;
	}

	public Long getId() {
		return this.id;
	}

	public Long getDeskId() {
		return this.deskId;
	}

	public Long getFloorId() {
		return this.floorId;
	}

	public Long getUserId() {
		return this.userId;
	}

	public LocalDate getDate() {
		return this.date;
	}

	public Instant getCreatedAt() {
		return this.createdAt;
	}

}
