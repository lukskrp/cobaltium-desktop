import type { SttResult } from '@shared/ipc'
import { whisperLangCode } from '@shared/stt/catalog'
import { parseTranscript, type TranscriptPayload } from '@shared/stt/transcript'
import { loadAppSettings } from '../db/repositories/settings'
import { ensureServer, stopServer } from './server'

let transcribing = false
let inFlight: AbortController | null = null

export function isTranscribing(): boolean {
  return transcribing
}

export function cancelTranscribe(): boolean {
  if (!inFlight) return false
  inFlight.abort()
  inFlight = null
  return true
}

/** Transcribe 16 kHz mono WAV bytes with the bundled whisper-server. */
export async function transcribeWav(wav: Uint8Array, lang: string): Promise<SttResult | null> {
  const settings = loadAppSettings()
  const port = await ensureServer(settings.sttModel, whisperLangCode(lang))
  const controller = new AbortController()
  inFlight = controller
  transcribing = true
  try {
    const form = new FormData()
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'input.wav')
    form.append('response_format', 'json')
    const response = await fetch(`http://127.0.0.1:${port}/inference`, {
      method: 'POST',
      body: form,
      signal: controller.signal
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`whisper-server HTTP ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ''}`)
    }
    const data = (await response.json()) as TranscriptPayload
    return parseTranscript(data, lang)
  } finally {
    transcribing = false
    if (inFlight === controller) inFlight = null
  }
}

/** Stop the server and release the model (called on quit / model switch). */
export function disposeStt(): void {
  cancelTranscribe()
  stopServer()
}
