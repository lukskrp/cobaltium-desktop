/** Lexical segments and tokenizers (port of `tokenizer/*.kt`). */

export interface TextSegment {
  text: string
  start: number
  end: number
  word: boolean
}

export interface Tokenizer {
  segment(text: string): TextSegment[]
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)*/gu

/** Word tokenization on Unicode whitespace; default for space-delimited scripts. */
export const WhitespaceTokenizer: Tokenizer = {
  segment(text: string): TextSegment[] {
    const out: TextSegment[] = []
    let last = 0
    for (const match of text.matchAll(WORD_PATTERN)) {
      const start = match.index ?? 0
      if (start > last) {
        out.push({ text: text.slice(last, start), start: last, end: start, word: false })
      }
      const value = match[0]
      out.push({ text: value, start, end: start + value.length, word: true })
      last = start + value.length
    }
    if (last < text.length) {
      out.push({ text: text.slice(last), start: last, end: text.length, word: false })
    }
    return out
  }
}

function wordLike(slice: string): boolean {
  if (slice.trim() === '') return false
  return /[\p{L}\p{N}]/u.test(slice)
}

/**
 * Word segmentation via `Intl.Segmenter` (the JS equivalent of ICU4J's word
 * break iterator). Falls back to whitespace tokenization when unavailable.
 */
export function createSegmenterTokenizer(locale: string): Tokenizer {
  return {
    segment(text: string): TextSegment[] {
      if (text === '') return []
      if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })
        const out: TextSegment[] = []
        const iterator = segmenter.segment(text) as unknown as Iterable<{
          segment: string
          index: number
          isWordLike?: boolean
        }>
        for (const part of iterator) {
          out.push({
            text: part.segment,
            start: part.index,
            end: part.index + part.segment.length,
            word: part.isWordLike ?? wordLike(part.segment)
          })
        }
        return out
      }
      return WhitespaceTokenizer.segment(text)
    }
  }
}

/** Dictionary-based Chinese segmentation. Kept for back-compat. */
export function createCjkTokenizer(): Tokenizer {
  return createSegmenterTokenizer('zh')
}

/** Korean word segmentation via `Intl.Segmenter('ko')`; jamo handling lives
 *  in the romanizer. Falls back to whitespace when Segmenter is unavailable. */
export const KoreanTokenizer: Tokenizer = {
  segment: (text: string): TextSegment[] => createSegmenterTokenizer('ko').segment(text)
}
