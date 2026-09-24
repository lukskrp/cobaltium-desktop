import { and, desc, eq, inArray } from 'drizzle-orm'
import type {
  SavedFolder,
  SavedPhrase,
  SavedWord,
  SavedWordAnalysis
} from '@shared/domain/models'
import { SrsCardIds } from '@shared/domain/srs'
import { getDb } from '../index'
import { savedFolders, savedPhrases, savedWords } from '../schema'
import { removeCardEverywhere } from './srs'

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

type SavedWordRow = typeof savedWords.$inferSelect
type SavedFolderRow = typeof savedFolders.$inferSelect
type SavedPhraseRow = typeof savedPhrases.$inferSelect

function wordRowToDomain(row: SavedWordRow): SavedWord {
  return {
    id: row.id,
    word: row.word,
    lang: row.lang,
    otherLang: row.otherLang,
    translation: row.translation,
    hoverType: row.hoverType,
    pos: row.pos,
    definitions: parseJson<string[]>(row.definitionsJson) ?? [],
    analysis: parseJson<SavedWordAnalysis>(row.analysisJson),
    savedAt: row.savedAt,
    folderId: row.folderId
  }
}

function wordToRow(word: SavedWord): typeof savedWords.$inferInsert {
  return {
    id: word.id,
    word: word.word,
    lang: word.lang,
    otherLang: word.otherLang,
    translation: word.translation,
    hoverType: word.hoverType,
    pos: word.pos ?? null,
    definitionsJson: word.definitions.length > 0 ? JSON.stringify(word.definitions) : null,
    analysisJson: word.analysis ? JSON.stringify(word.analysis) : null,
    savedAt: word.savedAt,
    folderId: word.folderId ?? null
  }
}

function folderRowToDomain(row: SavedFolderRow): SavedFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    lang: row.lang,
    createdAt: row.createdAt
  }
}

function phraseRowToDomain(row: SavedPhraseRow): SavedPhrase {
  return {
    id: row.id,
    phrase: row.phrase,
    lang: row.lang,
    translation: row.translation,
    createdAt: row.createdAt,
    folderId: row.folderId
  }
}

export function listWords(): SavedWord[] {
  return getDb().select().from(savedWords).orderBy(desc(savedWords.savedAt)).all().map(wordRowToDomain)
}

export function saveWord(word: SavedWord): void {
  const row = wordToRow(word)
  const existing = getDb()
    .select()
    .from(savedWords)
    .where(and(eq(savedWords.word, row.word), eq(savedWords.lang, row.lang)))
    .get()
  if (!existing) {
    getDb().insert(savedWords).values(row).run()
    return
  }
  // Dedup by (word, lang) — port of Android `SavedWordsRepository.save`:
  // keep the first-saved id (stable for SRS card ids) but absorb any newer
  // metadata the caller supplied. Never throws on re-save.
  getDb()
    .update(savedWords)
    .set({
      otherLang: row.otherLang !== '' ? row.otherLang : existing.otherLang,
      translation: row.translation !== '' ? row.translation : existing.translation,
      hoverType: row.hoverType !== '' ? row.hoverType : existing.hoverType,
      pos: row.pos ?? existing.pos,
      definitionsJson: row.definitionsJson ?? existing.definitionsJson,
      analysisJson: row.analysisJson ?? existing.analysisJson,
      folderId: existing.folderId ?? row.folderId
    })
    .where(eq(savedWords.id, existing.id))
    .run()
}

export function deleteWord(id: string): void {
  getDb().delete(savedWords).where(eq(savedWords.id, id)).run()
  removeCardEverywhere(SrsCardIds.word(id))
}

export function updateWordAnalysis(id: string, analysis: SavedWordAnalysis | null): void {
  getDb()
    .update(savedWords)
    .set({ analysisJson: analysis ? JSON.stringify(analysis) : null })
    .where(eq(savedWords.id, id))
    .run()
}

export function moveWords(ids: string[], folderId: string | null): void {
  if (ids.length === 0) return
  getDb().update(savedWords).set({ folderId }).where(inArray(savedWords.id, ids)).run()
}

export function movePhrases(ids: string[], folderId: string | null): void {
  if (ids.length === 0) return
  getDb().update(savedPhrases).set({ folderId }).where(inArray(savedPhrases.id, ids)).run()
}

export function listFolders(): SavedFolder[] {
  return getDb()
    .select()
    .from(savedFolders)
    .orderBy(savedFolders.createdAt)
    .all()
    .map(folderRowToDomain)
}

export function saveFolder(folder: SavedFolder): void {
  const row: typeof savedFolders.$inferInsert = {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    lang: folder.lang,
    createdAt: folder.createdAt
  }
  getDb()
    .insert(savedFolders)
    .values(row)
    .onConflictDoUpdate({ target: savedFolders.id, set: row })
    .run()
}

export function deleteFolder(id: string): void {
  const db = getDb()
  db.update(savedWords).set({ folderId: null }).where(eq(savedWords.folderId, id)).run()
  db.update(savedPhrases).set({ folderId: null }).where(eq(savedPhrases.folderId, id)).run()
  db.delete(savedFolders).where(eq(savedFolders.id, id)).run()
}

export function listPhrases(): SavedPhrase[] {
  return getDb()
    .select()
    .from(savedPhrases)
    .orderBy(desc(savedPhrases.createdAt))
    .all()
    .map(phraseRowToDomain)
}

export function savePhrase(phrase: SavedPhrase): void {
  const row: typeof savedPhrases.$inferInsert = {
    id: phrase.id,
    phrase: phrase.phrase,
    lang: phrase.lang,
    translation: phrase.translation,
    createdAt: phrase.createdAt,
    folderId: phrase.folderId ?? null
  }
  getDb()
    .insert(savedPhrases)
    .values(row)
    .onConflictDoUpdate({ target: savedPhrases.id, set: row })
    .run()
}

export function deletePhrase(id: string): void {
  getDb().delete(savedPhrases).where(eq(savedPhrases.id, id)).run()
  removeCardEverywhere(SrsCardIds.phrase(id))
}
