package com.smartworkspace.seating.realtime;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over plain WebSocket at {@code /ws} (no SockJS), with the in-memory broker on {@code /topic}. The JWT is
 * checked on the STOMP CONNECT frame by {@link StompAuthInterceptor}.
 */
@Configuration(proxyBeanMethods = false)
@EnableWebSocketMessageBroker
class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	/** Server and client heartbeats, in milliseconds. */
	private static final long[] HEARTBEAT = { 10_000, 10_000 };

	private final StompAuthInterceptor authInterceptor;

	private final WebSocketProperties properties;

	private final TaskScheduler messageBrokerTaskScheduler;

	WebSocketConfig(StompAuthInterceptor authInterceptor, WebSocketProperties properties,
			@Lazy @Qualifier("messageBrokerTaskScheduler") TaskScheduler messageBrokerTaskScheduler) {
		this.authInterceptor = authInterceptor;
		this.properties = properties;
		this.messageBrokerTaskScheduler = messageBrokerTaskScheduler;
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry.addEndpoint("/ws")
			.setAllowedOriginPatterns(this.properties.allowedOriginPatterns().toArray(String[]::new));
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		// Deliver each session's messages in publish order (clients still order by seq).
		registry.setPreservePublishOrder(true);
		registry.enableSimpleBroker("/topic")
			.setHeartbeatValue(HEARTBEAT)
			.setTaskScheduler(this.messageBrokerTaskScheduler);
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(this.authInterceptor);
	}

}
