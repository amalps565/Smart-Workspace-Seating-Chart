package com.smartworkspace.seating.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import com.smartworkspace.seating.IntegrationTest;
import com.smartworkspace.seating.booking.BookingResponse;
import com.smartworkspace.seating.booking.BookingService;
import com.smartworkspace.seating.booking.BookingWindow;
import com.smartworkspace.seating.common.ApiException;
import com.smartworkspace.seating.security.CurrentUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

class DeskUpdatesWebSocketTest extends IntegrationTest {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	@LocalServerPort
	private int port;

	@Autowired
	private BookingService bookingService;

	@Autowired
	private BookingWindow window;

	@Autowired
	private SimpleBrokerMessageHandler broker;

	private WebSocketStompClient client;

	private StompSession session;

	private long floor3;

	private LocalDate date;

	private CurrentUser bob;

	private CurrentUser carol;

	@BeforeEach
	void setUp() {
		this.client = new WebSocketStompClient(new StandardWebSocketClient());
		this.client.setDefaultHeartbeat(new long[] { 0, 0 });
		this.floor3 = floorId("Floor 3");
		this.date = this.window.today().plusDays(2);
		this.bob = new CurrentUser(userId("bob"), "bob", "Bob Brown");
		this.carol = new CurrentUser(userId("carol"), "carol", "Carol Chen");
	}

	@AfterEach
	void tearDown() {
		if (this.session != null && this.session.isConnected()) {
			this.session.disconnect();
		}
		this.client.stop();
	}

	@Test
	void subscriberReceivesUpdatesAfterBookingAndCancelWithIncreasingSeq() throws Exception {
		BlockingQueue<JsonNode> updates = subscribe("alice", topic(this.floor3, this.date));
		long desk = cellId(this.floor3, 1, 1);

		BookingResponse booked = this.bookingService.book(this.bob, desk, this.date);
		JsonNode bookedUpdate = next(updates);
		assertThat(bookedUpdate.get("deskId").asLong()).isEqualTo(desk);
		assertThat(bookedUpdate.get("date").asString()).isEqualTo(this.date.toString());
		assertThat(bookedUpdate.get("status").asString()).isEqualTo("BOOKED");
		assertThat(bookedUpdate.get("bookedBy").asString()).isEqualTo("Bob Brown");
		assertThat(bookedUpdate.get("bookedByUsername").asString()).isEqualTo("bob");
		// The socket carries exactly the seq returned in the 201 body, and never a bookingId.
		assertThat(bookedUpdate.get("seq").asLong()).isEqualTo(booked.seq());
		assertThat(bookedUpdate.has("bookingId")).isFalse();

		this.bookingService.cancel(this.bob, booked.id());
		JsonNode cancelledUpdate = next(updates);
		assertThat(cancelledUpdate.get("deskId").asLong()).isEqualTo(desk);
		assertThat(cancelledUpdate.get("status").asString()).isEqualTo("AVAILABLE");
		assertThat(cancelledUpdate.get("bookedBy").isNull()).isTrue();
		assertThat(cancelledUpdate.get("bookedByUsername").isNull()).isTrue();
		assertThat(cancelledUpdate.get("seq").asLong()).isGreaterThan(booked.seq())
			.isEqualTo(lastSeq(desk));

		BookingResponse rebooked = this.bookingService.book(this.carol, desk, this.date);
		JsonNode rebookedUpdate = next(updates);
		assertThat(rebookedUpdate.get("bookedBy").asString()).isEqualTo("Carol Chen");
		assertThat(rebookedUpdate.get("seq").asLong()).isEqualTo(rebooked.seq())
			.isGreaterThan(cancelledUpdate.get("seq").asLong());
	}

	@Test
	void rejectedBookingPublishesNothing() throws Exception {
		BlockingQueue<JsonNode> updates = subscribe("alice", topic(this.floor3, this.date));
		long desk = cellId(this.floor3, 5, 8);
		this.bookingService.book(this.bob, desk, this.date);
		assertThat(next(updates).get("deskId").asLong()).isEqualTo(desk);

		assertThatThrownBy(() -> this.bookingService.book(this.carol, desk, this.date)).isInstanceOf(ApiException.class)
			.extracting("code")
			.isEqualTo("DESK_TAKEN");
		assertThatThrownBy(() -> this.bookingService.book(this.carol, cellId(this.floor3, 5, 9), this.date))
			.isInstanceOf(ApiException.class)
			.extracting("code")
			.isEqualTo("SPACING_VIOLATION");
		// Bob already has a booking that day.
		assertThatThrownBy(() -> this.bookingService.book(this.bob, cellId(this.floor3, 0, 0), this.date))
			.isInstanceOf(ApiException.class)
			.extracting("code")
			.isEqualTo("ALREADY_BOOKED_TODAY");

		assertThat(updates.poll(2, TimeUnit.SECONDS)).isNull();
	}

