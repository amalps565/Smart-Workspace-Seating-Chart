package com.smartworkspace.seating.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The application clock, in the office time zone. Inject it instead of calling {@code now()} so tests can fix time.
 */
@Configuration(proxyBeanMethods = false)
class ClockConfig {

	@Bean
	Clock clock(BookingProperties properties) {
		return Clock.system(properties.zone());
	}

}
