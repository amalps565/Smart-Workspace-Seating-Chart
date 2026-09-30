import { Client, type StompSubscription } from '@stomp/stompjs'
import { authHeaders } from '../../auth/session'
import type { DeskUpdate } from '../../api/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting'

/**
 * The small socket surface the floor page needs. Tests inject a fake implementation.
 * `onStatus` listeners are called on every change, including each (re)connect, so the
 * floor page can reload its snapshot after a reconnect.
 */
export interface FloorSocket {
  start(): void
  stop(): void
  getStatus(): ConnectionStatus
  onStatus(listener: (status: ConnectionStatus) => void): () => void
  /** Subscribes now if connected, and again after every reconnect. */
  subscribe(topic: string, onMessage: (body: string) => void): () => void
}

export function floorTopic(floorId: number, date: string) {
  return `/topic/floors/${floorId}/${date}`
}

export function socketUrl(location: Location = window.location) {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${location.host}/ws`
}

/** Parses a topic message, returning null for anything that doesn't match the contract. */
export function parseDeskUpdate(body: string): DeskUpdate | null {
  try {
    const value = JSON.parse(body) as Partial<DeskUpdate>
    if (
      typeof value.deskId !== 'number' ||
      typeof value.seq !== 'number' ||
      typeof value.date !== 'string' ||
      (value.status !== 'BOOKED' && value.status !== 'AVAILABLE')
    ) {
      return null
    }
    return {
      deskId: value.deskId,
      date: value.date,
      status: value.status,
      bookedBy: typeof value.bookedBy === 'string' ? value.bookedBy : null,
      bookedByUsername: typeof value.bookedByUsername === 'string' ? value.bookedByUsername : null,
      seq: value.seq,
    }
  } catch {
    return null
  }
}

interface Topic {
  handlers: Set<(body: string) => void>
  subscription: StompSubscription | null
}

export function createStompSocket(url: string = socketUrl()): FloorSocket {
  let status: ConnectionStatus = 'connecting'
  const listeners = new Set<(status: ConnectionStatus) => void>()
  const topics = new Map<string, Topic>()

  const setStatus = (next: ConnectionStatus) => {
    if (next === status && next !== 'connected') return
    status = next
    for (const listener of listeners) listener(next)
  }

  const client = new Client({
    brokerURL: url,
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  })
  // Read the token right before each (re)connect so it is never cached here.
  client.beforeConnect = (c) => {
    c.connectHeaders = { ...authHeaders() }
  }

  const stompSubscribe = (topic: string, entry: Topic) => {
    entry.subscription = client.subscribe(topic, (message) => {
      for (const handler of entry.handlers) handler(message.body)
    })
  }

  client.onConnect = () => {
    for (const [topic, entry] of topics) stompSubscribe(topic, entry)
    setStatus('connected')
  }
  client.onWebSocketClose = () => {
    for (const entry of topics.values()) entry.subscription = null
    if (client.active) setStatus('reconnecting')
  }
  client.onStompError = () => {
    if (client.active) setStatus('reconnecting')
  }

  return {
    start() {
      client.activate()
    },
    stop() {
      void client.deactivate()
    },
    getStatus: () => status,
    onStatus(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    subscribe(topic, onMessage) {
      let entry = topics.get(topic)
      if (!entry) {
        entry = { handlers: new Set(), subscription: null }
        topics.set(topic, entry)
        if (client.connected) stompSubscribe(topic, entry)
      }
      entry.handlers.add(onMessage)
      const owned = entry
      return () => {
        owned.handlers.delete(onMessage)
        if (owned.handlers.size > 0) return
        topics.delete(topic)
        if (owned.subscription && client.connected) owned.subscription.unsubscribe()
        owned.subscription = null
      }
    },
  }
}
