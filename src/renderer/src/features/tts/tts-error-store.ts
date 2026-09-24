import { create } from 'zustand'

interface TtsErrorState {
  message: string | null
  tick: number
  report(message: string): void
  dismiss(): void
}

/** Holds the last offline-TTS failure so the UI can surface it (instead of silently using OS voices). */
export const useTtsErrorStore = create<TtsErrorState>((set) => ({
  message: null,
  tick: 0,
  report(message) {
    set((state) => ({ message, tick: state.tick + 1 }))
  },
  dismiss() {
    set({ message: null })
  }
}))
