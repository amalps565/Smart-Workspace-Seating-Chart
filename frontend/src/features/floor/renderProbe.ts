/**
 * Test hook: when set, `DeskCell` reports every render so tests can prove that one
 * update re-renders only the affected cells. Unset (and free) in the app.
 */
export const renderProbe: { onCellRender?: (id: number) => void } = {}
