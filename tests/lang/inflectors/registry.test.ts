import { describe, expect, it, vi } from 'vitest'
import { BUNDLED_INFLECTORS } from '@shared/lang/inflectors'
import {
  TieredInflectionEngine,
  type InflectionEngine,
  type InflectionParadigm
} from '@shared/lang/inflection'

describe('bundled inflector registry', () => {
  it('covers all bundled languages', () => {
    expect([...BUNDLED_INFLECTORS.keys()].sort()).toEqual([
      'ar', 'da', 'de', 'es', 'fa', 'fi', 'fr', 'hi', 'id', 'it', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr', 'zh'
    ])
  })

  it('every engine reports a bundled id', () => {
    for (const engine of BUNDLED_INFLECTORS.values()) {
      expect(engine.engine).toMatch(/-bundled$/)
    }
  })

  it('the tiered engine prefers bundled engines and falls back to the LLM', async () => {
    const llmResult: InflectionParadigm = {
      lemma: 'x',
      lang: 'xx',
      kind: null,
      note: 'llm',
      tables: []
    }
    const llm: InflectionEngine = { engine: 'llm', inflect: vi.fn(async () => llmResult) }
    const tiered = new TieredInflectionEngine(BUNDLED_INFLECTORS, llm)

    const bundled = await tiered.inflect('buku', 'id', 'noun')
    expect(bundled?.kind).toBe('declension')
    expect(llm.inflect).not.toHaveBeenCalled()

    const fallback = await tiered.inflect('hello', 'xx', 'noun')
    expect(fallback?.note).toBe('llm')
    expect(llm.inflect).toHaveBeenCalledTimes(1)
  })
})
