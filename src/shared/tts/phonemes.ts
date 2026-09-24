/**
 * Piper/phoneme helpers shared by the TTS engine and tests (pure, no native deps).
 *
 * espeak-ng / OpenJTalk IPA must be normalized onto the Piper voice's
 * `phoneme_id_map`: ASCII `g` -> IPA `ɡ`, and affricate tie-bars are dropped so
 * composed symbols split into their base phonemes.
 *
 * A phoneme string carries word boundaries as spaces (`" "` is a normal phoneme,
 * usually id 3); `_` (id 0) is the padding the id sequence interleaves between
 * every phoneme.
 */

export type PhonemeIdMap = Record<string, number[]>

export interface PhonemeIdSequence {
  ids: number[]
  /** Codepoints that were not present in the voice's id map. */
  skipped: string[]
}

const SUBSTITUTIONS: Record<string, string> = {
  g: '\u0261', // g -> ɡ
  G: '\u0262' // G -> ɢ
}

/** Normalize a single phoneme token onto the Piper voice inventory. */
export function normalizePhonemeToken(token: string): string {
  const stripped = token.replace(/[\u0361\u035C]/g, '')
  let out = ''
  for (const ch of stripped) out += SUBSTITUTIONS[ch] ?? ch
  return out
}

/** Normalize a space-separated phoneme string, token by token. */
export function normalizePhonemes(phonemes: string): string {
  return phonemes
    .split(' ')
    .map((token) => normalizePhonemeToken(token))
    .join(' ')
}

/**
 * Port of piper-phonemize / Android `PiperSynthesizer.phonemesToIds`:
 * `[BOS, PAD]` then `<ids, PAD>` per codepoint, finally `EOS`.
 */
export function phonemesToIds(phonemeString: string, idMap: PhonemeIdMap): PhonemeIdSequence {
  const pad = idMap._?.[0] ?? 0
  const bos = idMap['^']?.[0] ?? 1
  const eos = idMap.$?.[0] ?? 2

  const ids: number[] = [bos, pad]
  const skipped: string[] = []
  for (const ch of phonemeString) {
    const entry = ch === '_' ? [pad] : idMap[ch]
    if (entry && entry.length > 0) {
      ids.push(...entry)
      ids.push(pad)
    } else {
      skipped.push(ch)
    }
  }
  ids.push(eos)
  return { ids, skipped }
}

/** Strip punctuation that should not be looked up as a word. */
export function stripWordPunctuation(word: string): string {
  return word.replace(/[.,!?;:¡¿"«»„“”()[\]]/gu, '')
}

/** Split text into lowercase, punctuation-stripped words. */
export function tokenizeForTts(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => stripWordPunctuation(word))
    .filter((word) => word !== '')
}
