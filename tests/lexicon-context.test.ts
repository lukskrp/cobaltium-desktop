import { describe, expect, it } from 'vitest'
import type { SavedWord } from '@shared/domain/models'
import { buildWordContext } from '@renderer/features/lexicon/context'

function word(partial: Partial<SavedWord>): SavedWord {
  return {
    id: 'id',
    word: 'casa',
    lang: 'es',
    otherLang: 'en',
    translation: '',
    hoverType: 'manual',
    definitions: [],
    savedAt: 0,
    ...partial
  }
}

describe('buildWordContext', () => {
  it('lists saved words with translations and keeps the context footer', () => {
    const text = buildWordContext([word({ word: 'casa', translation: 'house' })])
    expect(text).toContain('- casa (Spanish) = house')
    expect(text).toContain('Saved word pairs for context.')
  })

  it('omits the translation when a saved word has none', () => {
    const text = buildWordContext([word({ word: 'gato' })])
    expect(text).toContain('- gato (Spanish)')
    expect(text).not.toContain('= ')
  })
})
