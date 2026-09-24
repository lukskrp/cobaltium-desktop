import { Languages } from '@shared/domain/languages'
import type { SavedWord } from '@shared/domain/models'

/** Builds the "here are my saved words" context message appended to a chat. */
export function buildWordContext(words: SavedWord[]): string {
  const lines = words.map((word) => {
    const name = Languages.name(word.lang)
    return word.translation
      ? `- ${word.word} (${name}) = ${word.translation}`
      : `- ${word.word} (${name})`
  })
  return (
    "Here are some words I've saved. Use them as context for our conversation:\n" +
    lines.join('\n') +
    '\nSaved word pairs for context.'
  )
}
