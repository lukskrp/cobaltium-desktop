import type { SavedWordAnalysis } from '@shared/domain/models'

/**
 * Map an LLM morphology result onto the persisted analysis fields. The `notes`
 * field carries the lemma, matching Android's `toAnalysis` usage in the drawer.
 */
export function morphologyToAnalysis(result: {
  pos?: string | null
  lemma?: string | null
  inflected: Record<string, string>
}): SavedWordAnalysis {
  return {
    pos: result.pos ?? null,
    tense: result.inflected.tense ?? null,
    gender: result.inflected.gender ?? null,
    number: result.inflected.number ?? null,
    person: result.inflected.person ?? null,
    case: result.inflected.case ?? null,
    mood: result.inflected.mood ?? null,
    form: result.inflected.form ?? null,
    notes: result.lemma ? `lemma: ${result.lemma}` : (result.inflected.notes ?? null)
  }
}
