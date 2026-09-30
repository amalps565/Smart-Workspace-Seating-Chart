package com.smartworkspace.seating.config;

import java.time.ZoneId;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Booking settings: the office time zone that defines "today", and how many days ahead bookings are allowed.
 */
@ConfigurationProperties("app.booking")
public record BookingProperties(@DefaultValue("UTC") ZoneId zone, @DefaultValue("14") int windowDays) {

	public BookingProperties {
		if (windowDays < 0) {
			throw new IllegalArgumentException("app.booking.window-days must not be negative");
		}
	}

}
