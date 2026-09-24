/**
 * Hebrew proclitic handling for glossing (port of Android
 * `ui/components/HebrewProclitics.kt`). Hebrew attaches short function
 * morphemes to the following word (the conjunction ו, the prepositions
 * ב/כ/ל/מ, and the definite article ה), so "הבית" and "לילדים" are single
 * written words. This resolves such words to their base (stem) so a gloss
 * for the stem can be found.
 */

/** Leading proclitic strings, longest first. */
const PROCLITICS = ['וב', 'וכ', 'ול', 'ומ', 'וה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ה']

/** Common single-lexeme words that start with a proclitic letter (not split). */
const EXCLUDED = new Set([
  'בית', 'מים', 'בן', 'בת', 'כל', 'מי', 'מה', 'כה', 'לה', 'לו', 'בו',
  'כי', 'ללא', 'לבד', 'מיד', 'בטן', 'דרך', 'זמן', 'יום', 'לילה', 'בוקר',
  'ערב', 'בין', 'עוד', 'כף', 'מהיר', 'להיות', 'להודיע', 'להוסיף', 'כיוון',
  'לכן', 'לרגע', 'מאוד', 'מאד', 'מייד', 'בכלל'
])

/**
 * Returns the base (stem) after stripping a leading proclitic, or null when
 * the word is not (confidently) prefixed. Conservative by design — returning
 * null leaves the caller to use the full word.
 */
export function stripProclitics(word: string): string | null {
  const clean = word.trim()
  if (clean.length < 3) return null
  if (EXCLUDED.has(clean.toLowerCase())) return null
  const prefix = PROCLITICS.find((p) => clean.startsWith(p))
  if (!prefix) return null
  const base = clean.slice(prefix.length)
  if (base.length < 2) return null
  return base
}

/** True when [lang] is Hebrew. */
export function isHebrew(lang: string | null | undefined): boolean {
  return (lang ?? '').toLowerCase().startsWith('he')
}

/**
 * Looks a word up in a gloss map, falling back to the proclitic-stripped base
 * for Hebrew (so tapping "הבית" finds a gloss keyed under "בית").
 */
export function lookupGloss(
  glossMap: Record<string, string>,
  word: string,
  lang: string | null | undefined
): string | null {
  if (word.trim() === '') return null
  const key = word.toLowerCase()
  const direct = glossMap[key]
  if (direct) return direct
  if (isHebrew(lang)) {
    const base = stripProclitics(key)
    if (base) {
      const fallback = glossMap[base]
      if (fallback) return fallback
    }
  }
  return null
}
