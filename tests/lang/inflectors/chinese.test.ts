import { describe, expect, it } from 'vitest'
import { ChineseInflector } from '@shared/lang/inflectors/chinese'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'

function table(paradigm: InflectionParadigm, title: string): ParadigmTable {
  const found = paradigm.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table ${title}`)
  return found
}

describe('ChineseInflector', () => {
  it('returns aspect markers for verbs', async () => {
    const paradigm = await ChineseInflector.inflect('吃', 'zh', 'verb')
    expect(paradigm?.kind).toBeNull()
    expect((paradigm?.note ?? '').length).toBeGreaterThan(0)

    const aspect = table(paradigm as InflectionParadigm, '体标记')
    expect(aspect.columns).toEqual(['标记', '用法'])
    expect(aspect.rows).toHaveLength(4)
    expect(aspect.rows.find((r) => r.label === '了')?.cells).toEqual(['动作完成', '吃了、看了'])
    expect(aspect.rows.find((r) => r.label === '过')?.cells).toEqual(['曾经经历', '去过、看过'])
    expect(aspect.rows.find((r) => r.label === '在')?.cells).toEqual(['正在进行', '在看、在吃'])
    expect(aspect.rows.find((r) => r.label === '着')?.cells).toEqual(['持续状态', '看着、开着'])
  })

  it('gives nouns no declension', async () => {
    const paradigm = await ChineseInflector.inflect('朋友', 'zh', 'noun')
    expect(paradigm?.kind).toBeNull()
    expect(paradigm?.lemma).toBe('朋友')
    expect(paradigm?.tables).toHaveLength(0)
    expect(paradigm?.note).toContain('们')
  })

  it('gives adjectives no agreement', async () => {
    const paradigm = await ChineseInflector.inflect('好', 'zh', 'adjective')
    expect(paradigm?.kind).toBeNull()
    expect(paradigm?.lemma).toBe('好')
    expect(paradigm?.tables).toHaveLength(0)
  })

  it('returns a paradigm for a blank part of speech', async () => {
    const nullPos = await ChineseInflector.inflect('学', 'zh', null)
    expect(nullPos?.kind).toBeNull()
    expect((nullPos?.note ?? '').length).toBeGreaterThan(0)
    const emptyPos = await ChineseInflector.inflect('学', 'zh', '')
    expect(emptyPos?.kind).toBeNull()
  })

  it('rejects mismatched language or blank lemma', async () => {
    expect(await ChineseInflector.inflect('吃', 'de', 'verb')).toBeNull()
    expect(await ChineseInflector.inflect('吃', '', 'verb')).toBeNull()
    expect(await ChineseInflector.inflect('', 'zh', 'verb')).toBeNull()
    expect(await ChineseInflector.inflect('   ', 'zh', 'noun')).toBeNull()
    expect(ChineseInflector.engine).toBe('zh-bundled')
  })
})
