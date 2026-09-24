import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import koffi from 'koffi'

/**
 * FFI binding to the vendored `espeak_bridge` shared library, which statically
 * links espeak-ng (GPLv3). espeak only phonemizes here; audio is synthesized by
 * the VITS engine. espeak-ng has process-global state and is not thread-safe,
 * but the Electron main process is single-threaded and the calls are
 * synchronous, so no locking is required.
 */

type NativeFn = (...args: unknown[]) => unknown
interface KoffiLib {
  func(signature: string): NativeFn
}

let lib: KoffiLib | null = null
let loadError: string | null = null
let initialized = false
let initFn: NativeFn | null = null
let phonemizeFn: NativeFn | null = null
let terminateFn: NativeFn | null = null

function platformDir(): string {
  return `${process.platform}-${process.arch}`
}

function libraryName(): string {
  if (process.platform === 'win32') return 'espeak_bridge.dll'
  if (process.platform === 'darwin') return 'libespeak_bridge.dylib'
  return 'libespeak_bridge.so'
}

export function espeakLibraryPath(): string {
  const relative = join('tts', platformDir(), libraryName())
  return app.isPackaged
    ? join(process.resourcesPath, relative)
    : join(app.getAppPath(), 'resources', relative)
}

/** Directory holding the compiled espeak-ng-data (phondata, *_dict, …). */
export function espeakDataDir(): string {
  const packaged = join(process.resourcesPath, 'espeak-ng-data')
  if (app.isPackaged && existsSync(join(packaged, 'phondata'))) return packaged
  return join(app.getAppPath(), 'resources', 'espeak-ng-data')
}

export function espeakAvailable(): boolean {
  return existsSync(espeakLibraryPath()) && existsSync(join(espeakDataDir(), 'phondata'))
}

function getLib(): KoffiLib | null {
  if (lib) return lib
  if (loadError) return null
  try {
    lib = koffi.load(espeakLibraryPath()) as KoffiLib
    return lib
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error)
    console.warn('[tts] failed to load espeak bridge:', loadError)
    return null
  }
}

function ensureInit(): boolean {
  if (initialized) return true
  const loaded = getLib()
  if (!loaded) return false
  initFn = loaded.func('int espeak_bridge_init(const char *data_path)')
  phonemizeFn = loaded.func(
    'int espeak_bridge_phonemize(const char *voice, const char *text, char *out, int cap)'
  )
  terminateFn = loaded.func('void espeak_bridge_terminate()')
  const rate = initFn(espeakDataDir()) as number
  if (rate < 0) {
    loadError = `espeak init failed (${rate})`
    console.warn('[tts]', loadError)
    return false
  }
  initialized = true
  return true
}

/**
 * Phonemize `text` with the given espeak voice (e.g. "fi", "en-us", "cmn").
 * Returns the IPA string (word-boundary spaces, stress and length marks), or
 * null when the engine is unavailable or fails.
 */
export function espeakPhonemize(text: string, voice: string): string | null {
  if (text.trim() === '') return ''
  if (!ensureInit() || !phonemizeFn) return null

  let cap = 1024
  let buffer = Buffer.alloc(cap)
  let needed = phonemizeFn(voice, text, buffer, cap) as number
  if (needed < 0) return null
  if (needed >= cap) {
    cap = needed + 1
    buffer = Buffer.alloc(cap)
    needed = phonemizeFn(voice, text, buffer, cap) as number
    if (needed < 0) return null
  }
  return buffer.toString('utf8', 0, needed)
}

/** Release espeak's global state (called on quit). */
export function disposeEspeak(): void {
  if (initialized && terminateFn) {
    try {
      terminateFn()
    } catch {
      // ignore
    }
  }
  initialized = false
}
