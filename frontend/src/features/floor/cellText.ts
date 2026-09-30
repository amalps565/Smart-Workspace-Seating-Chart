import type { CellView } from './store'

/** Glyph shown with each status so it never relies on colour alone. Decorative only. */
export function cellIcon(view: CellView): string {
  if (view.pending) return '…'
  switch (view.status) {
    case 'AVAILABLE':
      return '○'
    case 'MINE':
      return '★'
    case 'BOOKED':
      return '●'
    case 'BLOCKED_BY_SPACING':
      return '⊘'
    case 'NOT_A_DESK':
      return view.type === 'WALL' ? '▦' : view.type === 'ROOM' ? '▭' : ''
  }
}

/** Short visible status line under the desk label. */
export function cellStatusText(view: CellView): string {
  if (view.pending === 'book') return 'Booking…'
  if (view.pending === 'cancel') return 'Cancelling…'
  switch (view.status) {
    case 'AVAILABLE':
      return 'Free'
    case 'MINE':
      return 'Yours'
    case 'BOOKED':
      return view.bookedBy ?? 'Booked'
    case 'BLOCKED_BY_SPACING':
      return 'Too close'
    case 'NOT_A_DESK':
      return view.type === 'WALL' ? 'Wall' : view.type === 'ROOM' ? 'Room' : ''
  }
}

function nonDeskName(view: CellView): string {
  if (view.type === 'ROOM') return view.label ? `Meeting room ${view.label}` : 'Meeting room'
  if (view.type === 'WALL') return 'Wall'
  return 'Walkway'
}

/** Full accessible name, e.g. "Desk 3-A1, available". */
export function cellAriaLabel(view: CellView): string {
  if (view.status === 'NOT_A_DESK') return `${nonDeskName(view)}, not a desk`
  const desk = `Desk ${view.label ?? ''}`.trim()
  if (view.pending === 'book') return `${desk}, booking in progress`
  if (view.pending === 'cancel') return `${desk}, cancelling your booking`
  switch (view.status) {
    case 'AVAILABLE':
      return `${desk}, available`
    case 'MINE':
      return `${desk}, booked by you`
    case 'BOOKED':
      return `${desk}, booked by ${view.bookedBy ?? 'someone else'}`
    case 'BLOCKED_BY_SPACING':
      return `${desk}, unavailable: next to a booked desk`
  }
}
