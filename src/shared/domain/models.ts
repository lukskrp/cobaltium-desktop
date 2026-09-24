import type { ChatMode, MessageRole } from './enums'

/** One {native, foreign} gloss pair from the LLM translation response. */
export interface GlossPair {
  native: string
  foreign: string
}

/** Parsed LLM translation: the translated text plus its per-word glosses. */
export interface LlmTranslation {
  translation: string
  glosses: GlossPair[]
}

/** Cached translation + gloss map for Immersive/Reflective modes. */
export interface ImmersiveData {
  sourceText: string
  glossMap: Record<string, string>
  foreignLang: string
}

/** Morphological analysis fields produced by the LLM for a saved word. */
export interface SavedWordAnalysis {
  pos?: string | null
  tense?: string | null
  gender?: string | null
  number?: string | null
  person?: string | null
  case?: string | null
  mood?: string | null
  form?: string | null
  notes?: string | null
}

export function analysisHasData(analysis: SavedWordAnalysis | null | undefined): boolean {
  if (!analysis) return false
  return [
    analysis.pos,
    analysis.tense,
    analysis.gender,
    analysis.number,
    analysis.person,
    analysis.case,
    analysis.mood,
    analysis.form,
    analysis.notes
  ].some((value) => value != null && value !== '')
}

export const EMPTY_IMMERSIVE_DATA: ImmersiveData = {
  sourceText: '',
  glossMap: {},
  foreignLang: ''
}

/** A chat session. */
export interface Thread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  collapsed: boolean
  mode: ChatMode
  starred: boolean
  draft: string
  contextNotes: string
  notesThroughMessageId: string
}

/** A single persisted message in a thread. */
export interface Message {
  id: string
  threadId: string
  role: MessageRole
  content: string
  createdAt: number
  immersive?: ImmersiveData | null
}

/** A saved word pair; (word, lang) is unique so re-saving the same word dedups. */
export interface SavedWord {
  id: string
  word: string
  lang: string
  otherLang: string
  translation: string
  hoverType: string
  pos?: string | null
  definitions: string[]
  analysis?: SavedWordAnalysis | null
  savedAt: number
  folderId?: string | null
}

/** A named (nestable) folder organizing saved words and phrases. */
export interface SavedFolder {
  id: string
  name: string
  parentId: string | null
  lang: string | null
  createdAt: number
}

/** A saved multi-word phrase. */
export interface SavedPhrase {
  id: string
  phrase: string
  lang: string
  translation: string
  createdAt: number
  folderId?: string | null
}