	@Test
	void updatesGoOnlyToTheMatchingFloorAndDate() throws Exception {
		BlockingQueue<JsonNode> updates = subscribe("alice", topic(this.floor3, this.date));
		long floor4 = floorId("Floor 4");

		this.bookingService.book(this.bob, cellId(floor4, 0, 0), this.date);
		this.bookingService.book(this.carol, cellId(this.floor3, 0, 0), this.date.plusDays(1));
		long desk = cellId(this.floor3, 7, 0);
		this.bookingService.book(this.carol, desk, this.date);

		assertThat(next(updates).get("deskId").asLong()).isEqualTo(desk);
		assertThat(updates.poll(1, TimeUnit.SECONDS)).isNull();
	}

	@Test
	void connectWithoutATokenIsRejected() throws Exception {
		assertConnectRejected(new StompHeaders());
	}

	@Test
	void connectWithAnInvalidTokenIsRejected() throws Exception {
		StompHeaders headers = new StompHeaders();
		headers.add("Authorization", "Bearer not-a-valid-jwt");
		assertConnectRejected(headers);
	}

	private void assertConnectRejected(StompHeaders connectHeaders) throws Exception {
		RecordingHandler handler = new RecordingHandler();
		CompletableFuture<StompSession> future = this.client.connectAsync(url(), new WebSocketHttpHeaders(),
				connectHeaders, handler);

		assertThat(handler.rejected.await(30, TimeUnit.SECONDS)).as("ERROR frame or closed connection").isTrue();
		assertThat(handler.connected).as("session reached CONNECTED").isFalse();
		if (future.isDone() && !future.isCompletedExceptionally()) {
			assertThat(future.get().isConnected()).isFalse();
		}
	}

	private BlockingQueue<JsonNode> subscribe(String username, String topic) throws Exception {
		StompHeaders connectHeaders = new StompHeaders();
		connectHeaders.add("Authorization", bearer(username));
		this.session = this.client.connectAsync(url(), new WebSocketHttpHeaders(), connectHeaders,
				new StompSessionHandlerAdapter() {
				})
			.get(30, TimeUnit.SECONDS);

		BlockingQueue<JsonNode> updates = new LinkedBlockingQueue<>();
		this.session.subscribe(topic, new StompFrameHandler() {

			@Override
			public Type getPayloadType(StompHeaders headers) {
				return byte[].class;
			}

			@Override
			public void handleFrame(StompHeaders headers, Object payload) {
				updates.add(JSON.readTree(new String((byte[]) payload, StandardCharsets.UTF_8)));
			}

		});
		awaitSubscription(topic);
		return updates;
	}

	/** SUBSCRIBE is processed asynchronously and the simple broker sends no receipts, so wait for the broker. */
	private void awaitSubscription(String topic) throws InterruptedException {
		SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
		accessor.setDestination(topic);
		Message<byte[]> probe = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
		Instant deadline = Instant.now().plus(Duration.ofSeconds(30));
		while (this.broker.getSubscriptionRegistry().findSubscriptions(probe).isEmpty()) {
			assertThat(Instant.now()).as("subscription registered").isBefore(deadline);
			Thread.sleep(20);
		}
	}

	private static JsonNode next(BlockingQueue<JsonNode> updates) throws InterruptedException {
		JsonNode update = updates.poll(10, TimeUnit.SECONDS);
		assertThat(update).as("desk update").isNotNull();
		return update;
	}

	private long lastSeq(long deskId) {
		return this.jdbc.queryForObject("select last_seq from cells where id = ?", Long.class, deskId);
	}

	private String url() {
		return "ws://localhost:" + this.port + "/ws";
	}

	private static String topic(long floorId, LocalDate date) {
		return "/topic/floors/" + floorId + "/" + date;
	}

	private static final class RecordingHandler extends StompSessionHandlerAdapter {

		private final CountDownLatch rejected = new CountDownLatch(1);

		private volatile boolean connected;

		@Override
		public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
			this.connected = true;
		}

		@Override
		public void handleFrame(StompHeaders headers, Object payload) {
			// Session-level frames outside a subscription are ERROR frames.
			this.rejected.countDown();
		}

		@Override
		public void handleTransportError(StompSession session, Throwable exception) {
			this.rejected.countDown();
		}

	}

}
