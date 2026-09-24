import { phonemeTypeOf, ttsVoiceFor } from '@shared/tts/catalog'
import { normalizePhonemes, phonemesToIds } from '@shared/tts/phonemes'
import { encodeWavPcm16 } from '@shared/tts/wav'
import type { TtsAudio } from '@shared/ipc'
import { VitsSynthesizer } from './vits'
import { isProvisioned, voiceConfigPath, voiceOnnxPath } from './provision'
import { espeakAvailable, espeakPhonemize } from './espeak'
import { japaneseAvailable, phonemizeJapanese } from './japanese'

const sessions = new Map<string, Promise<VitsSynthesizer>>()

function phonemizerAvailable(phonemeType: string): boolean {
  return phonemeType === 'japanese' ? japaneseAvailable() : espeakAvailable()
}

/** True when the offline engine can serve this language right now. */
export function offlineAvailable(lang: string): boolean {
  const entry = ttsVoiceFor(lang)
  if (!entry) return false
  return isProvisioned(lang) && phonemizerAvailable(phonemeTypeOf(entry))
}

function getSession(lang: string): Promise<VitsSynthesizer> {
  const code = lang.toLowerCase()
  let session = sessions.get(code)
  if (!session) {
    // Drop caches when the voice is removed/downgraded on disk.
    const onnx = voiceOnnxPath(code)
    const config = voiceConfigPath(code)
    session = VitsSynthesizer.load(onnx, config)
    sessions.set(code, session)
    session.catch(() => sessions.delete(code))
  }
  return session
}

function phonemize(text: string, phonemeType: string, espeakVoice: string): string | null {
  if (phonemeType === 'japanese') return phonemizeJapanese(text)
  return espeakPhonemize(text, espeakVoice)
}

/**
 * Synthesize with the permissive offline engine: espeak-ng (or the Japanese
 * bridge) for G2P, Piper VITS via onnxruntime-node for audio. Returns null when
 * the language is unsupported or not yet provisioned, letting the caller fall
 * back to OS voices.
 */
export async function synthesizeOffline(text: string, lang: string): Promise<TtsAudio | null> {
  const entry = ttsVoiceFor(lang)
  if (!entry || !isProvisioned(lang) || !phonemizerAvailable(phonemeTypeOf(entry))) return null

  const trimmed = text.trim()
  if (trimmed === '') return null

  const session = await getSession(lang)
  const raw = phonemize(trimmed, session.config.phonemeType, session.config.espeakVoice)
  if (raw === null || raw.trim() === '') return null

  const { ids } = phonemesToIds(normalizePhonemes(raw), session.config.phonemeIdMap)
  if (ids.length <= 2) return null

  const samples = await session.synthesizeIds(ids, session.config.defaultSpeakerId)
  if (samples.length === 0) return null

  const wav = encodeWavPcm16(samples, session.config.sampleRate)
  return { audioBase64: Buffer.from(wav).toString('base64'), format: 'wav' }
}

/** Release loaded ONNX sessions (called on quit). */
export async function disposeTts(): Promise<void> {
  for (const pending of sessions.values()) {
    try {
      const session = await pending
      await session.close()
    } catch {
      // ignore
    }
  }
  sessions.clear()
}
