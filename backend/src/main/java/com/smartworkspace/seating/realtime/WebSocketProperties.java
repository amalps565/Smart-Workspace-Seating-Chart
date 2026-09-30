package com.smartworkspace.seating.realtime;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * WebSocket settings. Browsers send an {@code Origin} header on the handshake; only these origin patterns are
 * accepted (requests without an {@code Origin}, such as non-browser clients, are unaffected).
 */
@ConfigurationProperties("app.websocket")
public record WebSocketProperties(
		@DefaultValue({ "http://localhost:*", "http://127.0.0.1:*" }) List<String> allowedOriginPatterns) {
}
