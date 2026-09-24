import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HanKanjiTransliterator, PinyinRomanizer } from '@shared/lang'

const root = join(process.cwd(), 'resources', 'langdata')

function firstMapping(file: string): [string, string] {
  const lines = readFileSync(join(root, file), 'utf8').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const [src, dst] = line.split(/\s+/)
    if (src && dst) return [src, dst]
  }
  throw new Error(`${file} had no mappings`)
}

describe('bundled language resources', () => {
  it('parses the pinyin table and romanizes Han', () => {
    const pinyin = new PinyinRomanizer()
    pinyin.loadFromText(readFileSync(join(root, 'pinyin', 'pinyin.txt'), 'utf8'))
    expect(pinyin.isReady).toBe(true)
    const { latin } = pinyin.romanize('中国')
    expect(latin).not.toBe('中国')
    expect(latin.trim().length).toBeGreaterThan(0)
  })

  it('parses the han→kanji and kanji→han tables', () => {
    const hanKanji = new HanKanjiTransliterator('han-kanji', 'han', 'han')
    hanKanji.loadFromText(readFileSync(join(root, 'han', 'hanzi-kanji.txt'), 'utf8'))
    expect(hanKanji.isReady).toBe(true)

    const kanjiHan = new HanKanjiTransliterator('kanji-han', 'han', 'han')
    kanjiHan.loadFromText(readFileSync(join(root, 'han', 'kanji-hanzi.txt'), 'utf8'))
    expect(kanjiHan.isReady).toBe(true)

    const [srcHex, dstHex] = firstMapping(join('han', 'kanji-hanzi.txt'))
    const kanji = String.fromCodePoint(Number.parseInt(srcHex, 16))
    const han = String.fromCodePoint(Number.parseInt(dstHex, 16))
    expect(kanjiHan.transliterate(kanji)).toBe(han)
  })
})
