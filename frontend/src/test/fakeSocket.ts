import type { DeskUpdate } from '../api/types'
import type { ConnectionStatus, FloorSocket } from '../features/floor/socket'

/** In-memory stand-in for the STOMP client. */
export class FakeSocket implements FloorSocket {
  status: ConnectionStatus
  started = false
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()
  private readonly topics = new Map<string, Set<(body: string) => void>>()

  constructor(status: ConnectionStatus = 'connected') {
    this.status = status
  }

  start() {
    this.started = true
  }

  stop() {
    this.started = false
  }

  getStatus = () => this.status

  onStatus(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  subscribe(topic: string, onMessage: (body: string) => void) {
    const handlers = this.topics.get(topic) ?? new Set()
    handlers.add(onMessage)
    this.topics.set(topic, handlers)
    return () => {
      handlers.delete(onMessage)
      if (handlers.size === 0) this.topics.delete(topic)
    }
  }

  isSubscribed(topic: string) {
    return (this.topics.get(topic)?.size ?? 0) > 0
  }

  subscribedTopics() {
    return [...this.topics.keys()]
  }

  setStatus(status: ConnectionStatus) {
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  emit(topic: string, update: DeskUpdate | string) {
    const body = typeof update === 'string' ? update : JSON.stringify(update)
    for (const handler of this.topics.get(topic) ?? []) handler(body)
  }
}
