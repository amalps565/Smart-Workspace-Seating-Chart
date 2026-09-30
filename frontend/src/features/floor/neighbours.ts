import type { CellType, NeighbourMode } from '../../api/types'

// The single place that decides which desks are neighbours on the client. It mirrors the
// server's rule for early feedback only; the server always has the final say.

const ORTHOGONAL: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]
const ALL: ReadonlyArray<readonly [number, number]> = [
  ...ORTHOGONAL,
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]

export function neighbourOffsets(mode: NeighbourMode) {
  return mode === 'ALL' ? ALL : ORTHOGONAL
}

export interface PositionedCell {
  id: number
  row: number
  col: number
  type: CellType
}

/**
 * Maps each desk ID to the IDs of its neighbouring desks. Non-desk cells are never
 * neighbours and get no entry.
 */
export function buildNeighbourMap(cells: readonly PositionedCell[], mode: NeighbourMode): Record<number, number[]> {
  const deskAt = new Map<string, number>()
  for (const cell of cells) {
    if (cell.type === 'DESK') deskAt.set(`${cell.row}:${cell.col}`, cell.id)
  }
  const offsets = neighbourOffsets(mode)
  const result: Record<number, number[]> = {}
  for (const cell of cells) {
    if (cell.type !== 'DESK') continue
    const ids: number[] = []
    for (const [dr, dc] of offsets) {
      const id = deskAt.get(`${cell.row + dr}:${cell.col + dc}`)
      if (id !== undefined) ids.push(id)
    }
    result[cell.id] = ids
  }
  return result
}
