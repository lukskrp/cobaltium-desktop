import { create } from 'zustand'
import {
  createReaderState,
  type ReaderBook,
  type ReaderBookMeta,
  type ReaderState
} from '@shared/epub'
import { getApi } from '@renderer/lib/ipc'

let saveTimer: ReturnType<typeof setTimeout> | null = null

interface ReaderStore {
  library: ReaderBookMeta[]
  book: ReaderBook | null
  state: ReaderState
  loaded: boolean
  busy: boolean
  error: string | null

  load(): Promise<void>
  open(): Promise<void>
  openBook(id: string): Promise<void>
  deleteBook(id: string): Promise<void>
  exportBook(): Promise<void>
  closeBook(): void
  setPosition(chapterIndex: number, blockIndex: number): void
  setLanguages(sourceLang: string, targetLang: string): void
  setBlockText(chapterId: string, index: number, text: string): void
  saveNow(): Promise<void>
  clearDraft(): Promise<void>
  resetEditedChapters(): Promise<void>
}

export const useReaderStore = create<ReaderStore>((set, get) => {
  function cancelScheduledSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
  }

  function scheduleSave(): void {
    const { book } = get()
    if (!book) return
    const bookId = book.id
    if (saveTimer) clearTimeout(saveTimer)
    // State is resolved at fire time (not schedule time), and the write is
    // skipped if the book was closed, deleted, or switched since: otherwise a
    // pending timer could resurrect state for the wrong book.
    saveTimer = setTimeout(() => {
      saveTimer = null
      const current = get()
      if (current.book?.id !== bookId) return
      void getApi()?.reader.saveState(bookId, current.state)
    }, 500)
  }

  async function refreshLibrary(): Promise<void> {
    const library = (await getApi()?.reader.library()) ?? []
    set({ library })
  }

  return {
    library: [],
    book: null,
    state: createReaderState(),
    loaded: false,
    busy: false,
    error: null,

    async load() {
      await refreshLibrary()
      set({ loaded: true })
    },

    async open() {
      cancelScheduledSave()
      set({ busy: true, error: null })
      try {
        const result = await getApi()?.reader.open()
        if (result) {
          set({ book: result.book, state: result.state })
          await refreshLibrary()
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) })
      } finally {
        set({ busy: false })
      }
    },

    async openBook(id) {
      cancelScheduledSave()
      set({ busy: true, error: null })
      try {
        const result = await getApi()?.reader.load(id)
        if (result) set({ book: result.book, state: result.state })
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) })
      } finally {
        set({ busy: false })
      }
    },

    async deleteBook(id) {
      cancelScheduledSave()
      await getApi()?.reader.delete(id)
      await refreshLibrary()
      if (get().book?.id === id) set({ book: null, state: createReaderState() })
    },

    async exportBook() {
      const { book } = get()
      if (!book) return
      // Flush pending position/edit state first so the export includes it.
      await get().saveNow()
      const latest = get()
      if (latest.book?.id !== book.id) return
      await getApi()?.reader.export(book.id, latest.state)
    },

    closeBook() {
      // Flush the latest position before closing (fire-and-forget: the values
      // are captured, so the synchronous reset below cannot corrupt the write).
      const { book, state } = get()
      cancelScheduledSave()
      if (book) void getApi()?.reader.saveState(book.id, state)
      set({ book: null, state: createReaderState() })
    },

    setPosition(chapterIndex, blockIndex) {
      set((s) => ({ state: { ...s.state, currentChapterIndex: chapterIndex, currentBlockIndex: blockIndex } }))
      scheduleSave()
    },

    setLanguages(sourceLang, targetLang) {
      set((s) => ({ state: { ...s.state, sourceLang, targetLang } }))
      scheduleSave()
    },

    setBlockText(chapterId, index, text) {
      set((s) => {
        const chapter = s.book?.chapters.find((c) => c.id === chapterId)
        const base = s.state.editedBlocks[chapterId] ?? chapter?.blocks ?? []
        const next = [...base]
        next[index] = text
        return { state: { ...s.state, editedBlocks: { ...s.state.editedBlocks, [chapterId]: next } } }
      })
      scheduleSave()
    },

    async saveNow() {
      const { book, state } = get()
      if (!book) return
      cancelScheduledSave()
      await getApi()?.reader.saveState(book.id, state)
    },

    async clearDraft() {
      set((s) => ({ state: { ...s.state, editedBlocks: {} } }))
      await get().saveNow()
    },

    async resetEditedChapters() {
      set((s) => ({ state: { ...s.state, editedBlocks: {} } }))
      await get().saveNow()
    }
  }
})
