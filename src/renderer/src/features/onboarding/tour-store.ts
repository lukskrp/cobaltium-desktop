import { create } from 'zustand'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useChatStore } from '@renderer/features/chat/chat-store'
import type { TourStep } from './tour-steps'

interface TourState {
  active: boolean
  index: number
  /** chatMode captured at `start()`, restored on `dismiss()`. */
  modeBeforeTour: string | null
  /** activeThreadId captured at `start()`, restored on `dismiss()`. */
  threadIdBeforeTour: string | null
  start(): void
  stop(): void
  /** Stop + restore mode/thread captured at start (port of Android `dismiss()`). */
  dismiss(): void
  next(total: number): void
  back(): void
  setIndex(index: number): void
}

/**
 * Apply a step's side effects on entering it (port of Android
 * `GuidedTourController.applyEnter()`).
 *
 * - Route changes are handled by `GuidedTour` via `step.route`.
 * - `SET_REFLECTIVE_MODE` patches `settings.chatMode` directly — never via
 *   `chat-store.setMode()`, which would also jump `activeThreadId` to the
 *   newest thread of that mode and lose the user's draft thread.
 * - `SET_CLOUD_PROVIDER` is intentionally a noop on desktop: Android flips
 *   the demo provider to show cloud fields, but mutating the user's real
 *   provider mid-tour would be intrusive. The LLM steps still navigate to
 *   `/settings` and scroll to each anchor.
 * - `SCROLL_TO_ANCHOR` is handled by `GuidedTour` (scrollIntoView + remeasure).
 */
export async function applyTourEnterAction(step: TourStep): Promise<void> {
  switch (step.enterAction) {
    case 'SET_REFLECTIVE_MODE': {
      const current = useSettingsStore.getState().settings.chatMode
      if (current !== 'reflective') {
        await useSettingsStore.getState().patch({ chatMode: 'reflective' })
      }
      break
    }
    case 'SET_CLOUD_PROVIDER':
      // Noop on desktop (see above).
      break
    default:
      break
  }
}

/** Drives the guided spotlight tour (see `GuidedTour`). */
export const useTourStore = create<TourState>((set, get) => ({
  active: false,
  index: 0,
  modeBeforeTour: null,
  threadIdBeforeTour: null,

  start() {
    const modeBeforeTour = useSettingsStore.getState().settings.chatMode ?? null
    const threadIdBeforeTour = useChatStore.getState().activeThreadId ?? null
    set({ active: true, index: 0, modeBeforeTour, threadIdBeforeTour })
  },

  stop() {
    set({ active: false })
  },

  dismiss() {
    const { modeBeforeTour, threadIdBeforeTour } = get()
    set({ active: false, modeBeforeTour: null, threadIdBeforeTour: null })
    // Ordered restore: thread first (`selectThread` also syncs chatMode to the
    // thread's mode), then the captured chatMode if it still differs. Awaited
    // in order so concurrent patches can't interleave; best-effort, since the
    // tour is finished either way.
    void (async () => {
      try {
        if (threadIdBeforeTour && useChatStore.getState().activeThreadId !== threadIdBeforeTour) {
          await useChatStore.getState().selectThread(threadIdBeforeTour)
        }
        if (modeBeforeTour && useSettingsStore.getState().settings.chatMode !== modeBeforeTour) {
          await useSettingsStore.getState().patch({ chatMode: modeBeforeTour })
        }
      } catch {
        // restore is best-effort; the tour is finished regardless
      }
    })()
  },

  next(total) {
    set((state) => ({ index: Math.min(state.index + 1, Math.max(0, total - 1)) }))
  },

  back() {
    set((state) => ({ index: Math.max(state.index - 1, 0) }))
  },

  setIndex(index) {
    set({ index: Math.max(0, index) })
  }
}))
