// Builds the whisper-server binary (MIT) into resources/stt/<platform>/.
//
// Requires CMake and a C++ compiler; the whisper.cpp source is fetched into
// vendor/whisper.cpp on first run. Set COBALTIUM_WHISPER_BIN to a prebuilt
// whisper-server binary path to skip the build.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const whisperSrc = join(projectRoot, 'vendor', 'whisper.cpp')
const buildDir = join(whisperSrc, 'build-cobaltium')
const WHISPER_TAG = 'v1.9.2'

const platform = `${process.platform}-${process.arch}`
const binName = process.platform === 'win32' ? 'whisper-server.exe' : 'whisper-server'
const outDir = join(projectRoot, 'resources', 'stt', platform)
const outFile = join(outDir, binName)

const override = process.env.COBALTIUM_WHISPER_BIN
if (override && existsSync(override)) {
  mkdirSync(outDir, { recursive: true })
  copyFileSync(override, outFile)
  console.log(`whisper: copied prebuilt ${override} -> ${outFile}`)
  process.exit(0)
}

if (!existsSync(join(whisperSrc, 'CMakeLists.txt'))) {
  console.log(`whisper: fetching whisper.cpp ${WHISPER_TAG} into vendor/whisper.cpp`)
  const clone = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', WHISPER_TAG, 'https://github.com/ggml-org/whisper.cpp.git', whisperSrc],
    { stdio: 'inherit' }
  )
  if (clone.error || clone.status !== 0) {
    console.error('Failed to clone whisper.cpp. Install git or set COBALTIUM_WHISPER_BIN.')
    process.exit(clone.status ?? 1)
  }
}

const cmake = process.platform === 'win32' ? 'cmake.exe' : 'cmake'
console.log('whisper: configuring')
const configureFlags = [
  '-S',
  whisperSrc,
  '-B',
  buildDir,
  '-DCMAKE_BUILD_TYPE=Release',
  '-DWHISPER_BUILD_TESTS=OFF',
  // Self-contained binaries: no OpenMP runtime dependency (the ggml
  // threadpool still parallelizes), static CRT on Windows so the shipped
  // binary runs without a VC redist / vcomp DLL on the target machine.
  '-DGGML_OPENMP=OFF'
]
if (process.platform === 'win32') {
  configureFlags.push('-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded')
}
const configure = spawnSync(cmake, configureFlags, { stdio: 'inherit' })
if (configure.error || configure.status !== 0) {
  console.error('CMake configure failed. Is CMake and a C++ compiler installed and on PATH?')
  process.exit(configure.status ?? 1)
}

console.log('whisper: building (server target only)')
const build = spawnSync(cmake, ['--build', buildDir, '--config', 'Release', '--target', 'whisper-server'], {
  stdio: 'inherit'
})
if (build.error || build.status !== 0) process.exit(build.status ?? 1)

function findFile(dir, name) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      const found = findFile(full, name)
      if (found) return found
    } else if (entry === name) {
      return full
    }
  }
  return null
}

const built = findFile(buildDir, binName)
if (!built) {
  console.error(`expected binary not found under ${buildDir}: ${binName}`)
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
copyFileSync(built, outFile)
console.log(`whisper: ${built} -> ${outFile}`)

// Newer ggml splits into shared libraries next to the binary; ship them too
// or the server fails to start with a missing-DLL error on user machines.
const binDir = dirname(built)
for (const entry of readdirSync(binDir)) {
  const lower = entry.toLowerCase()
  const isRuntimeLib =
    (process.platform === 'win32' && lower.endsWith('.dll')) ||
    (process.platform === 'darwin' && (lower.endsWith('.dylib') || lower.endsWith('.so'))) ||
    (process.platform !== 'win32' &&
      process.platform !== 'darwin' &&
      (lower.endsWith('.so') || lower.includes('.so.')))
  const isOurs = lower.startsWith('ggml') || lower.startsWith('whisper') || lower.startsWith('libggml') || lower.startsWith('libwhisper')
  if (isRuntimeLib && isOurs && join(binDir, entry) !== built) {
    copyFileSync(join(binDir, entry), join(outDir, entry))
    console.log(`whisper: ${join(binDir, entry)} -> ${join(outDir, entry)}`)
  }
}
