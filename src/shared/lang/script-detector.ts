import type { ScriptSystem } from './scripts'

/**
 * Identifies the dominant writing system of a string by Unicode block membership
 * (port of `script/ScriptDetector.kt`). Neutral characters (whitespace,
 * punctuation, digits, combining marks) are ignored.
 */

interface Block {
  start: number
  end: number
  system: ScriptSystem
}

const NEUTRAL_RANGES: Array<[number, number]> = [
  [0x0000, 0x002f],
  [0x003a, 0x0040],
  [0x005b, 0x0060],
  [0x007b, 0x00bf],
  [0x0300, 0x036f],
  [0x2000, 0x206f],
  [0x20d0, 0x20ff],
  [0xfe00, 0xfe0f],
  [0xfe20, 0xfe2f]
]

const SCRIPTS: Block[] = [
  { start: 0x0400, end: 0x052f, system: 'cyrillic' },
  { start: 0x2de0, end: 0x2dff, system: 'cyrillic' },
  { start: 0xa640, end: 0xa69f, system: 'cyrillic' },
  { start: 0x0370, end: 0x03ff, system: 'greek' },
  { start: 0x1f00, end: 0x1fff, system: 'greek' },
  { start: 0x0600, end: 0x06ff, system: 'arabic' },
  { start: 0x0750, end: 0x077f, system: 'arabic' },
  { start: 0x08a0, end: 0x08ff, system: 'arabic' },
  { start: 0xfb50, end: 0xfc3f, system: 'arabic' },
  { start: 0xfe70, end: 0xfeff, system: 'arabic' },
  { start: 0x0590, end: 0x05ff, system: 'hebrew' },
  { start: 0xfb1d, end: 0xfb4f, system: 'hebrew' },
  { start: 0x0700, end: 0x074f, system: 'syriac' },
  { start: 0x0900, end: 0x097f, system: 'devanagari' },
  { start: 0xa8e0, end: 0xa8ff, system: 'devanagari' },
  { start: 0xac00, end: 0xd7a3, system: 'hangul' },
  { start: 0x1100, end: 0x11ff, system: 'hangul' },
  { start: 0x3130, end: 0x318f, system: 'hangul' },
  { start: 0xa960, end: 0xa97f, system: 'hangul' },
  { start: 0xd7b0, end: 0xd7ff, system: 'hangul' },
  { start: 0x3040, end: 0x309f, system: 'hiragana' },
  { start: 0x30a0, end: 0x30ff, system: 'katakana' },
  { start: 0x31f0, end: 0x31ff, system: 'katakana' },
  { start: 0xff66, end: 0xff9d, system: 'katakana' },
  { start: 0x3400, end: 0x4dbf, system: 'han' },
  { start: 0x4e00, end: 0x9fff, system: 'han' },
  { start: 0xf900, end: 0xfaff, system: 'han' },
  { start: 0x20000, end: 0x2a6df, system: 'han' },
  { start: 0x2a700, end: 0x2b73f, system: 'han' }
]

function isNeutral(codepoint: number): boolean {
  return NEUTRAL_RANGES.some(([start, end]) => codepoint >= start && codepoint <= end)
}

function latinScript(codepoint: number): ScriptSystem | null {
  if (codepoint >= 0x0041 && codepoint <= 0x007a) return 'latin'
  if (codepoint >= 0x00c0 && codepoint <= 0x024f) return 'latin'
  if (codepoint >= 0x1e00 && codepoint <= 0x1eff) return 'latin'
  if (codepoint >= 0x2c60 && codepoint <= 0x2c7f) return 'latin'
  return null
}

export const ScriptDetector = {
  scriptOf(codepoint: number): ScriptSystem | null {
    for (const block of SCRIPTS) {
      if (codepoint >= block.start && codepoint <= block.end) return block.system
    }
    return latinScript(codepoint)
  },

  isNeutral,

  detect(text: string): ScriptSystem | null {
    const counts = new Map<ScriptSystem, number>()
    let total = 0
    for (const ch of text) {
      const cp = ch.codePointAt(0) as number
      if (isNeutral(cp)) continue
      const system = this.scriptOf(cp)
      if (system) {
        counts.set(system, (counts.get(system) ?? 0) + 1)
        total++
      }
    }
    if (total === 0) return null
    let best: ScriptSystem | null = null
    let bestCount = -1
    for (const [system, count] of counts) {
      if (count > bestCount) {
        best = system
        bestCount = count
      }
    }
    return best
  },

  scripts(text: string): ScriptSystem[] {
    const counts = new Map<ScriptSystem, number>()
    for (const ch of text) {
      const system = this.scriptOf(ch.codePointAt(0) as number)
      if (system) counts.set(system, (counts.get(system) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([system]) => system)
  }
}
