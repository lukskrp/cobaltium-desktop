import { app } from 'electron'
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { sttModelFor } from '@shared/stt/catalog'
import { downloadToFile } from '../tts/provision'

export type SttPhase = 'model' | 'done' | 'error'
export type SttProgressFn = (phase: SttPhase, received: number, total: number) => void

function sttRoot(): string {
  const dir = join(app.getPath('userData'), 'stt')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function modelPath(model: string): string {
  return join(sttRoot(), `ggml-${model.toLowerCase()}.bin`)
}

/** A model is ready when its ggml weights file is present and non-empty. */
export function isProvisioned(model: string): boolean {
  if (!sttModelFor(model)) return false
  try {
    return existsSync(modelPath(model)) && statSync(modelPath(model)).size > 0
  } catch {
    return false
  }
}

/** Download the ggml weights for a whisper.cpp model. */
export async function provision(model: string, onProgress: SttProgressFn): Promise<boolean> {
  const entry = sttModelFor(model)
  if (!entry) return false
  mkdirSync(sttRoot(), { recursive: true })
  try {
    await downloadToFile(entry.url, modelPath(entry.id), (received, total) =>
      onProgress('model', received, total)
    )
    if (!isProvisioned(entry.id)) throw new Error('Model file missing after download')
    onProgress('done', 1, 1)
    return true
  } catch (error) {
    onProgress('error', 0, 0)
    rmSync(modelPath(entry.id), { force: true })
    throw error
  }
}

export function removeModel(model: string): boolean {
  rmSync(modelPath(model.toLowerCase()), { force: true })
  return true
}

export function provisionedBytes(model: string): number {
  try {
    const path = modelPath(model)
    return existsSync(path) ? statSync(path).size : 0
  } catch {
    return 0
  }
}
