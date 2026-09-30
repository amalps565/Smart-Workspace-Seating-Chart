package com.smartworkspace.seating;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class ApplicationSmokeTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void contextLoadsAndConnectsToPostgres() {
		String version = jdbcTemplate.queryForObject("select version()", String.class);

		assertThat(version).startsWith("PostgreSQL 17");
	}

}
