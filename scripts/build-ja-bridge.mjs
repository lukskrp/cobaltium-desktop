// Builds the ja_bridge shared library (Rust, jpreprocess + bundled NAIST-JDIC)
// into resources/tts/<platform>/. BSD-3-Clause library.
//
// Requires a Rust toolchain (https://rustup.rs). Set COBALTIUM_JA_LIB to a
// prebuilt library path to skip cargo.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const crateDir = join(projectRoot, 'vendor', 'ja-bridge')

const platform = `${process.platform}-${process.arch}`
const libName =
  process.platform === 'win32'
    ? 'ja_bridge.dll'
    : process.platform === 'darwin'
      ? 'libja_bridge.dylib'
      : 'libja_bridge.so'
const outDir = join(projectRoot, 'resources', 'tts', platform)
const outFile = join(outDir, libName)

const override = process.env.COBALTIUM_JA_LIB
if (override && existsSync(override)) {
  mkdirSync(outDir, { recursive: true })
  copyFileSync(override, outFile)
  console.log(`ja-bridge: copied prebuilt ${override} -> ${outFile}`)
  process.exit(0)
}

function cargoPath() {
  const name = process.platform === 'win32' ? 'cargo.exe' : 'cargo'
  const local = join(homedir(), '.cargo', 'bin', name)
  return existsSync(local) ? local : name
}

const cargo = cargoPath()
console.log(`ja-bridge: cargo build --release (${platform})`)
const result = spawnSync(cargo, ['build', '--release'], { cwd: crateDir, stdio: 'inherit' })
if (result.error) {
  console.error('cargo was not found. Install Rust (https://rustup.rs) or set COBALTIUM_JA_LIB.')
  process.exit(1)
}
if (result.status !== 0) process.exit(result.status ?? 1)

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

const built = findFile(join(crateDir, 'target', 'release'), libName)
if (!built) {
  console.error(`expected library not found under target/release: ${libName}`)
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
copyFileSync(built, outFile)
console.log(`ja-bridge: ${built} -> ${outFile}`)
