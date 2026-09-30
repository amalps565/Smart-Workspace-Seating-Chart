package com.smartworkspace.seating.auth;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartworkspace.seating.IntegrationTest;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

class AuthIntegrationTest extends IntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Test
	void loginWithValidCredentialsReturnsToken() throws Exception {
		this.mvc.perform(login("alice", "password"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").value(not(emptyOrNullString())))
			.andExpect(jsonPath("$.username").value("alice"))
			.andExpect(jsonPath("$.displayName").value("Alice Anders"));
	}

	@Test
	void loginWithWrongPasswordReturns401() throws Exception {
		this.mvc.perform(login("alice", "wrong"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
			.andExpect(jsonPath("$.message").isNotEmpty());
	}

	@Test
	void loginWithUnknownUserReturns401() throws Exception {
		this.mvc.perform(login("mallory", "password"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	void loginWithBlankFieldsReturnsValidationError() throws Exception {
		this.mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void protectedEndpointWithoutTokenReturns401() throws Exception {
		this.mvc.perform(get("/api/floors"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().string("WWW-Authenticate", "Bearer"))
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void protectedEndpointWithInvalidTokenReturns401() throws Exception {
		this.mvc.perform(get("/api/floors").header("Authorization", "Bearer not-a-jwt"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void validTokenIsAcceptedOnProtectedPaths() throws Exception {
		String body = this.mvc.perform(login("bob", "password")).andReturn().getResponse().getContentAsString();
		String token = body.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");

		// No handler exists at this path, so getting past security yields the JSON 404 rather than a 401.
		this.mvc.perform(get("/api/does-not-exist").header("Authorization", "Bearer " + token))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	private static org.springframework.test.web.servlet.RequestBuilder login(String username, String password) {
		return post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}");
	}

}
