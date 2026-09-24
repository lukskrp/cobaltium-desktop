import { describe, it, expect } from 'vitest'
import {
  createCjkTokenizer,
  createSegmenterTokenizer,
  KoreanTokenizer
} from '../src/shared/lang/tokenizers'

describe('createSegmenterTokenizer', () => {
  it('segments Korean words with word flags', () => {
    const segments = createSegmenterTokenizer('ko').segment('안녕하세요 세계')
    const words = segments.filter((s) => s.word).map((s) => s.text)
    expect(words.length).toBeGreaterThan(0)
    expect(words.join('')).toContain('안녕하세요')
  })

  it('returns an empty array for empty input', () => {
    expect(createSegmenterTokenizer('ko').segment('')).toEqual([])
  })
})

describe('KoreanTokenizer', () => {
  it('routes through the Korean segmenter, not plain whitespace', () => {
    const segments = KoreanTokenizer.segment('안녕하세요')
    const words = segments.filter((s) => s.word)
    expect(words.length).toBeGreaterThan(0)
    expect(words[0].text).toBe('안녕하세요')
  })
})

describe('createCjkTokenizer', () => {
  it('still segments Chinese', () => {
    const segments = createCjkTokenizer().segment('你好世界')
    expect(segments.filter((s) => s.word).length).toBeGreaterThan(0)
  })
})
