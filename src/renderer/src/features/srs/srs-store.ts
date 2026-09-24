import { create } from 'zustand'
import type { SavedPhrase, SavedWord } from '@shared/domain/models'
import { LanguagePairTag } from '@shared/domain/language-pair-tag'
import {
  GREEN_AFTER_DAYS,
  SrsCardIds,
  SrsDeckLogic,
  type SrsCardBucket,
  type SrsDeck,
  type SrsGrade,
  type SrsItemState
} from '@shared/domain/srs'
import { getApi } from '@renderer/lib/ipc'

export interface SrsCardModel {
  id: string
  front: string
  back: string
  lang: string
  learnLang: string
  state: SrsItemState | null
}

export interface SrsDeckSummary {
  id: string
  name: string
  total: number
  blue: number
  yellow: number
  red: number
  green: number
}

export interface DeckMemberModel {
  id: string
  front: string
  back: string
  langLabel: string
  bucket: SrsCardBucket
}

export interface SavedItemModel {
  cardId: string
  kind: 'word' | 'phrase'
  front: string
  back: string
  langLabel: string
  createdAt: number
}

interface SrsState {
  loaded: boolean
  words: SavedWord[]
  phrases: SavedPhrase[]
  decks: SrsDeck[]
  membership: Record<string, string[]>
  states: Record<string, Record<string, SrsItemState>>
  selectedDeckId: string | null
  selection: string[]
  grading: boolean
  clock: number

  load(): Promise<void>
  reload(): Promise<void>
  refreshDue(): void
  selectDeck(id: string | null): void
  createDeck(name: string): Promise<boolean>
  createDeckAndAddSelection(name: string): Promise<boolean>
  renameDeck(id: string, name: string): Promise<boolean>
  deleteDeck(id: string): Promise<void>
  addSelectionToDeck(deckId: string): Promise<void>
  addCardsToDeck(deckId: string, cardIds: string[]): Promise<void>
  toggleSelected(cardId: string): void
  clearSelection(): void
  gradeCurrent(grade: SrsGrade): Promise<void>
  removeCardFromDeck(cardId: string): Promise<void>
}

function cardExists(words: SavedWord[], phrases: SavedPhrase[]): Set<string> {
  const set = new Set<string>()
  for (const word of words) set.add(SrsCardIds.word(word.id))
  for (const phrase of phrases) set.add(SrsCardIds.phrase(phrase.id))
  return set
}

