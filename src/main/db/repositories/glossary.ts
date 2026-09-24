import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { SavedWordAnalysis } from '@shared/domain/models'
import { getDb } from '../index'
import { glossaryCache } from '../schema'

/** Case/whitespace-insensitive cache key (matches Android's lowercased keys). */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function parseAnalysis(value: string | null): SavedWordAnalysis | null {
  if (!value) return null
  try {
    return JSON.parse(value) as SavedWordAnalysis
  } catch {
    return null
  }
}

export function getGlossary(word: string, lang: string): SavedWordAnalysis | null {
  const row = getDb()
    .select()
    .from(glossaryCache)
    .where(
      and(eq(glossaryCache.word, normalizeKey(word)), eq(glossaryCache.lang, normalizeKey(lang)))
    )
    .get()
  return row ? parseAnalysis(row.analysisJson) : null
}

export function putGlossary(word: string, lang: string, analysis: SavedWordAnalysis): void {
  const db = getDb()
  const key = normalizeKey(word)
  const language = normalizeKey(lang)
  db.delete(glossaryCache)
    .where(and(eq(glossaryCache.word, key), eq(glossaryCache.lang, language)))
    .run()
  db.insert(glossaryCache)
    .values({
      id: randomUUID(),
      word: key,
      lang: language,
      analysisJson: JSON.stringify(analysis),
      createdAt: Date.now()
    })
    .run()
}

export function clearGlossary(): void {
  getDb().delete(glossaryCache).run()
}
