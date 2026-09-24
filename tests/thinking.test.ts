import { describe, it, expect } from 'vitest'
import { mergeThinking, splitThinking } from '../src/shared/domain/thinking'

describe('splitThinking', () => {
  it('returns empty thinking for plain text', () => {
    expect(splitThinking('Hello world')).toEqual({ thinking: '', visible: 'Hello world' })
  })

  it('extracts a complete think block', () => {
    const result = splitThinking('<think>Let me think.</think>Hei maailma')
    expect(result.thinking).toBe('Let me think.')
    expect(result.visible).toContain('Hei maailma')
    expect(result.visible).not.toContain('<think>')
  })

  it('treats an unclosed trailing block as thinking (mid-stream)', () => {
    const result = splitThinking('Hei <think>hmm, put')
    expect(result.thinking).toBe('hmm, put')
    expect(result.visible).not.toContain('hmm')
  })

  it('handles multiple blocks and tag variants case-insensitively', () => {
    const result = splitThinking('<THINK>first</THINK>mid<reasoning>second</reasoning>end')
    expect(result.thinking).toBe('first\n\nsecond')
    expect(result.visible).toContain('mid')
    expect(result.visible).toContain('end')
  })

  it('strips stray tags without content', () => {
    const result = splitThinking('Hello <think> world')
    expect(result.visible).not.toContain('<think>')
  })

  it('leaves text byte-identical when no blocks match', () => {
    const text = 'Keep  double  spaces\n\nand newlines.'
    expect(splitThinking(text)).toEqual({ thinking: '', visible: text })
  })
})

describe('mergeThinking', () => {
  it('combines SSE and embedded thinking', () => {
    expect(mergeThinking('a', 'b')).toBe('a\n\nb')
    expect(mergeThinking('a', '')).toBe('a')
    expect(mergeThinking('', 'b')).toBe('b')
    expect(mergeThinking('  ', '')).toBe('')
  })
})
