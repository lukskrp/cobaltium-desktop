import { describe, expect, it } from 'vitest'
import {
  cleanFences,
  LlmJsonParser
} from '@shared/domain/json-parser'

describe('LlmJsonParser', () => {
  it('parses a flat JSON object inside a markdown fence', () => {
    const text = '```json\n{"pos":"verb","tense":"present"}\n```'
    expect(LlmJsonParser.parseJsonObject(text)).toEqual({ pos: 'verb', tense: 'present' })
  })

  it('strips <think> blocks', () => {
    const text = '<think>reasoning here {not json}</think>{"pos":"noun"}'
    expect(LlmJsonParser.parseJsonObject(text)).toEqual({ pos: 'noun' })
  })

  it('parses translation with glosses', () => {
    const text =
      '{"translation":"hola mundo","glosses":[{"native":"hello","foreign":"hola"},{"native":"world","foreign":"mundo"}]}'
    const parsed = LlmJsonParser.parseTranslation(text)
    expect(parsed?.translation).toBe('hola mundo')
    expect(parsed?.glosses).toEqual([
      { native: 'hello', foreign: 'hola' },
      { native: 'world', foreign: 'mundo' }
    ])
  })

  it('falls back to pulling the translation string when JSON is malformed', () => {
    const text = 'Sure! {"translation":"bonjour", "glosses": ['
    expect(LlmJsonParser.parseTranslation(text)?.translation).toBe('bonjour')
  })

  it('parses a JSON array of flat objects', () => {
    const text = '[{"headword":"chat","pos":"noun"},{"headword":"chien","pos":"noun"}]'
    expect(LlmJsonParser.parseJsonArray(text)).toEqual([
      { headword: 'chat', pos: 'noun' },
      { headword: 'chien', pos: 'noun' }
    ])
  })

  it('maps analysis fields', () => {
    const analysis = LlmJsonParser.toAnalysis({ pos: 'noun', gender: 'feminine' })
    expect(analysis.pos).toBe('noun')
    expect(analysis.gender).toBe('feminine')
    expect(analysis.tense).toBeUndefined()
  })

  it('cleanFences leaves plain text untouched', () => {
    expect(cleanFences('  hello  ')).toBe('hello')
  })
})
