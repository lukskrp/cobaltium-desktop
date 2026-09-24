// Builds the espeak_bridge shared library (GPLv3) into resources/tts/<platform>/.
//
// Requires CMake and a C compiler; the espeak-ng 1.52.0 source is fetched into
// vendor/espeak-ng on first run. Set COBALTIUM_ESPEAK_LIB to a prebuilt library
// path to skip the build.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const bridgeDir = join(projectRoot, 'vendor', 'espeak-bridge')
const espeakSrc = join(projectRoot, 'vendor', 'espeak-ng')
const buildDir = join(bridgeDir, 'build')
const ESPEAK_TAG = '1.52.0'

const platform = `${process.platform}-${process.arch}`
const libName =
  process.platform === 'win32'
    ? 'espeak_bridge.dll'
    : process.platform === 'darwin'
      ? 'libespeak_bridge.dylib'
      : 'libespeak_bridge.so'
const outDir = join(projectRoot, 'resources', 'tts', platform)
const outFile = join(outDir, libName)

const override = process.env.COBALTIUM_ESPEAK_LIB
if (override && existsSync(override)) {
  mkdirSync(outDir, { recursive: true })
  copyFileSync(override, outFile)
  console.log(`espeak: copied prebuilt ${override} -> ${outFile}`)
  process.exit(0)
}

if (!existsSync(join(espeakSrc, 'src', 'libespeak-ng', 'CMakeLists.txt'))) {
  console.log(`espeak: fetching espeak-ng ${ESPEAK_TAG} into vendor/espeak-ng`)
  const clone = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', ESPEAK_TAG, 'https://github.com/espeak-ng/espeak-ng.git', espeakSrc],
    { stdio: 'inherit' }
  )
  if (clone.error || clone.status !== 0) {
    console.error('Failed to clone espeak-ng. Install git or set COBALTIUM_ESPEAK_LIB.')
    process.exit(clone.status ?? 1)
  }
}

const cmake = process.platform === 'win32' ? 'cmake.exe' : 'cmake'
console.log('espeak: configuring')
const configure = spawnSync(
  cmake,
  ['-S', bridgeDir, '-B', buildDir, '-DESPEAK_SRC=' + espeakSrc, '-DCMAKE_BUILD_TYPE=Release'],
  { stdio: 'inherit' }
)
if (configure.error || configure.status !== 0) {
  console.error('CMake configure failed. Is CMake installed and on PATH?')
  process.exit(configure.status ?? 1)
}

console.log('espeak: building')
const build = spawnSync(cmake, ['--build', buildDir, '--config', 'Release'], { stdio: 'inherit' })
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

const built = findFile(buildDir, libName)
if (!built) {
  console.error(`expected library not found under ${buildDir}: ${libName}`)
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
copyFileSync(built, outFile)
console.log(`espeak: ${built} -> ${outFile}`)
