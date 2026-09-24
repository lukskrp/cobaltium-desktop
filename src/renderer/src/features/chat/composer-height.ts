/**
 * Height policy for the drag-resizable chat composer. Pure so the rules are
 * unit-testable; the component feeds it live measurements.
 *
 * - Typing auto-fits content up to `autoCap` (unchanged historical behavior).
 * - A user drag is never shrunk by typing: the box keeps at least the
 *   dragged height while content still needs room.
 * - Nothing may exceed `manualCap` (viewport-relative ceiling).
 */
export function computeBoxHeight(
  scrollHeight: number,
  userHeight: number | null,
  autoCap: number,
  manualCap: number
): number {
  const fitted = Math.min(scrollHeight, autoCap)
  const floor = userHeight == null || userHeight <= 0 ? 0 : Math.min(userHeight, manualCap)
  return Math.min(Math.max(fitted, floor), manualCap)
}

/** Clamp a drag-derived height into [minPx, maxPx]. */
export function clampDragHeight(px: number, minPx: number, maxPx: number): number {
  return Math.min(Math.max(px, minPx), maxPx)
}
