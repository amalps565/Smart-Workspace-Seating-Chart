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
 * A floor's grid size and neighbour mode. Created only through seed migrations.
 */
@Entity
@Table(name = "floors")
public class Floor {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@Column(name = "rows", nullable = false)
	private int rows;

	@Column(name = "cols", nullable = false)
	private int cols;

	@Enumerated(EnumType.STRING)
	@Column(name = "neighbour_mode", nullable = false)
	private NeighbourMode neighbourMode;

	protected Floor() {
	}

	public Floor(Long id, String name, int rows, int cols, NeighbourMode neighbourMode) {
		this.id = id;
		this.name = name;
		this.rows = rows;
		this.cols = cols;
		this.neighbourMode = neighbourMode;
	}

	public Long getId() {
		return this.id;
	}

	public String getName() {
		return this.name;
	}

	public int getRows() {
		return this.rows;
	}

	public int getCols() {
		return this.cols;
	}

	public NeighbourMode getNeighbourMode() {
		return this.neighbourMode;
	}

}
