import { describe, it, expect } from 'vitest'
import { espeakVoiceFor } from '../../src/shared/lang/ipa'

describe('espeakVoiceFor', () => {
  it('maps Mandarin to cmn', () => {
    expect(espeakVoiceFor('zh')).toBe('cmn')
    expect(espeakVoiceFor('zh-CN')).toBe('cmn')
  })

  it('keeps regional variants that have dedicated voices', () => {
    expect(espeakVoiceFor('pt-BR')).toBe('pt-BR')
    expect(espeakVoiceFor('es-419')).toBe('es-419')
    expect(espeakVoiceFor('fr-BE')).toBe('fr-BE')
    expect(espeakVoiceFor('fr-CH')).toBe('fr-CH')
    expect(espeakVoiceFor('en-US')).toBe('en-US')
  })

  it('falls back to the 2-letter code', () => {
    expect(espeakVoiceFor('fi')).toBe('fi')
    expect(espeakVoiceFor('en')).toBe('en')
    expect(espeakVoiceFor('de-DE')).toBe('de')
    expect(espeakVoiceFor('FA')).toBe('fa')
  })
})
