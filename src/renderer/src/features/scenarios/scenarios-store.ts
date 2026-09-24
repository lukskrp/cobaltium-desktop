import { create } from 'zustand'
import type { Scenario, ScenarioPhrase, ScenarioTab, ScenarioWord } from '@shared/domain/scenarios'
import { getApi } from '@renderer/lib/ipc'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'

interface ScenariosStore {
  scenarios: Scenario[]
  pair: string
  categoryFilter: string | null
  selected: Scenario | null
  tab: ScenarioTab
  saveMessage: string | null
  loaded: boolean

  load(pair: string): Promise<void>
  setCategoryFilter(category: string | null): void
  select(scenario: Scenario): void
  clearSelection(): void
  setTab(tab: ScenarioTab): void
  saveWord(word: ScenarioWord, lang: string, otherLang: string): Promise<void>
  savePhrase(phrase: ScenarioPhrase, lang: string, otherLang: string): Promise<void>
  dismissSaveMessage(): void
}

export const useScenariosStore = create<ScenariosStore>((set) => ({
  scenarios: [],
  pair: 'fi-en',
  categoryFilter: null,
  selected: null,
  tab: 'vocabulary',
  saveMessage: null,
  loaded: false,

  async load(pair) {
    const scenarios = (await getApi()?.scenarios.list(pair)) ?? []
    set({ scenarios, pair, loaded: true })
  },

  setCategoryFilter(category) {
    set({ categoryFilter: category })
  },

  select(scenario) {
    set({ selected: scenario, tab: 'vocabulary' })
  },

  clearSelection() {
    set({ selected: null })
  },

  setTab(tab) {
    set({ tab })
  },

  async saveWord(word, lang, otherLang) {
    await useLexiconStore
      .getState()
      .addWord({ word: word.word, lang, otherLang, translation: word.translation })
    set({ saveMessage: 'scenarios.savedWord' })
  },

  async savePhrase(phrase, lang, _otherLang) {
    await useLexiconStore
      .getState()
      .addPhrase({ phrase: phrase.phrase, lang, translation: phrase.translation })
    set({ saveMessage: 'scenarios.savedPhrase' })
  },

  dismissSaveMessage() {
    set({ saveMessage: null })
  }
}))
