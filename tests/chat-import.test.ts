import { describe, it, expect } from 'vitest'
import { parseChatImport } from '../src/shared/domain/chat-import'

function sample(
  title = 'Greetings',
  mode = 'reflective',
  messages = `
    {"role":"user","content":"Hello","createdAt":1000},
    {"role":"assistant","content":"Hei","createdAt":2000}
  `
): string {
  return `{
    "format": "cobaltium.chat",
    "version": 1,
    "exportedAt": 9999,
    "source": "phonos-assist",
    "thread": { "title": "${title}", "mode": "${mode}", "createdAt": 500, "updatedAt": 2500 },
    "messages": [ ${messages} ]
  }`
}

let nextId = 0
const ids = (): string => `id-${++nextId}`

describe('parseChatImport', () => {
  it('parses a valid export', () => {
    const result = parseChatImport(sample(), ids, () => 9999)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.thread.title).toBe('Greetings')
    expect(result.thread.mode).toBe('reflective')
    expect(result.thread.createdAt).toBe(500)
    expect(result.thread.updatedAt).toBe(2500)
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[0].content).toBe('Hello')
    expect(result.messages[1].role).toBe('assistant')
    expect(result.messages[1].content).toBe('Hei')
    expect(result.messages.every((m) => m.threadId === result.thread.id)).toBe(true)
    expect(result.messages[0].id).not.toBe(result.messages[1].id)
  })

  it('preserves original timestamps', () => {
    const result = parseChatImport(sample(), ids, () => 9999)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.messages[0].createdAt).toBe(1000)
    expect(result.messages[1].createdAt).toBe(2000)
  })

  it('bumps equal or missing timestamps to keep order', () => {
    const json = sample(
      'Greetings',
      'reflective',
      `
      {"role":"user","content":"A","createdAt":1000},
      {"role":"assistant","content":"B","createdAt":1000},
      {"role":"user","content":"C","createdAt":0}
      `
    )
    const result = parseChatImport(json, ids, () => 9999)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.messages.map((m) => m.createdAt)).toEqual([1000, 1001, 1002])
  })

  it('ignores unknown fields', () => {
    const json = sample().replace('"thread": {', '"futureField": true, "thread": {')
    expect(parseChatImport(json, ids, () => 9999).ok).toBe(true)
  })

  it('defaults unknown roles to user', () => {
    const json = sample('Greetings', 'reflective', '{"role":"wizard","content":"Hi","createdAt":1}')
    const result = parseChatImport(json, ids, () => 9999)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.messages[0].role).toBe('user')
  })

  it('falls back to the first message when the title is blank', () => {
    const result = parseChatImport(sample('', 'reflective'), ids, () => 9999)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.thread.title).toBe('Hello')
  })

  it('rejects the wrong format', () => {
    const json = sample().replace('"cobaltium.chat"', '"some.other.format"')
    const result = parseChatImport(json, ids, () => 9999)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('WRONG_FORMAT')
  })

  it('rejects unsupported versions', () => {
    const json = sample().replace('"version": 1', '"version": 99')
    const result = parseChatImport(json, ids, () => 9999)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('UNSUPPORTED_VERSION')
  })

  it('tolerates a UTF-8 BOM', () => {
    expect(parseChatImport(`${String.fromCharCode(0xfeff)}${sample()}`, ids, () => 9999).ok).toBe(true)
  })

  it('rejects non-JSON and empty input', () => {
    const empty = parseChatImport('   ', ids, () => 9999)
    expect(empty.ok).toBe(false)
    if (empty.ok) return
    expect(empty.reason).toBe('EMPTY')
    const bad = parseChatImport('not json at all', ids, () => 9999)
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.reason).toBe('NOT_JSON')
  })

  it('rejects when no messages survive', () => {
    const json = sample('Greetings', 'reflective', '{"role":"user","content":"   ","createdAt":1}')
    const result = parseChatImport(json, ids, () => 9999)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('NO_MESSAGES')
  })
})
