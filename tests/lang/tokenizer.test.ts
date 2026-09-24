import { describe, expect, it } from 'vitest'
import { KoreanTokenizer, WhitespaceTokenizer, createCjkTokenizer } from '@shared/lang/tokenizers'

describe('tokenizers', () => {
  it('CJK reconstructs text and keeps contiguous offsets', () => {
    const text = '我爱学习中文。'
    const segments = createCjkTokenizer().segment(text)
    expect(segments.map((s) => s.text).join('')).toBe(text)
    expect(segments.some((s) => s.word && s.text.includes('爱'))).toBe(true)
    for (let i = 0; i < segments.length - 1; i++) {
      expect(segments[i].end).toBe(segments[i + 1].start)
    }
  })

  it('CJK separates Han from Latin', () => {
    const segments = createCjkTokenizer().segment('你好world')
    expect(segments.map((s) => s.text).join('')).toBe('你好world')
    const han = segments.find((s) => s.text === '你好')
    const latin = segments.find((s) => s.text === 'world')
    expect(han?.word).toBe(true)
    expect(latin?.word).toBe(true)
    expect((han?.end ?? 0) <= (latin?.start ?? 0)).toBe(true)
  })

  it('Korean tokenizes words by whitespace', () => {
    const segments = KoreanTokenizer.segment('안녕하세요 세계')
    expect(segments.filter((s) => s.word).map((s) => s.text)).toEqual(['안녕하세요', '세계'])
  })

  it('whitespace preserves punctuation', () => {
    const segments = WhitespaceTokenizer.segment('Привет, мир!')
    expect(segments.map((s) => s.text)).toEqual(['Привет', ', ', 'мир', '!'])
  })
})
