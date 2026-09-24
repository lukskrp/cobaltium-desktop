import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { type ChildProcess, spawn } from 'node:child_process'
import { serverBinaryName, WHISPER_SERVER_PORT, whisperLangCode } from '@shared/stt/catalog'
import { modelPath } from './provision'

const START_TIMEOUT_MS = 60_000
const POLL_MS = 250

interface RunningServer {
  child: ChildProcess
  model: string
  lang: string
  port: number
}

let current: RunningServer | null = null

function platformDir(): string {
  return `${process.platform}-${process.arch}`
}

/** Absolute path of the bundled whisper-server binary, if present. */
export function serverBinaryPath(): string | null {
  const override = process.env.COBALTIUM_WHISPER_BIN
  if (override && existsSync(override)) return override
  const relative = join('stt', platformDir(), serverBinaryName())
  const candidate = app.isPackaged
    ? join(process.resourcesPath, relative)
    : join(app.getAppPath(), 'resources', relative)
  return existsSync(candidate) ? candidate : null
}

export function serverAvailable(): boolean {
  return serverBinaryPath() !== null
}

function baseUrl(port: number): string {
  return `http://127.0.0.1:${port}`
}

async function waitReady(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const response = await fetch(baseUrl(port), { method: 'GET' })
      // Any HTTP answer (even 404) proves the server is listening.
      if (response) {
        await response.body?.cancel().catch(() => undefined)
        return true
      }
    } catch {
      // not up yet
    }
    if (Date.now() >= deadline) return false
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}

/** Start (or reuse) whisper-server for the given model + language. */
export async function ensureServer(model: string, lang: string): Promise<number> {
  const language = whisperLangCode(lang)
  if (current && current.model === model && current.lang === language && current.child.exitCode === null) {
    return current.port
  }
  stopServer()

  const binary = serverBinaryPath()
  if (!binary) throw new Error('whisper-server binary not found (run pnpm build:whisper)')
  const weights = modelPath(model)
  if (!existsSync(weights)) throw new Error(`Speech model '${model}' is not downloaded`)

  const port = WHISPER_SERVER_PORT
  const child = spawn(binary, [
    '-m', weights,
    '--host', '127.0.0.1',
    '--port', String(port),
    '--language', language
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  child.on('error', (error) => {
    console.warn('[stt] whisper-server failed to start:', error.message)
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    const line = chunk.toString().trim()
    if (line) console.debug('[stt]', line.slice(0, 200))
  })
  current = { child, model, lang: language, port }
  const ready = await waitReady(port, START_TIMEOUT_MS)
  if (!ready) {
    stopServer()
    throw new Error('whisper-server did not become ready in time')
  }
  return port
}

export function stopServer(): void {
  if (!current) return
  try {
    current.child.kill()
  } catch {
    // already gone
  }
  current = null
}

export function serverRunning(): boolean {
  return current !== null && current.child.exitCode === null
}
