import { describe, expect, it } from 'vitest'
import { AnalysisLabels, PromptBuilder } from '@shared/domain/prompts'

describe('PromptBuilder', () => {
  it('names the languages in the corrective prompt', () => {
    const prompt = PromptBuilder.buildSystemPrompt('corrective', 'es', 'en')
    expect(prompt).toContain('Spanish')
    expect(prompt).toContain('English')
  })

  it('forces the target language in immersive mode', () => {
    const prompt = PromptBuilder.buildSystemPrompt('immersive', 'fr', 'en')
    expect(prompt).toContain('Always reply ONLY in French')
  })

  it('substitutes word and language into saved-word prompts', () => {
    const prompt = PromptBuilder.preprompt('chat', 'fr', 'etymology')
    expect(prompt).toContain('"chat"')
    expect(prompt).toContain('French')
  })

  it('requests a JSON array for dictionary lookups', () => {
    expect(PromptBuilder.dictionarySystemPrompt()).toContain('JSON array')
  })

  it('pins the inflection table titles when a spec is supplied', () => {
    const prompt = PromptBuilder.inflectionSystemPrompt({
      lang: 'es',
      verbTables: ['Present', 'Preterite'],
      personLabels: ['1sg', '2sg']
    })
    expect(prompt).toContain('For Spanish produce exactly')
    expect(prompt).toContain('Present, Preterite')
  })

  it('labels analysis fields', () => {
    expect(AnalysisLabels.label('pos')).toBe('Part of speech')
    expect(AnalysisLabels.label('unknown')).toBe('unknown')
  })

  it('requests the translation JSON shape for the flip cards', () => {
    const system = PromptBuilder.translationSystemPrompt('Spanish', 'English')
    expect(system).toContain('Translate from Spanish into English')
    expect(system).toContain('"translation"')
    expect(system).toContain('"glosses"')
    expect(PromptBuilder.translationUserPrompt('hola', 'Spanish', 'English')).toContain('hola')
  })
})
