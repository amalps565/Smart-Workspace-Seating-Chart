package com.smartworkspace.seating;

import com.smartworkspace.seating.security.TokenService;
import com.smartworkspace.seating.user.User;
import com.smartworkspace.seating.user.UserRepository;
import org.junit.jupiter.api.AfterEach;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Base class for integration tests against Testcontainers PostgreSQL. Tests that extend it share one cached
 * application context, and so one database container. Bookings are deleted after each test.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = { "spring.jpa.properties.hibernate.generate_statistics=true",
		"logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=WARN" })
@AutoConfigureMockMvc
public abstract class IntegrationTest {

	@Autowired
	protected JdbcTemplate jdbc;

	@Autowired
	private TokenService tokenService;

	@Autowired
	private UserRepository userRepository;

	@AfterEach
	void deleteBookings() {
		this.jdbc.update("delete from bookings");
	}

	/** An {@code Authorization} header value for a seeded user. */
	protected String bearer(String username) {
		User user = this.userRepository.findByUsername(username).orElseThrow();
		return "Bearer " + this.tokenService.issue(user.getId(), user.getUsername(), user.getDisplayName());
	}

	protected long userId(String username) {
		return this.jdbc.queryForObject("select id from users where username = ?", Long.class, username);
	}

	protected long floorId(String name) {
		return this.jdbc.queryForObject("select id from floors where name = ?", Long.class, name);
	}

	protected long cellId(long floorId, int row, int col) {
		return this.jdbc.queryForObject("select id from cells where floor_id = ? and row = ? and col = ?", Long.class,
				floorId, row, col);
	}

}
