import { describe, expect, it } from 'vitest'
import { ScriptDetector } from '@shared/lang/script-detector'

describe('ScriptDetector', () => {
  it('detects Latin', () => {
    expect(ScriptDetector.detect('hello world, how are you?')).toBe('latin')
  })

  it('detects Cyrillic', () => {
    expect(ScriptDetector.detect('Привет, как дела?')).toBe('cyrillic')
  })

  it('detects Greek', () => {
    expect(ScriptDetector.detect('Καλημέρα κόσμε')).toBe('greek')
  })

  it('detects Devanagari', () => {
    expect(ScriptDetector.detect('नमस्ते दुनिया')).toBe('devanagari')
  })

  it('detects Hangul', () => {
    expect(ScriptDetector.detect('안녕하세요 세계')).toBe('hangul')
  })

  it('detects Hiragana and Katakana', () => {
    expect(ScriptDetector.detect('こんにちは')).toBe('hiragana')
    expect(ScriptDetector.detect('コンニチハ')).toBe('katakana')
  })

  it('keeps kana dominant over a stray kanji', () => {
    expect(ScriptDetector.detect('こんにちは世界')).toBe('hiragana')
  })

  it('detects Han, Arabic, Hebrew and Syriac', () => {
    expect(ScriptDetector.detect('你好世界')).toBe('han')
    expect(ScriptDetector.detect('مرحبا بالعالم')).toBe('arabic')
    expect(ScriptDetector.detect('שלום עולם')).toBe('hebrew')
    expect(ScriptDetector.detect('\u0710\u0726\u0718')).toBe('syriac')
  })

  it('handles supplementary Han (surrogate pairs)', () => {
    expect(ScriptDetector.detect('\u{20010}')).toBe('han')
  })

  it('returns null for neutral-only text', () => {
    expect(ScriptDetector.detect('  123 .,!? ')).toBeNull()
  })
})
