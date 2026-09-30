package com.smartworkspace.seating;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

class MigrationIntegrationTest extends IntegrationTest {

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void seedsDemoUsers() {
		assertThat(this.jdbc.queryForList("select username from users order by username", String.class))
			.contains("alice", "bob", "carol", "dave", "erin");
	}

	@Test
	void seedsFloor3WithWalkwayColumn() {
		Long floorId = this.jdbc.queryForObject(
				"select id from floors where name = 'Floor 3' and rows = 8 and cols = 12 and neighbour_mode = 'ORTHOGONAL'",
				Long.class);
		assertThat(this.jdbc.queryForObject("select count(*) from cells where floor_id = ?", Integer.class, floorId))
			.isEqualTo(96);
		assertThat(this.jdbc.queryForList("select distinct col from cells where floor_id = ? and type = 'WALKWAY'",
				Integer.class, floorId))
			.containsExactly(6);
		assertThat(this.jdbc.queryForObject("select label from cells where floor_id = ? and row = 1 and col = 7",
				String.class, floorId))
			.isEqualTo("3-B8");
	}

	@Test
	void neighbourModeIsConstrained() {
		assertThatThrownBy(() -> this.jdbc
			.update("insert into floors (name, rows, cols, neighbour_mode) values ('Bad', 1, 1, 'DIAGONAL')"))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void deskStatusSequenceExists() {
		assertThat(this.jdbc.queryForObject("select count(*) from pg_class where relkind = 'S' and relname = 'desk_status_seq'",
				Integer.class))
			.isEqualTo(1);
	}

}
