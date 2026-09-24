import { espeakVoiceFor } from '@shared/lang/ipa'
import { espeakPhonemize } from '../tts/espeak'
import { phonemizeJapanese } from '../tts/japanese'
import { getLanguageEngine } from './index'

/**
 * IPA transcription using the engine the language profile names
 * (`espeak` for broad coverage, `openjtalk` for Japanese), mirroring
 * Android `LanguageEngine.ipa` + `EspeakIpaTranscriber`.
 */
export function transcribeIpa(text: string, lang: string): string | null {
  if (text.trim() === '') return null
  const engine = getLanguageEngine().profile(lang)?.ipa ?? null
  if (engine === 'openjtalk') {
    return phonemizeJapanese(text)?.trim() || null
  }
  if (engine === 'espeak') {
    return espeakPhonemize(text, espeakVoiceFor(lang))?.trim() || null
  }
  return null
}
