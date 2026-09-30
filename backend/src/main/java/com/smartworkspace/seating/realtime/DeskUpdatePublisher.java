package com.smartworkspace.seating.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Broadcasts desk changes to {@code /topic/floors/{floorId}/{date}} only after the booking transaction commits, so a
 * rolled-back change (for example a 409) is never sent.
 */
@Component
class DeskUpdatePublisher {

	private static final Logger log = LoggerFactory.getLogger(DeskUpdatePublisher.class);

	private final SimpMessagingTemplate messagingTemplate;

	DeskUpdatePublisher(SimpMessagingTemplate messagingTemplate) {
		this.messagingTemplate = messagingTemplate;
	}

	static String topic(long floorId, java.time.LocalDate date) {
		return "/topic/floors/" + floorId + "/" + date;
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	void onDeskStatusChanged(DeskStatusChanged event) {
		try {
			this.messagingTemplate.convertAndSend(topic(event.floorId(), event.date()), DeskUpdate.from(event));
		}
		catch (RuntimeException ex) {
			// The change is already committed; a failed broadcast must not turn the request into an error. Clients
			// recover by reloading the snapshot.
			log.warn("Failed to publish desk update for desk {} on {}", event.deskId(), event.date(), ex);
		}
	}

}