export function savedItems(words: SavedWord[], phrases: SavedPhrase[]): SavedItemModel[] {
  const items: SavedItemModel[] = []
  for (const word of words) {
    items.push({
      cardId: SrsCardIds.word(word.id),
      kind: 'word',
      front: word.word,
      back: word.translation,
      langLabel: word.translation
        ? LanguagePairTag.encode(word.lang, word.otherLang)
        : word.lang.toUpperCase(),
      createdAt: word.savedAt
    })
  }
  for (const phrase of phrases) {
    items.push({
      cardId: SrsCardIds.phrase(phrase.id),
      kind: 'phrase',
      front: phrase.phrase,
      back: phrase.translation,
      langLabel: phrase.lang.toUpperCase(),
      createdAt: phrase.createdAt
    })
  }
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

function cardModel(
  id: string,
  wordById: Map<string, SavedWord>,
  phraseById: Map<string, SavedPhrase>,
  state: SrsItemState | null
): SrsCardModel {
  if (id.startsWith('word:')) {
    const word = wordById.get(id.slice('word:'.length))
    if (!word) return { id, front: '', back: '', lang: '', learnLang: '', state }
    const tag = word.translation
      ? LanguagePairTag.encode(word.lang, word.otherLang)
      : word.lang
    return { id, front: word.word, back: word.translation, lang: word.lang, learnLang: tag, state }
  }
  const phrase = phraseById.get(id.slice('phrase:'.length))
  if (!phrase) return { id, front: '', back: '', lang: '', learnLang: '', state }
  const pair = LanguagePairTag.decode(phrase.lang)
  return pair
    ? { id, front: phrase.phrase, back: phrase.translation, lang: pair[0], learnLang: pair[1], state }
    : { id, front: phrase.phrase, back: phrase.translation, lang: phrase.lang, learnLang: phrase.lang, state }
}

export function deckSummaries(
  decks: SrsDeck[],
  membership: Record<string, string[]>,
  words: SavedWord[],
  phrases: SavedPhrase[],
  states: Record<string, Record<string, SrsItemState>>
): SrsDeckSummary[] {
  const exists = cardExists(words, phrases)
  return decks.map((deck) => {
    const members = (membership[deck.id] ?? []).filter((id) => exists.has(id))
    let blue = 0
    let yellow = 0
    let red = 0
    let green = 0
    for (const id of members) {
      switch (SrsDeckLogic.cardBucket(states[deck.id]?.[id], GREEN_AFTER_DAYS)) {
        case 'new':
          blue++
          break
        case 'learning':
          yellow++
          break
        case 'again':
          red++
          break
        case 'strong':
          green++
          break
      }
    }
    return { id: deck.id, name: deck.name, total: members.length, blue, yellow, red, green }
  })
}

export function dueCards(
  deckId: string | null,
  membership: Record<string, string[]>,
  words: SavedWord[],
  phrases: SavedPhrase[],
  states: Record<string, Record<string, SrsItemState>>,
  now: number
): SrsCardModel[] {
  if (!deckId) return []
  const exists = cardExists(words, phrases)
  const wordById = new Map(words.map((word) => [word.id, word]))
  const phraseById = new Map(phrases.map((phrase) => [phrase.id, phrase]))
  const cards: SrsCardModel[] = []
  for (const id of (membership[deckId] ?? []).filter((card) => exists.has(card))) {
    const state = states[deckId]?.[id] ?? null
    if (state === null || state.dueEpochMs <= now) {
      cards.push(cardModel(id, wordById, phraseById, state))
    }
  }
  return cards.sort((a, b) => (a.state?.dueEpochMs ?? 0) - (b.state?.dueEpochMs ?? 0))
}

export function deckMembers(
  deckId: string | null,
  membership: Record<string, string[]>,
  words: SavedWord[],
  phrases: SavedPhrase[],
  states: Record<string, Record<string, SrsItemState>>
): DeckMemberModel[] {
  if (!deckId) return []
  const exists = cardExists(words, phrases)
  const wordById = new Map(words.map((word) => [word.id, word]))
  const phraseById = new Map(phrases.map((phrase) => [phrase.id, phrase]))
  return (membership[deckId] ?? [])
    .filter((id) => exists.has(id))
    .map((id) => {
      const card = cardModel(id, wordById, phraseById, states[deckId]?.[id] ?? null)
      return {
        id,
        front: card.front,
        back: card.back,
        langLabel: card.learnLang.toUpperCase(),
        bucket: SrsDeckLogic.cardBucket(card.state, GREEN_AFTER_DAYS)
      }
    })
}

export const useSrsStore = create<SrsState>((set, get) => ({
  loaded: false,
  words: [],
  phrases: [],
  decks: [],
  membership: {},
  states: {},
  selectedDeckId: null,
  selection: [],
  grading: false,
  clock: Date.now(),

  async load() {
    const api = getApi()
    if (!api) {
      set({ loaded: true })
      return
    }
    const [words, phrases, decks, membership, states] = await Promise.all([
      api.lexicon.words(),
      api.lexicon.phrases(),
      api.srs.decks(),
      api.srs.membership(),
      api.srs.state()
    ])
    set({ words, phrases, decks, membership, states, loaded: true, clock: Date.now() })
  },

  async reload() {
    const api = getApi()
    if (!api) return
    const [words, phrases, decks, membership, states] = await Promise.all([
      api.lexicon.words(),
      api.lexicon.phrases(),
      api.srs.decks(),
      api.srs.membership(),
      api.srs.state()
    ])
    set({ words, phrases, decks, membership, states, clock: Date.now() })
  },

  refreshDue() {
    set({ clock: Date.now() })
  },

  selectDeck(id) {
    set({ selectedDeckId: id })
  },

  async createDeck(name) {
    const api = getApi()
    const deck = await api?.srs.createDeck(name)
    if (!deck) return false
    await get().reload()
    return true
  },

  async createDeckAndAddSelection(name) {
    const cards = get().selection
    if (cards.length === 0) return false
    const api = getApi()
    const deck = await api?.srs.createDeck(name)
    if (!deck) return false
    await api?.srs.addCards(deck.id, cards)
    set({ selection: [] })
    await get().reload()
    return true
  },

  async renameDeck(id, name) {
    const ok = (await getApi()?.srs.renameDeck(id, name)) ?? false
    await get().reload()
    return ok
  },

  async deleteDeck(id) {
    await getApi()?.srs.deleteDeck(id)
    if (get().selectedDeckId === id) set({ selectedDeckId: null })
    await get().reload()
  },

  async addSelectionToDeck(deckId) {
    const cards = get().selection
    if (cards.length === 0) return
    await getApi()?.srs.addCards(deckId, cards)
    set({ selection: [] })
    await get().reload()
  },

  async addCardsToDeck(deckId, cardIds) {
    if (cardIds.length === 0) return
    await getApi()?.srs.addCards(deckId, cardIds)
    await get().reload()
  },

  toggleSelected(cardId) {
    set((state) => ({
      selection: state.selection.includes(cardId)
        ? state.selection.filter((id) => id !== cardId)
        : [...state.selection, cardId]
    }))
  },

  clearSelection() {
    set({ selection: [] })
  },

  async gradeCurrent(grade) {
    if (get().grading) return
    const deckId = get().selectedDeckId
    if (!deckId) return
    const card = dueCards(
      deckId,
      get().membership,
      get().words,
      get().phrases,
      get().states,
      Date.now()
    )[0]
    if (!card) return
    set({ grading: true })
    try {
      await getApi()?.srs.grade(deckId, card.id, grade)
      await get().reload()
    } finally {
      set({ grading: false })
    }
  },

  async removeCardFromDeck(cardId) {
    const deckId = get().selectedDeckId
    if (!deckId) return
    await getApi()?.srs.removeCardFromDeck(deckId, cardId)
    await get().reload()
  }
}))
