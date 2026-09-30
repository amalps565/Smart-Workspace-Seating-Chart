import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useFloorStore, useFloorStoreApi } from './context'
import { DeskCell } from './DeskCell'

interface FloorGridProps {
  label: string
  onActivate: (deskId: number) => void
}

const MOVES: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function firstCell(layout: (number | null)[][]): number | null {
  for (const row of layout) for (const id of row) if (id !== null) return id
  return null
}

/**
 * The floor as a CSS grid of `rows × cols`. It subscribes only to the layout, which changes
 * with a new snapshot, so desk updates re-render just the affected `DeskCell`s.
 */
export function FloorGrid({ label, onActivate }: FloorGridProps) {
  const store = useFloorStoreApi()
  const layout = useFloorStore((s) => s.layout)
  const cols = useFloorStore((s) => s.cols)
  const [activeId, setActiveId] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const inLayout = activeId !== null && layout.some((row) => row.includes(activeId))
  const current = inLayout ? activeId : firstCell(layout)

  const onFocusCell = useCallback((id: number) => setActiveId(id), [])

  const moveTo = (id: number) => {
    setActiveId(id)
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell-id="${id}"]`)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (current === null) return
    const cell = store.getState().cells[current]
    if (!cell) return
    const rowIds = layout[cell.row] ?? []
    let target: number | null = null

    const move = MOVES[event.key]
    if (move) {
      // Step in the direction, skipping gaps where the snapshot has no cell.
      let r = cell.row + move[0]
      let c = cell.col + move[1]
      while (r >= 0 && r < layout.length && c >= 0 && c < cols) {
        const id = layout[r][c]
        if (id !== null) {
          target = id
          break
        }
        r += move[0]
        c += move[1]
      }
    } else if (event.key === 'Home') {
      target = (event.ctrlKey ? firstCell(layout) : rowIds.find((id) => id !== null)) ?? null
    } else if (event.key === 'End') {
      const ids = event.ctrlKey ? layout.flat() : rowIds
      target = [...ids].reverse().find((id) => id !== null) ?? null
    } else {
      return
    }
    event.preventDefault()
    if (target !== null) moveTo(target)
  }

  const style = { '--grid-cols': cols } as CSSProperties

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={label}
      aria-rowcount={layout.length}
      aria-colcount={cols}
      className="floor-grid"
      style={style}
      onKeyDown={onKeyDown}
    >
      {layout.map((row, r) => (
        <div role="row" className="grid-row" key={r} aria-rowindex={r + 1}>
          {row.map((id, c) =>
            id === null ? (
              <div role="gridcell" className="grid-slot grid-slot--empty" key={`empty-${r}-${c}`} />
            ) : (
              <DeskCell
                key={id}
                id={id}
                active={id === current}
                onFocusCell={onFocusCell}
                onActivateCell={onActivate}
              />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
