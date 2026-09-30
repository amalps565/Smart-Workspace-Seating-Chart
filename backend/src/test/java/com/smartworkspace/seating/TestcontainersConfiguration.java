package com.smartworkspace.seating;

import java.time.Duration;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	public PostgreSQLContainer postgresContainer() {
		// Keep in sync with the image in docker-compose.yml.
		// Generous startup timeout: Docker Desktop on small VMs can take over a minute to start PostgreSQL.
		return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"))
			.withStartupTimeout(Duration.ofMinutes(4));
	}

}
