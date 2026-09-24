import { describe, expect, it } from 'vitest'
import { createLanguageEngine, type TextSegment } from '@shared/lang'

const fakeSegments: TextSegment[] = [{ text: 'テスト', start: 0, end: 3, word: true }]
const fakeTokenizer = { segment: () => fakeSegments }

describe('createLanguageEngine overrides', () => {
  it('lets callers replace the ja tokenizer', () => {
    const { engine } = createLanguageEngine({ tokenizers: { sudachi: fakeTokenizer } })
    expect(engine.tokenize('テスト', 'ja')).toEqual(fakeSegments)
  })

  it('lets callers replace the hepburn romanizer', () => {
    const romanizer = {
      scheme: 'hepburn',
      romanize: (text: string) => ({ source: text, latin: 'ROMAJI', scheme: 'hepburn' })
    }
    const { engine } = createLanguageEngine({ romanizers: { hepburn: romanizer } })
    expect(engine.romanize('東京', 'ja')?.latin).toBe('ROMAJI')
  })
})
