/** Writing systems handled by the language engine (port of `profile/ScriptSystem.kt`). */

export type ScriptDirection = 'ltr' | 'rtl'

export const SCRIPT_SYSTEMS = [
  'latin',
  'cyrillic',
  'greek',
  'devanagari',
  'hangul',
  'hiragana',
  'katakana',
  'han',
  'arabic',
  'hebrew',
  'syriac'
] as const

export type ScriptSystem = (typeof SCRIPT_SYSTEMS)[number]

const RTL: readonly ScriptSystem[] = ['arabic', 'hebrew', 'syriac']

export function directionOf(script: ScriptSystem): ScriptDirection {
  return RTL.includes(script) ? 'rtl' : 'ltr'
}

const KEY_ALIASES: Record<string, ScriptSystem> = {
  latin: 'latin',
  cyrillic: 'cyrillic',
  greek: 'greek',
  devanagari: 'devanagari',
  hangul: 'hangul',
  hiragana: 'hiragana',
  katakana: 'katakana',
  kana: 'hiragana',
  han: 'han',
  arabic: 'arabic',
  hebrew: 'hebrew',
  syriac: 'syriac'
}

export const ScriptRegistry = {
  fromKey(key: string): ScriptSystem {
    return KEY_ALIASES[key.toLowerCase()] ?? 'latin'
  },
  keyOf(system: ScriptSystem): string {
    return system
  }
}
