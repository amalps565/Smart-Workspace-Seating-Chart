import { useCallback, useEffect, useRef } from 'react'
import { api } from '../../api/endpoints'
import { friendlyMessage } from '../../api/errors'
import type { DeskUpdate } from '../../api/types'
import { createBatcher } from './batcher'
import { useFloorStoreApi, useSocket } from './context'
import { floorTopic, parseDeskUpdate } from './socket'

/**
 * Keeps the floor store in sync for one floor and date:
 * subscribe first, buffer updates, load the snapshot, then apply the buffered updates.
 * Every (re)connect reloads the snapshot. Unsubscribes when the floor or date changes.
 * Returns a `resync` function that reloads the snapshot and resolves once it is applied.
 */
export function useFloorFeed(floorId: number | null, date: string) {
  const store = useFloorStoreApi()
  const socket = useSocket()
  const resyncRef = useRef<() => Promise<void>>(() => Promise.resolve())

  useEffect(() => {
    if (floorId === null) return
    let disposed = false
    let generation = 0

    store.getState().begin(floorId, date)
    const batcher = createBatcher<DeskUpdate>((updates) => store.getState().receive(updates))
    const unsubscribe = socket.subscribe(floorTopic(floorId, date), (body) => {
      const update = parseDeskUpdate(body)
      if (update) batcher.push(update)
    })

    const load = async () => {
      const mine = ++generation
      store.getState().startSync()
      try {
        const snapshot = await api.snapshot(floorId, date)
        if (disposed || mine !== generation) return
        batcher.flush()
        store.getState().loadSnapshot(snapshot)
      } catch (error) {
        if (disposed || mine !== generation) return
        batcher.flush()
        store.getState().failSync(friendlyMessage(error))
      }
    }
    resyncRef.current = load

    const offStatus = socket.onStatus((status) => {
      if (status === 'connected') void load()
    })
    void load()

    return () => {
      disposed = true
      resyncRef.current = () => Promise.resolve()
      offStatus()
      unsubscribe()
      batcher.cancel()
    }
  }, [store, socket, floorId, date])

  return useCallback(() => resyncRef.current(), [])
}
