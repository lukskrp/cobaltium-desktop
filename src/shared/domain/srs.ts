/** Spaced-repetition logic (port of `data/repo/SrsRepository.kt`). */

export type SrsGrade = 'again' | 'good' | 'easy'
export type SrsCardBucket = 'new' | 'learning' | 'again' | 'strong'

/** Stable SRS card ids derived from saved items (a card is a word or a phrase). */
export const SrsCardIds = {
  word: (id: string): string => `word:${id}`,
  phrase: (id: string): string => `phrase:${id}`
} as const

/** Persisted per-item SRS state (simplified SM-2). Missing state = new card. */
export interface SrsItemState {
  ease: number
  intervalDays: number
  dueEpochMs: number
  lapses: number
}

export interface SrsDeck {
  id: string
  name: string
  createdAt: number
}

export const DEFAULT_SRS_STATE: SrsItemState = {
  ease: 2.5,
  intervalDays: 0,
  dueEpochMs: 0,
  lapses: 0
}

/** Days of successful interval before a card counts as "known well". */
export const GREEN_AFTER_DAYS = 21

const DAY_MS = 86_400_000
const TEN_MINUTES = 600_000

/** Pure classification logic for the deck counters. */
export const SrsDeckLogic = {
  cardBucket(state: SrsItemState | null | undefined, greenAfterDays: number): SrsCardBucket {
    if (!state) return 'new'
    if (state.lapses > 0) return 'again'
    if (state.intervalDays >= greenAfterDays) return 'strong'
    return 'learning'
  }
}

/** Pure SM-2-ish scheduling logic. */
export const SrsScheduler = {
  apply(state: SrsItemState, grade: SrsGrade, now: number): SrsItemState {
    switch (grade) {
      case 'again':
        return {
          ease: Math.max(1.3, state.ease - 0.2),
          intervalDays: 0,
          dueEpochMs: now + TEN_MINUTES,
          lapses: state.lapses + 1
        }
      case 'good': {
        const interval =
          state.intervalDays <= 0
            ? 1
            : Math.max(1, Math.trunc(state.intervalDays * state.ease))
        return { ...state, intervalDays: interval, dueEpochMs: now + interval * DAY_MS }
      }
      case 'easy': {
        const interval =
          state.intervalDays <= 0
            ? 3
            : Math.max(1, Math.trunc(state.intervalDays * state.ease * 1.3))
        return {
          ...state,
          ease: Math.min(3.0, state.ease + 0.15),
          intervalDays: interval,
          dueEpochMs: now + interval * DAY_MS
        }
      }
    }
  }
}
