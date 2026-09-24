import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/domain/settings'
import { getProviderPreset } from '@shared/domain/llm'
import type { ProviderInfo } from '@shared/ipc'
import { getApi } from '@renderer/lib/ipc'

interface SettingsState {
  settings: AppSettings
  providerInfo: ProviderInfo | null
  keyPresence: Record<string, boolean>
  encryptionAvailable: boolean
  loaded: boolean
  load(): Promise<void>
  patch(patch: Partial<AppSettings>): Promise<void>
  selectProvider(id: string): Promise<void>
  saveKey(id: string, value: string): Promise<void>
  clearKey(id: string): Promise<void>
  refreshProvider(): Promise<void>
}

/**
 * Serializes `patch()` calls: concurrent patches (e.g. a tour restore racing
 * a language flip) otherwise interleave, and a stale response can overwrite a
 * newer state in the store. Each task runs after the previous one settles; a
 * rejection still propagates to its own caller without breaking the chain.
 */
let patchChain: Promise<void> = Promise.resolve()

async function loadProviderSnapshot(): Promise<{
  providerInfo: ProviderInfo | null
  keyPresence: Record<string, boolean>
  encryptionAvailable: boolean
}> {
  const api = getApi()
  if (!api) return { providerInfo: null, keyPresence: {}, encryptionAvailable: false }
  const [providerInfo, keyPresence, encryptionAvailable] = await Promise.all([
    api.llm.providerInfo().catch(() => null),
    api.keys.list().catch(() => ({})),
    api.keys.available().catch(() => false)
  ])
  return { providerInfo, keyPresence, encryptionAvailable }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  providerInfo: null,
  keyPresence: {},
  encryptionAvailable: false,
  loaded: false,

  async load() {
    const api = getApi()
    if (!api) {
      set({ loaded: true })
      return
    }
    const [settings, snapshot] = await Promise.all([
      api.settings.loadApp().catch(() => DEFAULT_SETTINGS),
      loadProviderSnapshot()
    ])
    set({ settings, ...snapshot, loaded: true })
  },

  async patch(patch) {
    const run = patchChain.then(async () => {
      const api = getApi()
      const next = api
        ? await api.settings.patchApp(patch)
        : { ...get().settings, ...patch }
      set({ settings: next })
      await get().refreshProvider()
    })
    patchChain = run.catch(() => undefined)
    await run
  },

  async selectProvider(id) {
    const preset = getProviderPreset(id)
    await get().patch({
      cloudProvider: id,
      llmBaseUrl: '',
      llmModel: preset.knownModels[0] ?? get().settings.llmModel
    })
  },

  async saveKey(id, value) {
    await getApi()?.keys.set(id, value)
    const snapshot = await loadProviderSnapshot()
    set(snapshot)
  },

  async clearKey(id) {
    await getApi()?.keys.clear(id)
    const snapshot = await loadProviderSnapshot()
    set(snapshot)
  },

  async refreshProvider() {
    const api = getApi()
    if (!api) return
    const snapshot = await loadProviderSnapshot()
    set(snapshot)
  }
}))
