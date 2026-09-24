import type { SttResult, SttStatus } from '@shared/ipc'
import { loadAppSettings } from '../db/repositories/settings'
import { isProvisioned, provisionedBytes } from './provision'
import { isTranscribing, transcribeWav } from './engine'
import { serverAvailable } from './server'

export { cancelTranscribe, disposeStt } from './engine'
export { provision, removeModel as removeSttModel } from './provision'

function decodeWav(base64: string): Uint8Array | null {
  try {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  } catch {
    return null
  }
}

/** Transcribe base64-encoded 16 kHz mono WAV audio. */
export async function transcribe(wavBase64: string, lang: string): Promise<SttResult | null> {
  if (!wavBase64 || !lang) return null
  const wav = decodeWav(wavBase64)
  if (!wav || wav.length < 44) return null
  try {
    return await transcribeWav(wav, lang)
  } catch (error) {
    console.warn('[stt] transcription failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/** Engine + model provisioning status for the settings UI. */
export function sttStatus(): SttStatus {
  const settings = loadAppSettings()
  return {
    serverAvailable: serverAvailable(),
    model: settings.sttModel,
    provisioned: isProvisioned(settings.sttModel),
    bytes: provisionedBytes(settings.sttModel),
    transcribing: isTranscribing()
  }
}
