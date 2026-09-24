import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import koffi from 'koffi'

/**
 * Japanese G2P via the vendored `ja_bridge` (Rust, jpreprocess/OpenJTalk,
 * BSD-3-Clause). The bridge returns OpenJTalk full-context labels; the
 * label → IPA + prosody mapping below is a port of piper1-gpl's
 * `src/piper/phonemize_japanese.py`.
 */

type NativeFn = (...args: unknown[]) => unknown
interface KoffiLib {
  func(signature: string): NativeFn
}

const OPENJTALK_TO_IPA: Record<string, string> = {
  a: 'a',
  i: 'i',
  u: 'ɯ',
  e: 'e',
  o: 'o',
  k: 'k',
  ky: 'kʲ',
  kw: 'kʷ',
  g: 'ɡ',
  gy: 'ɡʲ',
  gw: 'ɡʷ',
  s: 's',
  sh: 'ɕ',
  z: 'z',
  j: 'dʑ',
  t: 't',
  ts: 'ts',
  ty: 'tʲ',
  ch: 'tɕ',
  d: 'd',
  dy: 'dʲ',
  n: 'n',
  ny: 'nʲ',
  h: 'h',
  hy: 'hʲ',
  f: 'ɸ',
  b: 'b',
  by: 'bʲ',
  p: 'p',
  py: 'pʲ',
  m: 'm',
  my: 'mʲ',
  y: 'j',
  r: 'ɾ',
  ry: 'ɾʲ',
  w: 'w',
  v: 'v',
  N: 'ɴ',
  cl: 'ʔ'
}

const DEVOICED_VOWELS = new Set(['A', 'I', 'U', 'E', 'O'])
const MORA_FINAL_PHONES = new Set(['a', 'i', 'u', 'e', 'o', 'A', 'I', 'U', 'E', 'O', 'N', 'cl'])
const ACCENT_RISE = '↑'
const ACCENT_FALL = '↓'
const ACCENT_PHRASE_BOUNDARY = '#'
const PAUSE = ','
const DECLARATIVE_END = '.'
const INTERROGATIVE_END = '?'
const PROSODY_SYMBOLS = new Set([
  ACCENT_RISE,
  ACCENT_FALL,
  ACCENT_PHRASE_BOUNDARY,
  PAUSE,
  DECLARATIVE_END,
  INTERROGATIVE_END
])

let lib: KoffiLib | null = null
let loadError: string | null = null
let extractFn: NativeFn | null = null

function platformDir(): string {
  return `${process.platform}-${process.arch}`
}

function libraryName(): string {
  if (process.platform === 'win32') return 'ja_bridge.dll'
  if (process.platform === 'darwin') return 'libja_bridge.dylib'
  return 'libja_bridge.so'
}

export function japaneseLibraryPath(): string {
  const relative = join('tts', platformDir(), libraryName())
  return app.isPackaged
    ? join(process.resourcesPath, relative)
    : join(app.getAppPath(), 'resources', relative)
}

export function japaneseAvailable(): boolean {
  return existsSync(japaneseLibraryPath())
}

function getLib(): KoffiLib | null {
  if (lib) return lib
  if (loadError) return null
  try {
    lib = koffi.load(japaneseLibraryPath()) as KoffiLib
    extractFn = lib.func('int ja_bridge_extract(const char *text, char *out, int cap)')
    return lib
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error)
    console.warn('[tts] failed to load ja bridge:', loadError)
    return null
  }
}

function extractLabels(text: string): string[] {
  if (!getLib() || !extractFn) return []
  let cap = 1 << 16
  let buffer = Buffer.alloc(cap)
  let needed = extractFn(text, buffer, cap) as number
  if (needed < 0) return []
  if (needed >= cap) {
    cap = needed + 1
    buffer = Buffer.alloc(cap)
    needed = extractFn(text, buffer, cap) as number
    if (needed < 0) return []
  }
  const joined = buffer.toString('utf8', 0, needed)
  return joined === '' ? [] : joined.split('\n')
}

function numericFeature(pattern: RegExp, label: string): number {
  const match = pattern.exec(label)
  return match ? Number.parseInt(match[1], 10) : -50
}

function labelsToPhones(labels: string[]): string[] {
  const phones: string[] = []
  const count = labels.length
  for (let index = 0; index < count; index++) {
    const label = labels[index]
    const match = /-([^+]*)\+/.exec(label)
    if (!match) continue
    let phone = match[1]
    if (DEVOICED_VOWELS.has(phone)) phone = phone.toLowerCase()
    if (phone === 'sil') {
      if (index === count - 1) {
        const isQuestion = numericFeature(/!(\d+)_/, label) === 1
        phones.push(isQuestion ? INTERROGATIVE_END : DECLARATIVE_END)
      }
      continue
    }
    if (phone === 'pau') {
      phones.push(PAUSE)
      continue
    }
    phones.push(phone)
    if (index >= count - 1) continue

    const a1 = numericFeature(/\/A:([0-9-]+)\+/, label)
    const a2 = numericFeature(/\+(\d+)\+/, label)
    const a3 = numericFeature(/\+(\d+)\//, label)
    const f1 = numericFeature(/\/F:(\d+)_/, label)
    const a2Next = numericFeature(/\+(\d+)\+/, labels[index + 1])

    if (a3 === 1 && a2Next === 1 && MORA_FINAL_PHONES.has(phone)) {
      phones.push(ACCENT_PHRASE_BOUNDARY)
    } else if (a1 === 0 && a2Next === a2 + 1 && a2 !== f1) {
      phones.push(ACCENT_FALL)
    } else if (a2 === 1 && a2Next === 2) {
      phones.push(ACCENT_RISE)
    }
  }
  return phones
}

function phonesToIpa(phones: string[]): string {
  let out = ''
  for (const phone of phones) {
    if (PROSODY_SYMBOLS.has(phone)) {
      out += phone
      continue
    }
    const ipa = OPENJTALK_TO_IPA[phone]
    if (ipa === undefined) continue
    out += ipa
  }
  return out
}

/**
 * Phonemize Japanese text to IPA with prosody symbols (pitch accent `↑`/`↓`,
 * phrase boundaries `#`, pauses `,`, sentence end `.`/`?`). Returns null when
 * the bridge is unavailable.
 */
export function phonemizeJapanese(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed === '') return ''
  if (!getLib()) return null
  return phonesToIpa(labelsToPhones(extractLabels(trimmed)))
}
