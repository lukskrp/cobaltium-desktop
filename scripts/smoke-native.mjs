// Smoke test for the bundled native bridges (TTS + whisper-server).
// Verifies the current platform's artifacts exist and the server binary runs.
// Usage: pnpm smoke:native (also runs in the CI native matrix).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const platform = `${process.platform}-${process.arch}`

let failures = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

const ttsDir = join(projectRoot, 'resources', 'tts', platform)
const espeakLib =
  process.platform === 'win32'
    ? 'espeak_bridge.dll'
    : process.platform === 'darwin'
      ? 'libespeak_bridge.dylib'
      : 'libespeak_bridge.so'
const jaLib =
  process.platform === 'win32' ? 'ja_bridge.dll' : process.platform === 'darwin' ? 'libja_bridge.dylib' : 'libja_bridge.so'
check('espeak bridge present', existsSync(join(ttsDir, espeakLib)), join(ttsDir, espeakLib))
check('japanese bridge present', existsSync(join(ttsDir, jaLib)), join(ttsDir, jaLib))

const sttDir = join(projectRoot, 'resources', 'stt', platform)
const serverBin = process.platform === 'win32' ? 'whisper-server.exe' : 'whisper-server'
const serverPath = join(sttDir, serverBin)
check('whisper-server present', existsSync(serverPath), serverPath)

if (existsSync(serverPath)) {
  const probed = spawnSync(serverPath, ['--version'], { timeout: 15000 })
  const out = `${probed.stdout ?? ''}${probed.stderr ?? ''}`.slice(0, 200).trim()
  check('whisper-server runs', !probed.error && probed.status === 0, out.split('\n')[0] ?? '')
} else {
  check('whisper-server runs', false, 'binary missing (run pnpm build:whisper)')
}

if (failures > 0) {
  console.error(`smoke-native: ${failures} check(s) failed`)
  process.exit(1)
}
console.log('smoke-native: all checks passed')
