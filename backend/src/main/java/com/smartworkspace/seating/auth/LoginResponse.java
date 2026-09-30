package com.smartworkspace.seating.auth;

public record LoginResponse(String token, String username, String displayName) {
}
