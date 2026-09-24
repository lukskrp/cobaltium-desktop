import { create } from 'zustand'
import { analysisHasData, type SavedWordAnalysis } from '@shared/domain/models'
import { getApi } from '@renderer/lib/ipc'
import { playSaveSound } from '@renderer/lib/sound'
import { speak } from '@renderer/lib/tts'
import { morphologyToAnalysis } from '@renderer/features/lexicon/analysis'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { resolveTargetLang } from './chat-store'

export interface PickedWord {
  index: number
  text: string
}

/** A single-message word selection (mirrors Android's `WordSelection`). */
export interface WordSelection {
  messageId: string
  lang: string
  sourceText: string
  words: PickedWord[]
}

/** A word whose glossary popup is open. */
export interface GlossaryTarget {
  messageId: string
  index: number
  word: string
  lang: string
  x: number
  y: number
}

function cacheKey(word: string, lang: string): string {
  return `${word.trim().toLowerCase()}:${lang.trim().toLowerCase()}`
}

function helperLang(): string {
  return resolveTargetLang(useSettingsStore.getState().settings.targetLang)
}

/**
 * Best-effort translation for a tapped word, but never block the save on a
 * slow LLM round-trip (1500 ms cap, then save with whatever gloss we have).
 */
async function bestEffortGloss(word: string, lang: string): Promise<string> {
  try {
    const attempt = getApi()?.translation.translate(word, lang, helperLang())
    const data = await Promise.race([
      attempt ?? Promise.resolve(null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
    ])
    return data?.sourceText?.trim() ?? ''
  } catch {
    return ''
  }
}

interface ChatToolbarState {
  selectMode: boolean
  glossaryMode: boolean
  granularSave: boolean
  selection: WordSelection | null
  glossaryTarget: GlossaryTarget | null
  glossaryCache: Record<string, SavedWordAnalysis>
  glossaryGenerating: Record<string, boolean>
  wordGlosses: Record<string, string>
  toastTick: number
  /** Last save failure message, shown in the toast until the next save. */
  saveError: string | null

  toggleSelectMode(): void
  toggleGlossaryMode(): void
  toggleGranularSave(): void
  toggleTransliteration(): void
  openGlossary(target: GlossaryTarget): void
  closeGlossary(): void
  toggleSelection(messageId: string, lang: string, sourceText: string, index: number, word: string): void
  clearSelection(): void
  saveSelection(singleTranslation?: string): Promise<boolean>
  saveGranular(word: string, lang: string, translation?: string): Promise<boolean>
  speakSelection(): void
  generateGlossary(word: string, lang: string): Promise<void>
  glossWord(word: string, lang: string): Promise<void>
  showToast(): void
  resetForThread(): void
}

/**
 * Global state for the chat tool rail: the select/glossary/granular-save modes,
 * the single-message word selection, the glossary analysis cache, and the save
 * toast. Mirrors the tool state Android keeps in `ChatScreen`/`ChatViewModel`.
 */
export const useChatToolbarStore = create<ChatToolbarState>((set, get) => ({
  selectMode: false,
  glossaryMode: false,
  granularSave: false,
  selection: null,
  glossaryTarget: null,
  glossaryCache: {},
  glossaryGenerating: {},
  wordGlosses: {},
  toastTick: 0,
  saveError: null,

  toggleSelectMode() {
    const next = !get().selectMode
    set(
      next
        ? { selectMode: true, glossaryMode: false, glossaryTarget: null }
        : { selectMode: false, selection: null }
    )
  },

  toggleGlossaryMode() {
    const next = !get().glossaryMode
    set(
      next
        ? { glossaryMode: true, selectMode: false, selection: null, granularSave: false, glossaryTarget: null }
        : { glossaryMode: false, glossaryTarget: null }
    )
  },

  toggleGranularSave() {
    const next = !get().granularSave
    set(next ? { granularSave: true, glossaryMode: false, glossaryTarget: null } : { granularSave: false })
  },

  toggleTransliteration() {
    const store = useSettingsStore.getState()
    void store.patch({ transliterationEnabled: !store.settings.transliterationEnabled })
  },

  openGlossary(target) {
    set({ glossaryTarget: target })
    void get().generateGlossary(target.word, target.lang)
  },

  closeGlossary() {
    set({ glossaryTarget: null })
  },

  toggleSelection(messageId, lang, sourceText, index, word) {
    const current = get().selection
    if (
      !current ||
      current.messageId !== messageId ||
      current.lang !== lang ||
      current.sourceText !== sourceText
    ) {
      set({ selection: { messageId, lang, sourceText, words: [{ index, text: word }] } })
      return
    }
    const exists = current.words.some((entry) => entry.index === index)
    const words = exists
      ? current.words.filter((entry) => entry.index !== index)
      : [...current.words, { index, text: word }]
    set({ selection: words.length === 0 ? null : { ...current, words } })
  },

  clearSelection() {
    set({ selection: null })
  },

  async saveSelection(singleTranslation) {
    const sel = get().selection
    if (!sel || sel.words.length === 0) return false
    const words = [...sel.words].sort((a, b) => a.index - b.index)
    // Optimistic: clear the highlight + feedback now so the tap feels
    // instant; persistence follows in the background. On failure the
    // selection is restored for retry and the error replaces the toast.
    set({ selection: null })
    get().showToast()
    playSaveSound()
    const lexicon = useLexiconStore.getState()
    try {
      if (words.length === 1) {
        const gloss = singleTranslation?.trim() || (await bestEffortGloss(words[0].text, sel.lang))
        await lexicon.addWordPair(
          {
            word: words[0].text,
            lang: sel.lang,
            otherLang: helperLang(),
            translation: gloss
          },
          { quiet: true }
        )
      } else {
        await lexicon.addPhrase(
          {
            phrase: words.map((entry) => entry.text).join(' '),
            lang: sel.lang,
            translation: ''
          },
          { quiet: true }
        )
      }
      set({ saveError: null })
      return true
    } catch (error) {
      set({ selection: sel, saveError: error instanceof Error ? error.message : String(error) })
      return false
    }
  },

  async saveGranular(word, lang, translation) {
    let gloss = translation?.trim() ?? ''
    if (gloss === '') gloss = await bestEffortGloss(word, lang)
    get().showToast()
    playSaveSound()
    try {
      await useLexiconStore
        .getState()
        .addWordPair({ word, lang, otherLang: helperLang(), translation: gloss }, { quiet: true })
      set({ saveError: null })
      return true
    } catch (error) {
      set({ saveError: error instanceof Error ? error.message : String(error) })
      return false
    }
  },

  speakSelection() {
    const sel = get().selection
    if (!sel || sel.words.length === 0) return
    const text = [...sel.words]
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.text)
      .join(' ')
    void speak(text, sel.lang)
  },

  async generateGlossary(word, lang) {
    const api = getApi()
    if (!api || word.trim() === '') return
    const key = cacheKey(word, lang)
    if (get().glossaryCache[key] || get().glossaryGenerating[key]) return

    const caching = useSettingsStore.getState().settings.glossaryCacheEnabled
    if (caching) {
      const cached = await api.glossary.get(word, lang).catch(() => null)
      if (cached && analysisHasData(cached)) {
        set((state) => ({ glossaryCache: { ...state.glossaryCache, [key]: cached } }))
        return
      }
    }

    set((state) => ({ glossaryGenerating: { ...state.glossaryGenerating, [key]: true } }))
    try {
      const result = await api.lang.morph(word, lang)
      if (result) {
        const analysis = morphologyToAnalysis(result)
        if (analysisHasData(analysis)) {
          set((state) => ({ glossaryCache: { ...state.glossaryCache, [key]: analysis } }))
          if (caching) void api.glossary.put(word, lang, analysis)
        }
      }
    } catch {
      // errors surface as a missing analysis in the popup
    } finally {
      set((state) => {
        const next = { ...state.glossaryGenerating }
        delete next[key]
        return { glossaryGenerating: next }
      })
    }
  },

  async glossWord(word, lang) {
    const key = `${word}:${lang}`
    if (get().wordGlosses[key] || word.trim() === '') return
    try {
      const data = await getApi()?.translation.translate(word, lang, helperLang())
      const text = data?.sourceText?.trim()
      if (text) set((state) => ({ wordGlosses: { ...state.wordGlosses, [key]: text } }))
    } catch {
      // best-effort interlinear fallback
    }
  },

  showToast() {
    set((state) => ({ toastTick: state.toastTick + 1 }))
  },

  resetForThread() {
    set({
      selectMode: false,
      glossaryMode: false,
      granularSave: false,
      selection: null,
      glossaryTarget: null
    })
  }
}))

/** Cache key used by the popup to look up an analysis (exported for components). */
export function glossaryKey(word: string, lang: string): string {
  return cacheKey(word, lang)
}
