package com.smartworkspace.seating.auth;

import java.util.Optional;

import com.smartworkspace.seating.common.ApiException;
import com.smartworkspace.seating.common.ErrorCodes;
import com.smartworkspace.seating.security.TokenService;
import com.smartworkspace.seating.user.User;
import com.smartworkspace.seating.user.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Checks a username and password and issues a JWT.
 */
@Service
public class AuthService {

	private final UserRepository users;

	private final PasswordEncoder passwordEncoder;

	private final TokenService tokens;

	/** Compared against when the user doesn't exist, so both failure paths take about as long. */
	private final String dummyHash;

	public AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokens) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.tokens = tokens;
		this.dummyHash = passwordEncoder.encode("not-a-real-password");
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		Optional<User> user = this.users.findByUsername(request.username());
		String hash = user.map(User::getPasswordHash).orElse(this.dummyHash);
		boolean matches = this.passwordEncoder.matches(request.password(), hash);
		if (user.isEmpty() || !matches) {
			throw ApiException.unauthorized(ErrorCodes.INVALID_CREDENTIALS, "Invalid username or password.");
		}
		User found = user.get();
		String token = this.tokens.issue(found.getId(), found.getUsername(), found.getDisplayName());
		return new LoginResponse(token, found.getUsername(), found.getDisplayName());
	}

}
