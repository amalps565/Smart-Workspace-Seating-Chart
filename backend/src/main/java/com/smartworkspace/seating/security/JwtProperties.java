package com.smartworkspace.seating.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * JWT settings. The secret signs tokens with HMAC-SHA256, so it must be at least 32 bytes.
 */
@ConfigurationProperties("app.jwt")
public record JwtProperties(String secret, @DefaultValue("8h") Duration ttl) {

	public JwtProperties {
		if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
			throw new IllegalArgumentException("app.jwt.secret must be at least 32 bytes");
		}
		if (ttl.isNegative() || ttl.isZero()) {
			throw new IllegalArgumentException("app.jwt.ttl must be positive");
		}
	}

}
