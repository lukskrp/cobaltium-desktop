import { create } from 'zustand'
import { STT_MODELS } from '@shared/stt/catalog'
import type { SttProgress, SttStatus } from '@shared/ipc'
import { getApi } from '@renderer/lib/ipc'

interface SttStore {
  status: SttStatus | null
  progress: SttProgress | null
  busy: boolean
  loaded: boolean
  load(): Promise<void>
  provision(model: string): Promise<void>
  remove(model: string): Promise<void>
}

let listenerInstalled = false

export const useSttStore = create<SttStore>((set, get) => {
  function install(): void {
    if (listenerInstalled) return
    listenerInstalled = true
    getApi()?.stt.onProgress((progress) => {
      set({ progress })
      if (progress.phase === 'done' || progress.phase === 'error') {
        set({ busy: false })
        void get().load()
      }
    })
  }

  return {
    status: null,
    progress: null,
    busy: false,
    loaded: false,

    async load() {
      install()
      const status = (await getApi()?.stt.status()) ?? null
      set({ status, loaded: true })
    },

    async provision(model) {
      if (!STT_MODELS.some((entry) => entry.id === model)) return
      set({ busy: true })
      try {
        await getApi()?.stt.provision(model)
      } finally {
        set({ busy: false })
        await get().load()
      }
    },

    async remove(model) {
      set({ busy: true })
      try {
        await getApi()?.stt.remove(model)
      } finally {
        set({ busy: false })
        await get().load()
      }
    }
  }
})
