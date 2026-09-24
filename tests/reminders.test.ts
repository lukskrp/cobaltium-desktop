import { describe, it, expect } from 'vitest'
import { reminderDay, shouldNotifyReminder } from '../src/shared/domain/reminders'

describe('shouldNotifyReminder', () => {
  it('notifies when cards are due and nothing was sent', () => {
    expect(shouldNotifyReminder(null, '2026-09-23', 3)).toBe(true)
  })

  it('stays quiet when nothing is due', () => {
    expect(shouldNotifyReminder(null, '2026-09-23', 0)).toBe(false)
    expect(shouldNotifyReminder({ day: '2026-09-22', count: 5 }, '2026-09-23', 0)).toBe(false)
  })

  it('notifies at most once per day', () => {
    expect(shouldNotifyReminder({ day: '2026-09-23', count: 2 }, '2026-09-23', 5)).toBe(false)
    expect(shouldNotifyReminder({ day: '2026-09-22', count: 5 }, '2026-09-23', 1)).toBe(true)
  })

  it('treats malformed marks as never-notified', () => {
    expect(shouldNotifyReminder({ day: 42, count: 1 } as never, '2026-09-23', 1)).toBe(true)
  })
})

describe('reminderDay', () => {
  it('formats a UTC calendar day', () => {
    expect(reminderDay(Date.UTC(2026, 8, 23, 12))).toBe('2026-09-23')
  })
})
