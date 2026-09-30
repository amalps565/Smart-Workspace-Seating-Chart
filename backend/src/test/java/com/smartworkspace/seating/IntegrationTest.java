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
 * application context, and so one database container. The app runs on a random port (for WebSocket tests) and
 * MockMvc is available for REST tests. Bookings are deleted after each test.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = { "spring.jpa.properties.hibernate.generate_statistics=true",
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

	/**
	 * Creates a test floor once (by name) from a layout: {@code D} desk, {@code -} walkway, {@code #} wall,
	 * {@code R} room. Returns its id.
	 */
	protected long ensureFloor(String name, String neighbourMode, String... layout) {
		java.util.List<Long> existing = this.jdbc.queryForList("select id from floors where name = ?", Long.class,
				name);
		if (!existing.isEmpty()) {
			return existing.get(0);
		}
		long floorId = this.jdbc.queryForObject(
				"insert into floors (name, rows, cols, neighbour_mode) values (?, ?, ?, ?) returning id", Long.class,
				name, layout.length, layout[0].length(), neighbourMode);
		for (int r = 0; r < layout.length; r++) {
			for (int c = 0; c < layout[r].length(); c++) {
				String type = switch (layout[r].charAt(c)) {
					case 'D' -> "DESK";
					case 'R' -> "ROOM";
					case '#' -> "WALL";
					default -> "WALKWAY";
				};
				this.jdbc.update("insert into cells (floor_id, row, col, type, label) values (?, ?, ?, ?, ?)", floorId,
						r, c, type, "DESK".equals(type) ? name + "-r" + r + "c" + c : null);
			}
		}
		return floorId;
	}

	/** Creates a user once (by username) and returns its id. */
	protected long ensureUser(String username) {
		this.jdbc.update(
				"insert into users (username, password_hash, display_name) values (?, '{noop}unused', ?) on conflict (username) do nothing",
				username, "User " + username);
		return userId(username);
	}

}
