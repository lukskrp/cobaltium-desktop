import { describe, expect, it } from 'vitest'
import { TitleGenerator } from '@shared/domain/title-generator'

describe('TitleGenerator', () => {
  it('drops stopwords and keeps the content words', () => {
    expect(TitleGenerator.generate('What is the etymology of hello?')).toBe('etymology hello')
  })

  it('falls back to the first words when everything is a stopword', () => {
    expect(TitleGenerator.generate('What is it?')).toBe('What is it')
  })

  it('caps the title length', () => {
    const long = 'antidisestablishmentarianism extraordinarily internationalization supercalifragilistic'
    const title = TitleGenerator.generate(long)
    expect(title.length).toBeLessThanOrEqual(60)
  })
})
