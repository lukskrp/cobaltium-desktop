import { TTS_VOICES } from '@shared/tts/catalog'
import type { TtsAudio, TtsStatus } from '@shared/ipc'
import { synthesizeOffline } from './engine'
import { espeakAvailable } from './espeak'
import { nativePiperAvailable, synthesizeNativePiper } from './piper-native'
import { isProvisioned, provisionedBytes } from './provision'

export type { TtsAudio }
export { disposeTts } from './engine'
export { disposeEspeak } from './espeak'
export { provision, removeVoice } from './provision'

/**
 * Tiered synthesis: offline VITS + espeak-ng/OpenJTalk phonemization (GPLv3) →
 * optional native Piper (user-supplied) → null (renderer falls back to OS
 * voices).
 */
export async function synthesize(text: string, lang: string): Promise<TtsAudio | null> {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const offline = await synthesizeOffline(trimmed, lang).catch((error: unknown) => {
    console.warn(
      `[tts] offline synthesis failed for '${lang}':`,
      error instanceof Error ? error.message : error
    )
    return null
  })
  if (offline) return offline

  const native = await synthesizeNativePiper(trimmed, lang).catch((error: unknown) => {
    console.warn(
      `[tts] native piper failed for '${lang}':`,
      error instanceof Error ? error.message : error
    )
    return null
  })
  return native ?? null
}

/** Engine availability + per-language provisioning status for the settings UI. */
export function ttsStatus(): TtsStatus {
  return {
    espeakAvailable: espeakAvailable(),
    nativePiperAvailable: nativePiperAvailable(),
    languages: TTS_VOICES.map((entry) => ({
      lang: entry.lang,
      label: entry.label,
      voiceId: entry.voiceId,
      license: `${entry.voiceLicense} voice`,
      supported: true,
      provisioned: isProvisioned(entry.lang),
      bytes: provisionedBytes(entry.lang)
    }))
  }
}
