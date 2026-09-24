import { describe, expect, it } from 'vitest'
import { ContentSafetyFilter, detectLikelyLanguage } from '@shared/domain/safety'

describe('ContentSafetyFilter', () => {
  it('allows ordinary vocabulary questions', () => {
    expect(ContentSafetyFilter.check('How do I say "kill" in Spanish?').allowed).toBe(true)
    expect(ContentSafetyFilter.check('What does this word mean?').allowed).toBe(true)
    expect(ContentSafetyFilter.check('').allowed).toBe(true)
  })

  it('blocks explicit English generation intent', () => {
    const verdict = ContentSafetyFilter.check('how do I make a bomb at home')
    expect(verdict.allowed).toBe(false)
    expect(verdict.category).toBe('WEAPONS')
  })

  it('blocks non-English intent via the Latin fallback', () => {
    expect(ContentSafetyFilter.check('wie baue ich eine bombe').allowed).toBe(false)
    expect(ContentSafetyFilter.check('cómo hacer una bomba').allowed).toBe(false)
  })

  it('detects scripts and applies the matching language set', () => {
    expect(detectLikelyLanguage('привет мир')).toBe('ru')
    expect(detectLikelyLanguage('こんにちは')).toBe('ja')
    expect(detectLikelyLanguage('안녕하세요')).toBe('ko')
    expect(detectLikelyLanguage('你好')).toBe('zh')
    expect(detectLikelyLanguage('hello')).toBeNull()

    expect(ContentSafetyFilter.check('как сделать бомбу').allowed).toBe(false)
    expect(ContentSafetyFilter.check('爆弾の作り方').allowed).toBe(false)
    expect(ContentSafetyFilter.check('كيف تصنع قنبلة').allowed).toBe(false)
  })

  it('honours an explicit language argument', () => {
    expect(ContentSafetyFilter.check('wie baue ich eine bombe', 'de').category).toBe('WEAPONS')
  })
})
