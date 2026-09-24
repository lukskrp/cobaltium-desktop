import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import { buildEpub, escXml } from '@shared/epub/builder'
import type { SavedWord } from '@shared/domain/models'
import { listWords } from '../db/repositories/lexicon'

function wordHtml(word: SavedWord): string {
  const parts = [
    `<p><strong>${escXml(word.word)}</strong> (${escXml(word.lang)} → ${escXml(word.otherLang)})</p>`
  ]
  if (word.translation) parts.push(`<p><em>${escXml(word.translation)}</em></p>`)
  if (word.pos) parts.push(`<p><strong>Part of speech:</strong> ${escXml(word.pos)}</p>`)
  if (word.definitions.length > 0) {
    parts.push(`<ul>${word.definitions.map((d) => `<li>${escXml(d)}</li>`).join('')}</ul>`)
  }
  const analysis = word.analysis
  if (analysis) {
    const entries = Object.entries(analysis).filter(
      (entry): entry is [string, string] => entry[1] != null && entry[1] !== ''
    )
    if (entries.length > 0) {
      parts.push(
        `<ul>${entries
          .map(([key, value]) => `<li><strong>${escXml(key)}:</strong> ${escXml(value)}</li>`)
          .join('')}</ul>`
      )
    }
  }
  return parts.join('\n')
}

/** Export every saved word as an EPUB (port of Android's `exportSavedWordsEpub`). */
export async function exportSavedWordsEpub(): Promise<boolean> {
  const words = listWords()
  if (words.length === 0) return false

  const chapters = words.map((word) => ({ title: word.word, content: wordHtml(word) }))
  const bytes = buildEpub('Saved Word Pairs', 'Cobaltium', chapters)

  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(window, {
    title: 'Export EPUB',
    defaultPath: 'saved-word-pairs.epub',
    filters: [{ name: 'EPUB', extensions: ['epub'] }]
  })
  if (result.canceled || !result.filePath) return false
  writeFileSync(result.filePath, bytes)
  return true
}
