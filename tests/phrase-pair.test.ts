import { describe, it, expect } from 'vitest'
import { orientPhrasePair } from '../src/shared/domain/phrase-pair'

describe('orientPhrasePair', () => {
  it('orients reflective faces source(native)→target(learn) with a pair tag', () => {
    // Reflective: user writes helper/native, front face shows learn translation.
    const result = orientPhrasePair({
      front: 'Hei maailma',
      back: 'Hello world',
      frontFaceLang: 'fi',
      learn: 'fi',
      helper: 'en',
      originalLang: 'en'
    })
    expect(result.sourceText).toBe('Hello world')
    expect(result.targetText).toBe('Hei maailma')
    expect(result.tag).toBe('ENFI')
    expect(result.translationLang).toBe('fi')
  })

  it('orients immersive faces source(native)→target(learn)', () => {
    // Immersive: user writes learn, front face shows native translation.
    const result = orientPhrasePair({
      front: 'Hello world',
      back: 'Hei maailma',
      frontFaceLang: 'en',
      learn: 'fi',
      helper: 'en',
      originalLang: 'fi'
    })
    expect(result.sourceText).toBe('Hello world')
    expect(result.targetText).toBe('Hei maailma')
    expect(result.tag).toBe('ENFI')
  })

  it('falls back to the helper setting when the source side is the learn language', () => {
    const result = orientPhrasePair({
      front: 'sama',
      back: 'sama',
      frontFaceLang: 'fi',
      learn: 'fi',
      helper: 'en',
      originalLang: 'fi'
    })
    expect(result.sourceText).toBe('sama')
    expect(result.tag).toBe('ENFI')
  })

  it('handles blank faces without throwing', () => {
    const result = orientPhrasePair({
      front: '',
      back: '  ',
      frontFaceLang: 'en',
      learn: 'fi',
      helper: 'en',
      originalLang: 'en'
    })
    expect(result.sourceText).toBe('')
    expect(result.targetText).toBe('')
  })
})
