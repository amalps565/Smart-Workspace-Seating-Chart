import { memo, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnnounce } from '../../components/announce'
import { cellAriaLabel, cellIcon, cellStatusText } from './cellText'
import { useFloorStore } from './context'
import { renderProbe } from './renderProbe'
import { deriveCellView, type CellStatus } from './store'

interface DeskCellProps {
  id: number
  /** The one cell in the grid's tab order (roving tabindex). */
  active: boolean
  onFocusCell: (id: number) => void
  onActivateCell: (id: number) => void
}

const BOOKABLE: ReadonlySet<CellStatus> = new Set(['AVAILABLE', 'MINE'])

/**
 * One grid cell. It reads only its own derived view from the store, compared shallowly,
 * so an update to another desk doesn't re-render it unless its own status changes.
 */
export const DeskCell = memo(function DeskCell({ id, active, onFocusCell, onActivateCell }: DeskCellProps) {
  renderProbe.onCellRender?.(id)
  const view = useFloorStore(useShallow((state) => deriveCellView(state, id)))
  const announce = useAnnounce()

  // Tell keyboard and screen reader users when the desk they're on is taken by someone else.
  const previous = useRef(view.status)
  useEffect(() => {
    const before = previous.current
    previous.current = view.status
    if (active && view.status === 'BOOKED' && (before === 'AVAILABLE' || before === 'BLOCKED_BY_SPACING')) {
      announce(`Desk ${view.label ?? ''} was just booked by ${view.bookedBy ?? 'someone else'}.`)
    }
  }, [active, view.status, view.label, view.bookedBy, announce])

  const disabled = view.pending !== null || !BOOKABLE.has(view.status)
  const statusClass = view.status === 'NOT_A_DESK' ? `cell--${view.type.toLowerCase()}` : `cell--${view.status.toLowerCase()}`

  return (
    <div role="gridcell" className="grid-slot">
      <button
        type="button"
        data-cell-id={id}
        className={`cell ${statusClass}${view.pending ? ' cell--pending' : ''}`}
        tabIndex={active ? 0 : -1}
        aria-label={cellAriaLabel(view)}
        aria-disabled={disabled || undefined}
        aria-busy={view.pending ? true : undefined}
        onFocus={() => onFocusCell(id)}
        onClick={() => onActivateCell(id)}
      >
        <span className="cell__icon" aria-hidden="true">
          {cellIcon(view)}
        </span>
        {view.status !== 'NOT_A_DESK' && <span className="cell__label">{view.label}</span>}
        <span className="cell__status">{cellStatusText(view)}</span>
      </button>
    </div>
  )
})
