package com.smartworkspace.seating.realtime;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Authenticates STOMP sessions with the same JWT as the REST API.
 * <ul>
 * <li>{@code CONNECT} must carry an {@code Authorization: Bearer <jwt>} header with a valid token; the session's
 * user is set from it. Otherwise the connection is rejected with an ERROR frame.</li>
 * <li>{@code SUBSCRIBE} needs an authenticated session and is allowed only to
 * {@code /topic/floors/{floorId}/{date}}.</li>
 * <li>{@code SEND} is rejected: clients only listen, so nobody can broadcast fake desk updates.</li>
 * </ul>
 */
@Component
class StompAuthInterceptor implements ChannelInterceptor {

	private static final Pattern FLOOR_TOPIC = Pattern.compile("/topic/floors/\\d+/\\d{4}-\\d{2}-\\d{2}");

	private static final String BEARER_PREFIX = "Bearer ";

	private final JwtDecoder jwtDecoder;

	StompAuthInterceptor(JwtDecoder jwtDecoder) {
		this.jwtDecoder = jwtDecoder;
	}

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
		if (accessor == null || accessor.getCommand() == null) {
			return message;
		}
		switch (accessor.getCommand()) {
			case CONNECT, STOMP -> accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
			case SUBSCRIBE -> checkSubscribe(accessor);
			case SEND -> throw new MessageDeliveryException("Clients cannot send messages.");
			default -> {
			}
		}
		return message;
	}

	private JwtAuthenticationToken authenticate(String authorization) {
		if (authorization == null || !authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
			throw new MessageDeliveryException("A bearer token is required to connect.");
		}
		try {
			Jwt jwt = this.jwtDecoder.decode(authorization.substring(BEARER_PREFIX.length()).trim());
			return new JwtAuthenticationToken(jwt, List.of(), jwt.getSubject());
		}
		catch (JwtException ex) {
			throw new MessageDeliveryException("The bearer token is invalid or expired.");
		}
	}

	private static void checkSubscribe(StompHeaderAccessor accessor) {
		if (accessor.getUser() == null) {
			throw new MessageDeliveryException("Not authenticated.");
		}
		String destination = accessor.getDestination();
		if (destination == null || !FLOOR_TOPIC.matcher(destination).matches()) {
			throw new MessageDeliveryException("Subscriptions are allowed only to /topic/floors/{floorId}/{date}.");
		}
	}

}
