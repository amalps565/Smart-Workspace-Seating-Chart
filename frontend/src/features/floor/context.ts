import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import type { ConnectionStatus, FloorSocket } from './socket'
import type { FloorState, FloorStore } from './store'

export const FloorStoreContext = createContext<FloorStore | null>(null)
export const SocketContext = createContext<FloorSocket | null>(null)

export function useFloorStoreApi(): FloorStore {
  const store = useContext(FloorStoreContext)
  if (!store) throw new Error('FloorStoreContext is missing')
  return store
}

/** Reads a slice of the floor store; the component re-renders only when the slice changes. */
export function useFloorStore<T>(selector: (state: FloorState) => T): T {
  return useStore(useFloorStoreApi(), selector)
}

export function useSocket(): FloorSocket {
  const socket = useContext(SocketContext)
  if (!socket) throw new Error('SocketContext is missing')
  return socket
}

export function useConnectionStatus(socket: FloorSocket): ConnectionStatus {
  const subscribe = useCallback((listener: () => void) => socket.onStatus(listener), [socket])
  const getStatus = useCallback(() => socket.getStatus(), [socket])
  return useSyncExternalStore(subscribe, getStatus)
}
