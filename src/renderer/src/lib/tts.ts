/** Text-to-speech helpers. Offline Piper (via the main process) is preferred; OS voices fall back. */
import { getApi } from '@renderer/lib/ipc'
import { useTtsErrorStore } from '@renderer/features/tts/tts-error-store'

const BCP47: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  'pt-br': 'pt-BR',
  ru: 'ru-RU',
  fi: 'fi-FI',
  sv: 'sv-SE',
  da: 'da-DK',
  nl: 'nl-NL',
  pl: 'pl-PL',
  tr: 'tr-TR',
  ar: 'ar-SA',
  fa: 'fa-IR',
  he: 'he-IL',
  hi: 'hi-IN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  id: 'id-ID'
}

export function bcp47(lang: string): string {
  const code = lang.trim().toLowerCase()
  return BCP47[code] ?? BCP47[code.split('-')[0]] ?? lang
}

export interface SpeakResult {
  /** Which engine produced the audio (or 'none' when there was nothing to say). */
  source: 'offline' | 'os' | 'none'
  /** Present when offline synthesis/playback failed and OS voices were used. */
  error?: string
}

/** Retained so a playing element is not garbage-collected mid-playback. */
let currentAudio: HTMLAudioElement | null = null

/** Speak via the OS/browser voices (Web Speech API). */
export function speakWithOsVoices(text: string, lang: string): void {
  if (typeof speechSynthesis === 'undefined') return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = bcp47(lang)
  speechSynthesis.cancel()
  speechSynthesis.speak(utterance)
}

function base64ToObjectUrl(base64: string, format: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: `audio/${format}` }))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
}

async function playObjectUrl(url: string): Promise<void> {
  // Never overlap offline playback: pause the previous element (it keeps its
  // own blob URL, released by its timer) before replacing the handle.
  stopCurrentAudio()
  const audio = new Audio(url)
  currentAudio = audio
  audio.addEventListener('ended', () => {
    if (currentAudio === audio) currentAudio = null
  })
  try {
    await audio.play()
  } catch (error) {
    if (currentAudio === audio) currentAudio = null
    throw error
  }
}

async function tryOffline(text: string, lang: string): Promise<{ ok: boolean; error?: string }> {
  const api = getApi()
  if (!api) return { ok: false }
  try {
    const result = await api.tts.synthesize(text, lang)
    if (!result) return { ok: false }
    const url = base64ToObjectUrl(result.audioBase64, result.format)
    try {
      await playObjectUrl(url)
      return { ok: true }
    } finally {
      // Keep the blob alive long enough for playback, then release it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

/**
 * Speak `text` in `lang`, preferring the offline voice. Returns which engine was
 * used and, when the offline engine failed, the reason (also surfaced via the
 * TTS error store so the user is not silently downgraded to an OS voice).
 */
export async function speakDetailed(text: string, lang: string): Promise<SpeakResult> {
  const trimmed = text.trim()
  if (trimmed === '') return { source: 'none' }

  // Starting new speech always stops the previous one (offline audio and OS
  // voices alike), so rapid taps on different messages cannot overlap.
  stopSpeaking()

  const offline = await tryOffline(trimmed, lang)
  if (offline.ok) return { source: 'offline' }

  if (offline.error) {
    console.warn(`[tts] offline voice failed for '${lang}', using OS voices:`, offline.error)
    useTtsErrorStore.getState().report(offline.error)
  }
  speakWithOsVoices(trimmed, lang)
  return { source: 'os', error: offline.error }
}

/** Speak: try the bundled offline voice first, then fall back to OS voices. */
export async function speak(text: string, lang: string): Promise<void> {
  await speakDetailed(text, lang)
}

export function stopSpeaking(): void {
  stopCurrentAudio()
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}
