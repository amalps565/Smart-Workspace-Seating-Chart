import { describe, expect, it, vi } from 'vitest'
import { createBatcher } from './batcher'
import { floorTopic, parseDeskUpdate, socketUrl } from './socket'

describe('socket helpers', () => {
  it('builds the topic and the ws(s) URL from the page location', () => {
    expect(floorTopic(3, '2026-10-01')).toBe('/topic/floors/3/2026-10-01')
    expect(socketUrl({ protocol: 'http:', host: 'localhost:5173' } as Location)).toBe('ws://localhost:5173/ws')
    expect(socketUrl({ protocol: 'https:', host: 'desks.example.com' } as Location)).toBe('wss://desks.example.com/ws')
  })

  it('parses valid messages and rejects malformed ones', () => {
    const valid = { deskId: 1, date: '2026-10-01', status: 'BOOKED', bookedBy: 'Bob', bookedByUsername: 'bob', seq: 4 }
    expect(parseDeskUpdate(JSON.stringify(valid))).toEqual(valid)
    expect(parseDeskUpdate('not json')).toBeNull()
    expect(parseDeskUpdate(JSON.stringify({ ...valid, seq: '4' }))).toBeNull()
    expect(parseDeskUpdate(JSON.stringify({ ...valid, status: 'HACKED' }))).toBeNull()
  })

  it('batches a burst into one flush per frame', () => {
    const scheduled: (() => void)[] = []
    const flushTo = vi.fn()
    const batcher = createBatcher<number>(flushTo, (cb) => {
      scheduled.push(cb)
      return () => {}
    })
    batcher.push(1)
    batcher.push(2)
    batcher.push(3)
    expect(scheduled).toHaveLength(1)
    scheduled[0]()
    expect(flushTo).toHaveBeenCalledTimes(1)
    expect(flushTo).toHaveBeenCalledWith([1, 2, 3])
  })
})
