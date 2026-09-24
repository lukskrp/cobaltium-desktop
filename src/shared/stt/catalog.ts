/** Offline speech-recognition (whisper.cpp) catalog: models, weights, helpers. Pure. */

export interface SttModelEntry {
  id: string
  label: string
  /** Approximate download size in bytes (for the settings UI). */
  bytes: number
  url: string
}

const HF = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'

export const STT_MODELS: readonly SttModelEntry[] = [
  { id: 'tiny', label: 'Tiny (multilingual)', bytes: 75_000_000, url: `${HF}/ggml-tiny.bin` },
  { id: 'base', label: 'Base (multilingual)', bytes: 150_000_000, url: `${HF}/ggml-base.bin` },
  { id: 'small', label: 'Small (multilingual)', bytes: 500_000_000, url: `${HF}/ggml-small.bin` }
]

export const DEFAULT_STT_MODEL_ID = 'base'

export function sttModelFor(id: string): SttModelEntry | null {
  return STT_MODELS.find((entry) => entry.id === id.toLowerCase()) ?? null
}

/** Map a Cobaltium language code to a whisper.cpp `--language` tag. */
export function whisperLangCode(lang: string): string {
  const code = lang.trim().toLowerCase()
  if (code === '' || code === 'auto') return 'auto'
  if (code === 'pt-br') return 'pt'
  if (code === 'zh') return 'zh'
  return code
}

/** whisper-server binary name for the current platform. */
export function serverBinaryName(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'whisper-server.exe' : 'whisper-server'
}

/** Localhost port the bundled whisper-server listens on. */
export const WHISPER_SERVER_PORT = 19047
