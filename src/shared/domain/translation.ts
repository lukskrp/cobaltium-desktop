/** Pure translation helpers shared by main and renderer (port of the pure parts
 *  of Android `translation/TranslationEngine.kt`). */

const WORD_RE = /[\p{L}\p{N}]+/gu

/** Strip gloss pairs whose native key does not occur in the translation.
 *  Mirrors `GlossFilter` in Android `TranslationEngine.kt:185-201`. */
export function GlossFilter(
  translation: string,
  glosses: Array<{ native: string; foreign: string }>
): Record<string, string> {
  const words = new Set((translation.match(WORD_RE) ?? []).map((w) => w.toLowerCase()))
  const map: Record<string, string> = {}
  for (const { native, foreign } of glosses) {
    const n = native.trim().toLowerCase()
    const f = foreign.trim()
    if (n && f && words.has(n) && !(n in map)) map[n] = f
  }
  return map
}

/** True when the translation differs from the source (i.e. it was translated).
 *  Mirrors `isUsefulTranslation` in Android `TranslationEngine.kt:111-114`. */
export function isUsefulTranslation(sourceText: string, translation: string | null): boolean {
  const gloss = translation?.trim() ?? ''
  return gloss !== '' && gloss !== sourceText.trim()
}

/** Drop entries of an already-built gloss map whose key does not occur in the
 *  translation. Defense-in-depth for maps persisted before GlossFilter
 *  existed (Phase 1) so the UI never renders stale/orphan glosses. */
export function filterGlossMap(
  translation: string,
  glossMap: Record<string, string>
): Record<string, string> {
  const words = new Set((translation.match(WORD_RE) ?? []).map((w) => w.toLowerCase()))
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(glossMap)) {
    if (key && value && words.has(key.toLowerCase())) out[key] = value
  }
  return out
}
