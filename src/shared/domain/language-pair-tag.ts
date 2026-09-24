/**
 * Compact language-pair tag used by saved phrases and their review cards
 * (port of `domain/LanguagePairTag.kt`), e.g. "ENFI" = English helper + Finnish
 * learning language. Always encoded helper-first, learning language last.
 */
export const LanguagePairTag = {
  encode(helper: string, learn: string): string {
    const h = helper.slice(0, 2).toLowerCase().padEnd(2, 'x')
    const l = learn.slice(0, 2).toLowerCase().padEnd(2, 'x')
    return (h + l).toUpperCase()
  },

  decode(tag: string): [string, string] | null {
    const t = tag.trim()
    if (t.length !== 4) return null
    return [t.slice(0, 2).toLowerCase(), t.slice(2, 4).toLowerCase()]
  },

  /** The learning side of a tag, or the tag itself when it is a plain language code. */
  learnCode(tag: string): string {
    return this.decode(tag)?.[1] ?? tag.toLowerCase()
  }
}
