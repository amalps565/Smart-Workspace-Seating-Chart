package com.smartworkspace.seating.common;

/**
 * The error body every endpoint returns: {@code {code, message}}.
 */
public record ErrorResponse(String code, String message) {
}
