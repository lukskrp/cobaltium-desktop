/**
 * Splits text into user-perceived characters (grapheme clusters) using the
 * platform `Intl.Segmenter` (port of `script/GraphemeSplitter.kt`, which used
 * `java.text.BreakIterator`).
 */
export const GraphemeSplitter = {
  split(text: string): string[] {
    if (text === '') return []
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      return [...segmenter.segment(text)].map((segment) => segment.segment)
    }
    return Array.from(text)
  },

  count(text: string): number {
    if (text === '') return 0
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      let count = 0
      for (const _ of segmenter.segment(text)) count++
      return count
    }
    return Array.from(text).length
  }
}
