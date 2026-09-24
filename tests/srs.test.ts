import { describe, expect, it } from 'vitest'
import { LanguagePairTag } from '@shared/domain/language-pair-tag'
import {
  DEFAULT_SRS_STATE,
  SrsCardIds,
  SrsDeckLogic,
  SrsScheduler,
  type SrsItemState
} from '@shared/domain/srs'

const now = 1_700_000_000_000

function state(interval: number, lapses: number): SrsItemState {
  return { ...DEFAULT_SRS_STATE, intervalDays: interval, lapses }
}

describe('SrsScheduler', () => {
  it('schedules one day for a new "good"', () => {
    const next = SrsScheduler.apply(DEFAULT_SRS_STATE, 'good', now)
    expect(next.intervalDays).toBe(1)
    expect(next.dueEpochMs).toBe(now + 86_400_000)
    expect(next.ease).toBe(2.5)
    expect(next.lapses).toBe(0)
  })

  it('schedules three days and raises ease for a new "easy"', () => {
    const next = SrsScheduler.apply(DEFAULT_SRS_STATE, 'easy', now)
    expect(next.intervalDays).toBe(3)
    expect(next.dueEpochMs).toBe(now + 3 * 86_400_000)
    expect(next.ease).toBeCloseTo(2.65, 4)
  })

  it('lapses on "again": drops ease and reschedules ten minutes', () => {
    const next = SrsScheduler.apply({ ...DEFAULT_SRS_STATE, intervalDays: 5 }, 'again', now)
    expect(next.ease).toBeCloseTo(2.3, 4)
    expect(next.intervalDays).toBe(0)
    expect(next.dueEpochMs).toBe(now + 600_000)
    expect(next.lapses).toBe(1)
  })

  it('floors ease at 1.3 on "again"', () => {
    const next = SrsScheduler.apply({ ...DEFAULT_SRS_STATE, ease: 1.4, intervalDays: 2 }, 'again', now)
    expect(next.ease).toBeCloseTo(1.3, 4)
  })

  it('grows the interval on "good"', () => {
    const next = SrsScheduler.apply({ ...DEFAULT_SRS_STATE, intervalDays: 2 }, 'good', now)
    expect(next.intervalDays).toBe(5)
    expect(next.dueEpochMs).toBe(now + 5 * 86_400_000)
  })

  it('caps ease and truncates the interval on "easy"', () => {
    const capped = SrsScheduler.apply({ ...DEFAULT_SRS_STATE, ease: 2.9, intervalDays: 3 }, 'easy', now)
    expect(capped.ease).toBeCloseTo(3.0, 4)
    expect(capped.intervalDays).toBe(11)
  })

  it('never drops the interval below one on "good"', () => {
    const next = SrsScheduler.apply({ ...DEFAULT_SRS_STATE, ease: 1.3, intervalDays: 1 }, 'good', now)
    expect(next.intervalDays).toBeGreaterThanOrEqual(1)
  })
})

describe('SrsDeckLogic', () => {
  it('classifies never-seen cards as new', () => {
    expect(SrsDeckLogic.cardBucket(null, 21)).toBe('new')
  })

  it('classifies seen cards without lapses below threshold as learning', () => {
    expect(SrsDeckLogic.cardBucket(state(1, 0), 21)).toBe('learning')
    expect(SrsDeckLogic.cardBucket(state(20, 0), 21)).toBe('learning')
  })

  it('classifies interval at or over threshold as strong', () => {
    expect(SrsDeckLogic.cardBucket(state(21, 0), 21)).toBe('strong')
    expect(SrsDeckLogic.cardBucket(state(60, 0), 21)).toBe('strong')
  })

  it('keeps any lapsed card red regardless of interval', () => {
    expect(SrsDeckLogic.cardBucket(state(1, 1), 21)).toBe('again')
    expect(SrsDeckLogic.cardBucket(state(60, 1), 21)).toBe('again')
  })
})

describe('SrsCardIds', () => {
  it('prefixes word and phrase saved-item ids consistently', () => {
    expect(SrsCardIds.word('abc')).toBe('word:abc')
    expect(SrsCardIds.phrase('xyz')).toBe('phrase:xyz')
  })
})

describe('LanguagePairTag', () => {
  it('encodes helper-first, learning-last', () => {
    expect(LanguagePairTag.encode('en', 'fi')).toBe('ENFI')
    expect(LanguagePairTag.encode('FI', 'en')).toBe('FIEN')
  })

  it('decodes and reads the learning side', () => {
    expect(LanguagePairTag.decode('ENFI')).toEqual(['en', 'fi'])
    expect(LanguagePairTag.decode('nop')).toBeNull()
    expect(LanguagePairTag.learnCode('ENFI')).toBe('fi')
    expect(LanguagePairTag.learnCode('de')).toBe('de')
  })
})
