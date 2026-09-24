import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import * as kuromoji from 'kuromoji'
import {
  HepburnRomanizer,
  type Romanization,
  type Romanizer,
  type TextSegment,
  type Tokenizer
} from '@shared/lang'

type KuromojiTokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/

function dictPath(): string | null {
  const candidates = [
    app.isPackaged
      ? join(process.resourcesPath, 'kuromoji-dict')
      : join(app.getAppPath(), 'resources', 'kuromoji-dict'),
    join(app.getAppPath(), 'node_modules', 'kuromoji', 'dict')
  ]
  return candidates.find((path) => existsSync(path)) ?? null
}

function build(dicPath: string): Promise<KuromojiTokenizer> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((error, tokenizer) => {
      if (error) reject(error)
      else resolve(tokenizer)
    })
  })
}

function segmentsFrom(text: string, tokenizer: KuromojiTokenizer): TextSegment[] {
  const tokens = tokenizer.tokenize(text)
  const segments: TextSegment[] = []
  let cursor = 0
  for (const token of tokens) {
    const surface = token.surface_form
    let start = text.indexOf(surface, cursor)
    if (start < 0) start = cursor
    const end = start + surface.length
    segments.push({ text: surface, start, end, word: /[\p{L}\p{N}]/u.test(surface) })
    cursor = end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), start: cursor, end: text.length, word: false })
  }
  return segments
}

export interface JaAnalyzers {
  tokenizer: Tokenizer
  romanizer: Romanizer
}

/**
 * Builds the Japanese tokenizer (kuromoji + IPADIC) and a kanji-reading-aware
 * Hepburn romanizer from the bundled dictionary. Returns null when the
 * dictionary is unavailable, letting the engine fall back to CJK segmentation.
 */
export async function createJaAnalyzers(): Promise<JaAnalyzers | null> {
  const dict = dictPath()
  if (!dict) return null
  let native: KuromojiTokenizer
  try {
    native = await build(dict)
  } catch {
    return null
  }

  const hepburn = new HepburnRomanizer()
  const tokenizer: Tokenizer = { segment: (text) => segmentsFrom(text, native) }
  const romanizer: Romanizer = {
    scheme: 'hepburn',
    romanize(text: string): Romanization {
      let out = ''
      for (const token of native.tokenize(text)) {
        const surface = token.surface_form
        const reading = token.reading
        const source = HAN.test(surface) && reading && reading !== '*' ? reading : surface
        out += hepburn.romanize(source).latin
      }
      return { source: text, latin: out, scheme: 'hepburn' }
    }
  }
  return { tokenizer, romanizer }
}
