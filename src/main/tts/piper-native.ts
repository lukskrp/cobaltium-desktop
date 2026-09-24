import { app } from 'electron'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import type { TtsAudio } from '@shared/ipc'

/**
 * Optional native Piper tier (GPL). Only used when the user supplies a piper
 * executable (COBALTIUM_PIPER) and voice models under resources/piper; it is
 * never bundled or linked with the LGPL core. The offline VITS engine is the
 * primary path; OS voices are the final fallback.
 */

function piperExecutable(): string | null {
  const configured = process.env.COBALTIUM_PIPER
  return configured && existsSync(configured) ? configured : null
}

function piperRoot(): string {
  const packaged = join(process.resourcesPath, 'piper')
  if (app.isPackaged && existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'resources', 'piper')
}

export function nativePiperAvailable(): boolean {
  if (!piperExecutable()) return false
  const dir = piperRoot()
  return existsSync(dir) && readdirSync(dir).some((file) => file.endsWith('.onnx'))
}

function voiceFileFor(lang: string): string | null {
  const dir = piperRoot()
  if (!existsSync(dir)) return null
  const prefix = lang.toLowerCase().slice(0, 2)
  const match = readdirSync(dir).find(
    (file) => file.endsWith('.onnx') && file.toLowerCase().startsWith(prefix)
  )
  return match ? join(dir, match) : null
}

/** Synthesize with a user-supplied Piper binary/voices. Returns null when unavailable. */
export async function synthesizeNativePiper(text: string, lang: string): Promise<TtsAudio | null> {
  const executable = piperExecutable()
  if (!executable) return null
  const voice = voiceFileFor(lang)
  if (!voice) return null

  return await new Promise<TtsAudio | null>((resolve) => {
    const child = spawn(executable, ['--model', voice, '--output_file', '-'])
    const chunks: Buffer[] = []
    child.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.on('error', () => resolve(null))
    child.on('close', (code) => {
      if (code !== 0 || chunks.length === 0) {
        resolve(null)
        return
      }
      resolve({ audioBase64: Buffer.concat(chunks).toString('base64'), format: 'wav' })
    })
    child.stdin?.write(text)
    child.stdin?.end()
  })
}
