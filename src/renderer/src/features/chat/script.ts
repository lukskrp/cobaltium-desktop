import { BUILT_IN_PROFILES } from '@shared/lang/profiles'

function scriptOf(lang: string): string {
  const code = lang.trim().toLowerCase()
  const profile = BUILT_IN_PROFILES[code] ?? BUILT_IN_PROFILES[code.split('-')[0]]
  return profile?.script ?? 'latin'
}

/**
 * True when two languages are written in different scripts (port of Android's
 * `LanguageEngine.hasDifferentScript`); gates the transliteration rail tool.
 */
export function hasDifferentScript(a: string, b: string): boolean {
  return scriptOf(a) !== scriptOf(b)
}
