import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ttsVoiceFor, voiceConfigUrl, voiceModelUrl } from '@shared/tts/catalog'

export type TtsPhase = 'voice' | 'config' | 'bundle' | 'done' | 'error'
export type TtsProgressFn = (phase: TtsPhase, received: number, total: number) => void

function ttsRoot(): string {
  const dir = join(app.getPath('userData'), 'tts')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function langDir(lang: string): string {
  return join(ttsRoot(), lang.toLowerCase())
}

export function voiceOnnxPath(lang: string): string {
  return join(langDir(lang), 'voice.onnx')
}

export function voiceConfigPath(lang: string): string {
  return join(langDir(lang), 'voice.onnx.json')
}

/** A voice is ready when its ONNX model and config are both present. */
export function isProvisioned(lang: string): boolean {
  if (!ttsVoiceFor(lang)) return false
  return existsSync(voiceOnnxPath(lang)) && existsSync(voiceConfigPath(lang))
}

/** Generic streamed download with progress; shared by the TTS and STT provisioners. */
export async function downloadToFile(
  url: string,
  dest: string,
  onProgress: (received: number, total: number) => void
): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading ${url}`)
  if (!response.body) throw new Error(`Empty body downloading ${url}`)
  const total = Number(response.headers.get('content-length') ?? 0)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.length
      onProgress(received, total)
    }
  }
  writeFileSync(dest, Buffer.concat(chunks))
}

async function download(
  url: string,
  dest: string,
  phase: TtsPhase,
  onProgress: TtsProgressFn
): Promise<void> {
  await downloadToFile(url, dest, (received, total) => onProgress(phase, received, total))
}

/** Download the Piper voice model + config for a language. */
export async function provision(lang: string, onProgress: TtsProgressFn): Promise<boolean> {
  const entry = ttsVoiceFor(lang)
  if (!entry) return false
  const dir = langDir(lang)
  mkdirSync(dir, { recursive: true })
  try {
    await download(voiceModelUrl(entry), voiceOnnxPath(lang), 'voice', onProgress)
    await download(voiceConfigUrl(entry), voiceConfigPath(lang), 'config', onProgress)
    if (!isProvisioned(lang)) throw new Error('Voice files missing after download')
    onProgress('done', 1, 1)
    return true
  } catch (error) {
    onProgress('error', 0, 0)
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

export function removeVoice(lang: string): boolean {
  rmSync(langDir(lang), { recursive: true, force: true })
  return true
}

export function provisionedBytes(lang: string): number {
  const dir = langDir(lang)
  if (!existsSync(dir)) return 0
  let total = 0
  for (const name of readdirSync(dir)) {
    try {
      total += statSync(join(dir, name)).size
    } catch {
      // ignore
    }
  }
  return total
}
