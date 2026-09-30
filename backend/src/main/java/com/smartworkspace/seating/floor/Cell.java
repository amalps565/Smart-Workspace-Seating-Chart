package com.smartworkspace.seating.floor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One cell of a floor's grid: a desk, walkway, wall, or room. {@code lastSeq} is the desk's current version, taken
 * from {@code desk_status_seq} on every booking or cancel.
 */
@Entity
@Table(name = "cells")
public class Cell {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "floor_id", nullable = false)
	private Long floorId;

	@Column(name = "row", nullable = false)
	private int row;

	@Column(name = "col", nullable = false)
	private int col;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private CellType type;

	private String label;

	@Column(name = "last_seq", nullable = false)
	private long lastSeq;

	protected Cell() {
	}

	public Cell(Long id, Long floorId, int row, int col, CellType type, String label) {
		this.id = id;
		this.floorId = floorId;
		this.row = row;
		this.col = col;
		this.type = type;
		this.label = label;
	}

	public Long getId() {
		return this.id;
	}

	public Long getFloorId() {
		return this.floorId;
	}

	public int getRow() {
		return this.row;
	}

	public int getCol() {
		return this.col;
	}

	public CellType getType() {
		return this.type;
	}

	public boolean isDesk() {
		return this.type == CellType.DESK;
	}

	public String getLabel() {
		return this.label;
	}

	public long getLastSeq() {
		return this.lastSeq;
	}

	public void setLastSeq(long lastSeq) {
		this.lastSeq = lastSeq;
	}

}
