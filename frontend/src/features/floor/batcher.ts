type Schedule = (callback: () => void) => () => void

const nextFrame: Schedule = (callback) => {
  if (typeof requestAnimationFrame === 'function') {
    const handle = requestAnimationFrame(callback)
    return () => cancelAnimationFrame(handle)
  }
  const handle = setTimeout(callback, 16)
  return () => clearTimeout(handle)
}

/** Collects items and hands them over once per animation frame, so bursts cause one render. */
export function createBatcher<T>(flushTo: (items: T[]) => void, schedule: Schedule = nextFrame) {
  let queue: T[] = []
  let cancelScheduled: (() => void) | null = null

  const flush = () => {
    cancelScheduled?.()
    cancelScheduled = null
    if (queue.length === 0) return
    const items = queue
    queue = []
    flushTo(items)
  }

  return {
    push(item: T) {
      queue.push(item)
      if (!cancelScheduled) cancelScheduled = schedule(flush)
    },
    flush,
    cancel() {
      cancelScheduled?.()
      cancelScheduled = null
      queue = []
    },
  }
}
