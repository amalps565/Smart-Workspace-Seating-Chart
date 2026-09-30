package com.smartworkspace.seating.security;

import java.time.Clock;
import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Issues signed JWTs. The subject is the username; {@code uid} and {@code name} carry the user id and display name.
 */
@Service
public class TokenService {

	static final String ISSUER = "smart-workspace-seating";

	static final String CLAIM_USER_ID = "uid";

	static final String CLAIM_NAME = "name";

	private final JwtEncoder encoder;

	private final JwtProperties properties;

	private final Clock clock;

	public TokenService(JwtEncoder encoder, JwtProperties properties, Clock clock) {
		this.encoder = encoder;
		this.properties = properties;
		this.clock = clock;
	}

	public String issue(long userId, String username, String displayName) {
		Instant now = this.clock.instant();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(ISSUER)
			.subject(username)
			.issuedAt(now)
			.expiresAt(now.plus(this.properties.ttl()))
			.claim(CLAIM_USER_ID, userId)
			.claim(CLAIM_NAME, displayName)
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return this.encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

}
