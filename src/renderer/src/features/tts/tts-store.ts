import { create } from 'zustand'
import type { TtsProgress, TtsStatus } from '@shared/ipc'
import { getApi } from '@renderer/lib/ipc'

interface TtsStore {
  status: TtsStatus | null
  progress: Record<string, TtsProgress>
  busy: Record<string, boolean>
  loaded: boolean
  load(): Promise<void>
  provision(lang: string): Promise<void>
  remove(lang: string): Promise<void>
}

let listenerInstalled = false

export const useTtsStore = create<TtsStore>((set, get) => {
  function install(): void {
    if (listenerInstalled) return
    listenerInstalled = true
    getApi()?.tts.onProgress((progress) => {
      set((state) => ({ progress: { ...state.progress, [progress.lang]: progress } }))
      if (progress.phase === 'done' || progress.phase === 'error') {
        set((state) => ({ busy: { ...state.busy, [progress.lang]: false } }))
        void get().load()
      }
    })
  }

  return {
    status: null,
    progress: {},
    busy: {},
    loaded: false,

    async load() {
      install()
      const status = (await getApi()?.tts.status()) ?? null
      set({ status, loaded: true })
    },

    async provision(lang) {
      set((state) => ({ busy: { ...state.busy, [lang]: true } }))
      try {
        await getApi()?.tts.provision(lang)
      } finally {
        set((state) => ({ busy: { ...state.busy, [lang]: false } }))
        await get().load()
      }
    },

    async remove(lang) {
      set((state) => ({ busy: { ...state.busy, [lang]: true } }))
      try {
        await getApi()?.tts.remove(lang)
      } finally {
        set((state) => ({ busy: { ...state.busy, [lang]: false } }))
        await get().load()
      }
    }
  }
})
