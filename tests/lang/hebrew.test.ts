import { describe, it, expect } from 'vitest'
import { isHebrew, lookupGloss, stripProclitics } from '../../src/shared/lang/hebrew'

describe('stripProclitics', () => {
  it('strips the definite article', () => {
    expect(stripProclitics('הבית')).toBe('בית')
    expect(stripProclitics('הים')).toBe('ים')
  })

  it('strips prepositions', () => {
    expect(stripProclitics('לילדים')).toBe('ילדים')
    expect(stripProclitics('בבית')).toBe('בית')
    expect(stripProclitics('בהר')).toBe('הר')
  })

  it('strips vav-conjunction combos', () => {
    expect(stripProclitics('ובבית')).toBe('בית')
    expect(stripProclitics('ו' + 'הבית')).toBe('בית')
  })

  it('leaves single lexemes untouched', () => {
    expect(stripProclitics('בית')).toBeNull() // house (not ב+ית)
    expect(stripProclitics('מים')).toBeNull() // water (not מ+ים)
    expect(stripProclitics('כל')).toBeNull() // all
    expect(stripProclitics('שלום')).toBeNull() // not prefixed
    expect(stripProclitics('אם')).toBeNull() // too short anyway
  })
})

describe('lookupGloss', () => {
  const gloss = { בית: 'house', שלום: 'hello' }

  it('falls back to the stripped base for Hebrew', () => {
    expect(lookupGloss(gloss, 'הבית', 'he')).toBe('house')
    expect(lookupGloss(gloss, 'בית', 'he')).toBe('house')
    expect(lookupGloss(gloss, 'שלום', 'he')).toBe('hello')
  })

  it('does not apply the Hebrew fallback for other languages', () => {
    expect(lookupGloss(gloss, 'הבית', 'en')).toBeNull()
  })

  it('returns null for excluded bases with no direct key', () => {
    expect(lookupGloss(gloss, 'מים', 'he')).toBeNull() // excluded base, no direct key
  })

  it('detects Hebrew language codes', () => {
    expect(isHebrew('he')).toBe(true)
    expect(isHebrew('HE')).toBe(true)
    expect(isHebrew('en')).toBe(false)
    expect(isHebrew(null)).toBe(false)
  })
})
