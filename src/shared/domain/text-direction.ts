import { directionOf, ScriptRegistry, type ScriptDirection } from '../lang/scripts'
import { BUILT_IN_PROFILES } from '../lang/profiles'

/** Text direction for *content* in the given language, independent of the UI
 *  language's `dir`. Port of Android `ui/TextDirection.kt`. Unknown languages
 *  fall back to LTR. */
export function contentDir(lang: string): ScriptDirection {
  const profile = BUILT_IN_PROFILES[lang.toLowerCase()]
  if (!profile) return 'ltr'
  return directionOf(ScriptRegistry.fromKey(profile.script))
}
