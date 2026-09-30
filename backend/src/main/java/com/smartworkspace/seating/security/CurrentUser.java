package com.smartworkspace.seating.security;

import org.springframework.security.oauth2.jwt.Jwt;

/**
 * The signed-in user, read from the claims of a validated JWT.
 */
public record CurrentUser(long id, String username, String displayName) {

	public static CurrentUser from(Jwt jwt) {
		Object uid = jwt.getClaims().get(TokenService.CLAIM_USER_ID);
		if (!(uid instanceof Number number)) {
			throw new IllegalStateException("JWT is missing the uid claim");
		}
		return new CurrentUser(number.longValue(), jwt.getSubject(), jwt.getClaimAsString(TokenService.CLAIM_NAME));
	}

}
