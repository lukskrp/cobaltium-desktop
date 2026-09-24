/** SRS reminder policy. Pure (unit-tested). */

export interface ReminderMark {
  day: string
  count: number
}

/** UTC calendar day (`YYYY-MM-DD`) used to rate-limit reminders. */
export function reminderDay(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

/** Notify at most once per day, and only when cards are actually due. */
export function shouldNotifyReminder(
  last: ReminderMark | null,
  today: string,
  due: number
): boolean {
  if (due <= 0) return false
  if (!last || typeof last.day !== 'string') return true
  return last.day !== today
}
