import { describe, it, expect } from 'vitest'
import { GlossFilter, isUsefulTranslation, filterGlossMap } from '../../src/shared/domain/translation'

describe('GlossFilter', () => {
  it('keeps only glosses whose native word occurs in the translation', () => {
    const result = GlossFilter('bonjour le monde', [
      { native: 'bonjour', foreign: 'hello' },
      { native: 'monde', foreign: 'world' },
      { native: 'foo', foreign: 'bar' }
    ])
    expect(result).toEqual({ bonjour: 'hello', monde: 'world' })
  })

  it('returns an empty map when no gloss key occurs in the translation', () => {
    const result = GlossFilter('bonjour', [
      { native: 'foo', foreign: 'bar' }
    ])
    expect(result).toEqual({})
  })

  it('deduplicates repeated native keys', () => {
    const result = GlossFilter('bonjour bonjour', [
      { native: 'bonjour', foreign: 'hello' }
    ])
    expect(result).toEqual({ bonjour: 'hello' })
  })

  it('is case-insensitive on the native key', () => {
    const result = GlossFilter('Bonjour', [
      { native: 'bonjour', foreign: 'hello' }
    ])
    expect(result).toEqual({ bonjour: 'hello' })
  })
})

describe('filterGlossMap', () => {
  it('drops map entries whose key is absent from the translation', () => {
    expect(filterGlossMap('hola mundo', { hola: 'hello', mundo: 'world', foo: 'bar' })).toEqual({
      hola: 'hello',
      mundo: 'world'
    })
  })

  it('keeps keys case-insensitively when they occur in the translation', () => {
    expect(filterGlossMap('Hola', { hola: 'hello' })).toEqual({ hola: 'hello' })
  })

  it('drops entries with empty values', () => {
    expect(filterGlossMap('hola', { hola: '' })).toEqual({})
  })
})

describe('isUsefulTranslation', () => {
  it('returns false for null translation', () => {
    expect(isUsefulTranslation('hello', null)).toBe(false)
  })

  it('returns false when the translation equals the source', () => {
    expect(isUsefulTranslation('hello', 'hello')).toBe(false)
  })

  it('returns false for empty translation', () => {
    expect(isUsefulTranslation('hello', '')).toBe(false)
  })

  it('returns true for a real translation', () => {
    expect(isUsefulTranslation('hello', 'hola')).toBe(true)
  })
})
