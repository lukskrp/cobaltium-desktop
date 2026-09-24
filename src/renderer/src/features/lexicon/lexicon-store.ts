import { create } from 'zustand'
import type { SavedFolder, SavedPhrase, SavedWord, SavedWordAnalysis } from '@shared/domain/models'
import { getApi } from '@renderer/lib/ipc'
import { playSaveSound } from '@renderer/lib/sound'

interface LexiconState {
  words: SavedWord[]
  folders: SavedFolder[]
  phrases: SavedPhrase[]
  loaded: boolean
  /** Bumps on every words/phrases mutation so dependent views (SRS) refresh. */
  rev: number
  load(): Promise<void>
  addWord(
    input: {
      word: string
      lang: string
      otherLang: string
      translation: string
      folderId?: string | null
    },
    options?: { quiet?: boolean; deferRefresh?: boolean }
  ): Promise<SavedWord | null>
  deleteWord(id: string): Promise<void>
  saveAnalysis(id: string, analysis: SavedWordAnalysis): Promise<void>
  createFolder(name: string, parentId: string | null): Promise<void>
  renameFolder(id: string, name: string): Promise<void>
  deleteFolder(id: string): Promise<void>
  moveWords(ids: string[], folderId: string | null): Promise<void>
  movePhrases(ids: string[], folderId: string | null): Promise<void>
  addPhrase(
    input: {
      phrase: string
      lang: string
      translation: string
      folderId?: string | null
    },
    options?: { quiet?: boolean; deferRefresh?: boolean }
  ): Promise<void>
  /**
   * Save a word in both directions (word → translation and
   * translation → word) so SRS decks can quiz either way. The reverse
   * entry is skipped when the translation is blank or identical.
   * Dedup (by word+lang) keeps re-saves safe.
   */
  addWordPair(
    input: {
      word: string
      lang: string
      otherLang: string
      translation: string
      folderId?: string | null
    },
    options?: { quiet?: boolean }
  ): Promise<SavedWord | null>
  deletePhrase(id: string): Promise<void>
  /**
   * Save a phrase in both directions (phrase → translation and
   * translation → phrase) so SRS decks can quiz either way. The reverse
   * entry is skipped when the translation is blank/identical or its
   * language is unknown. Exactly one sound plays unless quiet.
   */
  addPhrasePair(
    input: {
      phrase: string
      lang: string
      translation: string
      translationLang?: string
      folderId?: string | null
    },
    options?: { quiet?: boolean }
  ): Promise<void>
}

export const useLexiconStore = create<LexiconState>((set, get) => ({
  words: [],
  folders: [],
  phrases: [],
  loaded: false,
  rev: 0,

  async load() {
    const api = getApi()
    if (!api) {
      set({ loaded: true })
      return
    }
    const [words, folders, phrases] = await Promise.all([
      api.lexicon.words(),
      api.lexicon.folders(),
      api.lexicon.phrases()
    ])
    set({ words, folders, phrases, loaded: true })
  },

  async addWord(input, options) {
    const api = getApi()
    const word = input.word.trim()
    if (!api || word === '') return null
    const now = Date.now()
    const entry: SavedWord = {
      id: crypto.randomUUID(),
      word,
      lang: input.lang,
      otherLang: input.otherLang,
      translation: input.translation.trim(),
      hoverType: 'manual',
      definitions: [],
      analysis: null,
      savedAt: now,
      folderId: input.folderId ?? null
    }
    await api.lexicon.saveWord(entry)
    if (!options?.deferRefresh) {
      await get().load()
      set((state) => ({ rev: state.rev + 1 }))
    }
    if (!options?.quiet) playSaveSound()
    return entry
  },

  async deleteWord(id) {
    await getApi()?.lexicon.deleteWord(id)
    set((state) => ({ words: state.words.filter((word) => word.id !== id), rev: state.rev + 1 }))
  },

  async saveAnalysis(id, analysis) {
    await getApi()?.lexicon.updateAnalysis(id, analysis)
    set((state) => ({
      words: state.words.map((word) => (word.id === id ? { ...word, analysis } : word))
    }))
  },

  async createFolder(name, parentId) {
    const trimmed = name.trim()
    if (trimmed === '') return
    await getApi()?.lexicon.saveFolder({
      id: crypto.randomUUID(),
      name: trimmed,
      parentId,
      lang: null,
      createdAt: Date.now()
    })
    await get().load()
  },

  async deleteFolder(id) {
    await getApi()?.lexicon.deleteFolder(id)
    await get().load()
  },

  async renameFolder(id, name) {
    const trimmed = name.trim()
    if (trimmed === '') return
    const folder = get().folders.find((entry) => entry.id === id)
    if (!folder || folder.name === trimmed) return
    await getApi()?.lexicon.saveFolder({ ...folder, name: trimmed })
    await get().load()
  },

  async moveWords(ids, folderId) {
    await getApi()?.lexicon.moveWord(ids, folderId)
    await get().load()
  },

  async movePhrases(ids, folderId) {
    await getApi()?.lexicon.movePhrase(ids, folderId)
    await get().load()
  },

  async addPhrase(input, options) {
    const phrase = input.phrase.trim()
    if (phrase === '') return
    await getApi()?.lexicon.savePhrase({
      id: crypto.randomUUID(),
      phrase,
      lang: input.lang,
      translation: input.translation.trim(),
      createdAt: Date.now(),
      folderId: input.folderId ?? null
    })
    if (!options?.deferRefresh) {
      await get().load()
      set((state) => ({ rev: state.rev + 1 }))
    }
    if (!options?.quiet) playSaveSound()
  },

  async deletePhrase(id) {
    await getApi()?.lexicon.deletePhrase(id)
    set((state) => ({ phrases: state.phrases.filter((phrase) => phrase.id !== id), rev: state.rev + 1 }))
  },

  async addPhrasePair(input, options) {
    const phrase = input.phrase.trim()
    if (phrase === '') return
    // Batch: inner saves defer their refresh; one load() + one rev bump covers
    // both directions (previously 2x full reload + 2x SRS reload per save).
    const inner = { ...options, quiet: true, deferRefresh: true }
    await get().addPhrase(
      { phrase, lang: input.lang, translation: input.translation, folderId: input.folderId ?? null },
      inner
    )
    const target = input.translation.trim()
    const targetLang = input.translationLang?.trim() ?? ''
    if (target !== '' && targetLang !== '' && target.toLowerCase() !== phrase.toLowerCase()) {
      await get().addPhrase(
        { phrase: target, lang: targetLang, translation: phrase, folderId: input.folderId ?? null },
        inner
      )
    }
    await get().load()
    set((state) => ({ rev: state.rev + 1 }))
    if (!options?.quiet) playSaveSound()
  },

  async addWordPair(input, options) {
    const inner = { ...options, quiet: true, deferRefresh: true }
    const first = await get().addWord(input, inner)
    const gloss = input.translation.trim()
    let second: SavedWord | null = null
    if (gloss !== '' && gloss.toLowerCase() !== input.word.trim().toLowerCase()) {
      second = await get().addWord(
        { word: input.translation.trim(), lang: input.otherLang, otherLang: input.lang, translation: input.word.trim() },
        inner
      )
    }
    if (first !== null || second !== null) {
      await get().load()
      set((state) => ({ rev: state.rev + 1 }))
    }
    if (!options?.quiet) playSaveSound()
    return first
  }
}))
