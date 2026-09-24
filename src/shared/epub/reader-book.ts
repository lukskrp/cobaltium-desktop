/** EPUB reader domain types (port of `data/epub/ReaderBook.kt` + `ReaderRepository.ReaderState`). */

export interface ReaderChapter {
  id: string
  href: string
  title: string
  blocks: string[]
}

export interface ReaderBook {
  id: string
  title: string
  author: string
  languageHint: string | null
  chapters: ReaderChapter[]
}

export interface ReaderState {
  sourceLang: string
  targetLang: string
  currentChapterIndex: number
  currentBlockIndex: number
  /** Draft edits: chapterId -> edited block texts (parallel to the originals). */
  editedBlocks: Record<string, string[]>
}

export interface ReaderBookMeta {
  id: string
  title: string
  author: string
  chapterCount: number
  addedAt: number
}

export const DRAFT_CHAPTER_LIMIT = 3

export function createReaderState(): ReaderState {
  return {
    sourceLang: 'auto',
    targetLang: 'auto',
    currentChapterIndex: 0,
    currentBlockIndex: 0,
    editedBlocks: {}
  }
}

export function readerHasDraft(state: ReaderState): boolean {
  return Object.keys(state.editedBlocks).length > 0
}

export function readerDraftOverflow(state: ReaderState, limit = DRAFT_CHAPTER_LIMIT): boolean {
  return Object.keys(state.editedBlocks).length > limit
}
