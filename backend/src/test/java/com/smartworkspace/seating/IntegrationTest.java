package com.smartworkspace.seating;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

/**
 * Base class for integration tests against Testcontainers PostgreSQL. Tests that extend it share one cached
 * application context, and so one database container.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
public abstract class IntegrationTest {

}
