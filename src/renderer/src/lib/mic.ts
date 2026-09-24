/** Microphone capture: MediaRecorder → 16 kHz mono WAV for whisper.cpp. */
import { encodeWavPcm16 } from '@shared/tts/wav'

export const STT_SAMPLE_RATE = 16_000
/** Clips longer than this are rejected before transcription. */
export const MAX_RECORD_MS = 120_000

export interface MicRecording {
  wavBase64: string
  durationMs: number
}

export type MicErrorKind = 'denied' | 'no-device' | 'unavailable' | 'too-long' | 'failed'

export class MicError extends Error {
  readonly kind: MicErrorKind
  constructor(kind: MicErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

/** Linear resample of mono float samples to 16 kHz. Pure (unit-tested). */
export function resampleTo16k(samples: Float32Array, fromRate: number): Float32Array {
  if (fromRate === STT_SAMPLE_RATE) return samples
  if (fromRate <= 0 || samples.length === 0) return new Float32Array(0)
  const ratio = fromRate / STT_SAMPLE_RATE
  const outLength = Math.max(1, Math.floor(samples.length / ratio))
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const src = i * ratio
    const lo = Math.floor(src)
    const hi = Math.min(lo + 1, samples.length - 1)
    const frac = src - lo
    out[i] = samples[lo] * (1 - frac) + samples[hi] * frac
  }
  return out
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** Decode a recorded blob and encode it as 16 kHz mono WAV (base64). */
export async function blobToWavBase64(blob: Blob): Promise<{ wavBase64: string; durationMs: number }> {
  const buffer = await blob.arrayBuffer()
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) throw new MicError('unavailable', 'Web Audio is unavailable')
  const context = new AudioContextCtor()
  try {
    const decoded = await context.decodeAudioData(buffer)
    const durationMs = decoded.duration * 1000
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * STT_SAMPLE_RATE)), STT_SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start(0)
    const rendered = await offline.startRendering()
    const mono = rendered.getChannelData(0)
    const wav = encodeWavPcm16(mono, STT_SAMPLE_RATE)
    return { wavBase64: arrayBufferToBase64(wav.buffer as ArrayBuffer), durationMs }
  } finally {
    void context.close().catch(() => undefined)
  }
}

function micErrorFor(error: unknown): MicError {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new MicError('denied', 'Microphone access was denied')
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return new MicError('no-device', 'No microphone found')
  }
  return new MicError('failed', error instanceof Error ? error.message : String(error))
}

export interface MicCapture {
  /** Stop recording and return the encoded WAV. Throws MicError on failure. */
  stop(): Promise<MicRecording>
  /** Discard the recording without transcribing. */
  cancel(): void
}

/**
 * Start microphone capture with echo cancellation. Resolves once the
 * MediaRecorder is running; call `stop()` (push-to-talk release) to finish.
 */
export async function startMicCapture(): Promise<MicCapture> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new MicError('unavailable', 'Microphone capture is unavailable')
  }
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })
  } catch (error) {
    throw micErrorFor(error)
  }

  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => {
    try {
      return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
    } catch {
      return false
    }
  })
  let recorder: MediaRecorder
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop())
    throw micErrorFor(error)
  }

  const chunks: Blob[] = []
  const startedAt = Date.now()
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) chunks.push(event.data)
    }
    recorder.onerror = () => reject(new MicError('failed', 'Recording failed'))
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
  })
  recorder.start(250)

  let settled = false
  return {
    async stop(): Promise<MicRecording> {
      if (settled) throw new MicError('failed', 'Recording already finished')
      settled = true
      const durationMs = Date.now() - startedAt
      try {
        if (recorder.state !== 'inactive') recorder.stop()
        const blob = await done
        if (durationMs > MAX_RECORD_MS) throw new MicError('too-long', 'Recording is too long')
        const { wavBase64 } = await blobToWavBase64(blob)
        return { wavBase64, durationMs }
      } finally {
        stream.getTracks().forEach((track) => track.stop())
      }
    },
    cancel(): void {
      if (settled) return
      settled = true
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        // ignore
      }
      stream.getTracks().forEach((track) => track.stop())
    }
  }
}
