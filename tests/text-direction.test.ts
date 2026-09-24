import { describe, it, expect } from 'vitest'
import { contentDir } from '../src/shared/domain/text-direction'

describe('contentDir', () => {
  it('returns rtl for Arabic-script languages', () => {
    expect(contentDir('ar')).toBe('rtl')
    expect(contentDir('fa')).toBe('rtl')
    expect(contentDir('ur')).toBe('rtl')
  })

  it('returns rtl for Hebrew', () => {
    expect(contentDir('he')).toBe('rtl')
  })

  it('returns ltr for Latin, Cyrillic, CJK, and Indic scripts', () => {
    expect(contentDir('en')).toBe('ltr')
    expect(contentDir('fi')).toBe('ltr')
    expect(contentDir('ru')).toBe('ltr')
    expect(contentDir('zh')).toBe('ltr')
    expect(contentDir('ja')).toBe('ltr')
    expect(contentDir('ko')).toBe('ltr')
    expect(contentDir('hi')).toBe('ltr')
  })

  it('is case-insensitive and falls back to ltr for unknown codes', () => {
    expect(contentDir('AR')).toBe('rtl')
    expect(contentDir('xx')).toBe('ltr')
    expect(contentDir('')).toBe('ltr')
  })
})
