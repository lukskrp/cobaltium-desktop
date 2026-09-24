import { describe, expect, it, vi } from 'vitest'
import { budgets, planContext } from '@shared/domain/context-window'
import type { Message } from '@shared/domain/models'

function message(id: string, content: string, role: Message['role'] = 'user'): Message {
  return { id, threadId: 't1', role, content, createdAt: 0 }
}

describe('ContextWindowPlanner', () => {
  it('splits the usable window 50/50', () => {
    const [notes, fresh] = budgets(4096, 2048, 100)
    expect(notes).toBe(910)
    expect(fresh).toBe(910)
  })

  it('keeps everything when the history fits', async () => {
    const result = await planContext({
      notes: '',
      boundaryId: '',
      messages: [message('m1', 'hi'), message('m2', 'there')],
      freshBudget: 100,
      notesBudget: 100,
      countTokens: (text) => text.length,
      summarize: () => {
        throw new Error('should not summarize')
      }
    })
    expect(result.messages).toHaveLength(2)
    expect(result.notes).toBe('')
    expect(result.boundaryId).toBe('')
  })

  it('folds the oldest messages into notes when the window overflows', async () => {
    const summarize = vi.fn<(existing: string, fold: string) => string>(
      () => '- remembered fact'
    )
    const result = await planContext({
      notes: '',
      boundaryId: '',
      messages: [
        message('m1', 'aaaaaaaaaa'),
        message('m2', 'bbbbbbbbbb'),
        message('m3', 'cccccccccc')
      ],
      freshBudget: 25,
      notesBudget: 100,
      countTokens: (text) => text.length,
      summarize
    })
    expect(summarize).toHaveBeenCalledTimes(1)
    expect(result.notes).toBe('- remembered fact')
    expect(result.boundaryId).toBe('m1')
    expect(result.messages.map((m) => m.content)).toEqual(['bbbbbbbbbb', 'cccccccccc'])
  })

  it('resets notes when the boundary message no longer exists', async () => {
    const result = await planContext({
      notes: 'stale notes',
      boundaryId: 'gone',
      messages: [message('m1', 'hi')],
      freshBudget: 100,
      notesBudget: 100,
      countTokens: (text) => text.length,
      summarize: () => 'unused'
    })
    expect(result.notes).toBe('')
    expect(result.boundaryId).toBe('')
  })
})
