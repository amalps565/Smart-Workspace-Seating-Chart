import { describe, expect, it } from 'vitest'
import type { CellType } from '../../api/types'
import { buildNeighbourMap, type PositionedCell } from './neighbours'

/** Grid from strings: D = desk, W = walkway, X = wall, R = room. IDs are row * cols + col + 1. */
function grid(...rows: string[]): PositionedCell[] {
  const types: Record<string, CellType> = { D: 'DESK', W: 'WALKWAY', X: 'WALL', R: 'ROOM' }
  return rows.flatMap((line, row) =>
    [...line].map((ch, col) => ({ id: row * line.length + col + 1, row, col, type: types[ch] })),
  )
}

const sorted = (ids: number[] | undefined) => [...(ids ?? [])].sort((a, b) => a - b)

describe('buildNeighbourMap', () => {
  const full = grid('DDD', 'DDD', 'DDD')

  it('uses the 4 edge neighbours in ORTHOGONAL mode', () => {
    const map = buildNeighbourMap(full, 'ORTHOGONAL')
    expect(sorted(map[5])).toEqual([2, 4, 6, 8])
  })

  it('uses all 8 surrounding desks in ALL mode', () => {
    const map = buildNeighbourMap(full, 'ALL')
    expect(sorted(map[5])).toEqual([1, 2, 3, 4, 6, 7, 8, 9])
  })

  it('handles corners and edges without wrapping around', () => {
    const orthogonal = buildNeighbourMap(full, 'ORTHOGONAL')
    const all = buildNeighbourMap(full, 'ALL')
    expect(sorted(orthogonal[1])).toEqual([2, 4])
    expect(sorted(all[1])).toEqual([2, 4, 5])
    expect(sorted(orthogonal[3])).toEqual([2, 6])
    expect(sorted(all[8])).toEqual([4, 5, 6, 7, 9])
    expect(sorted(orthogonal[9])).toEqual([6, 8])
  })

  it('never counts walkways, walls, or rooms as neighbours, and gives them no entry', () => {
    const cells = grid('DWD', 'XDR')
    const orthogonal = buildNeighbourMap(cells, 'ORTHOGONAL')
    expect(sorted(orthogonal[1])).toEqual([])
    expect(sorted(orthogonal[3])).toEqual([])
    expect(sorted(orthogonal[5])).toEqual([])
    expect(orthogonal[2]).toBeUndefined()
    expect(orthogonal[4]).toBeUndefined()
    expect(orthogonal[6]).toBeUndefined()

    const all = buildNeighbourMap(cells, 'ALL')
    expect(sorted(all[1])).toEqual([5])
    expect(sorted(all[3])).toEqual([5])
    expect(sorted(all[5])).toEqual([1, 3])
  })

  it('does not bridge across a walkway', () => {
    const map = buildNeighbourMap(grid('DWD'), 'ALL')
    expect(map[1]).toEqual([])
    expect(map[3]).toEqual([])
  })
})
