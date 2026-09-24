import { describe, it, expect } from 'vitest'
import { parseSseChunk } from '../src/main/llm/openai-compatible'

function line(payload: unknown): string {
  return `data: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`
}

describe('parseSseChunk', () => {
  it('parses plain content deltas as text', () => {
    expect(parseSseChunk(line({ choices: [{ delta: { content: 'Hei' } }] }))).toEqual([
      { type: 'text', text: 'Hei' }
    ])
  })

  it('surfaces reasoning_content as thinking, content as text', () => {
    expect(
      parseSseChunk(line({ choices: [{ delta: { reasoning_content: 'hmm', content: 'Hei' } }] }))
    ).toEqual([
      { type: 'thinking', text: 'hmm' },
      { type: 'text', text: 'Hei' }
    ])
  })

  it('supports the reasoning field and message-shaped payloads', () => {
    expect(parseSseChunk(line({ choices: [{ delta: { reasoning: 'r1' } }] }))).toEqual([
      { type: 'thinking', text: 'r1' }
    ])
    expect(parseSseChunk(line({ choices: [{ message: { reasoning_content: 'r2' } }] }))).toEqual([
      { type: 'thinking', text: 'r2' }
    ])
  })

  it('keeps legacy shapes working', () => {
    expect(parseSseChunk(line({ choices: [{ text: 'raw' }] }))).toEqual([
      { type: 'text', text: 'raw' }
    ])
    expect(
      parseSseChunk(line({ choices: [{ delta: { content: [{ text: 'a' }, { text: 'b' }] } }] }))
    ).toEqual([{ type: 'text', text: 'ab' }])
  })

  it('handles control lines and garbage', () => {
    expect(typeof parseSseChunk('data: [DONE]')).toBe('symbol')
    expect(parseSseChunk('data: ')).toBeNull()
    expect(parseSseChunk(': comment')).toBeNull()
    expect(parseSseChunk('data: not json')).toBeNull()
    expect(parseSseChunk(line({ choices: [{ delta: {} }] }))).toBeNull()
  })

  it('throws provider errors', () => {
    expect(() => parseSseChunk(line({ error: 'boom' }))).toThrow('boom')
    expect(() => parseSseChunk(line({ error: { message: 'bad key' } }))).toThrow('bad key')
  })
})
