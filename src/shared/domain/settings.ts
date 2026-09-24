import {
  ChatMode,
  ProviderKind,
  SelectionMode,
  ThemeMode,
  type ChatMode as ChatModeType,
  type ProviderKind as ProviderKindType,
  type SelectionMode as SelectionModeType,
  type ThemeMode as ThemeModeType
} from './enums'
import { DEFAULT_PROVIDER_ID, getProviderPreset, type CloudConfig } from './llm'
import { UpdateChannel } from './update'

/**
 * Persisted application preferences (port of Android `AppSettings`), stored as a
 * single JSON record under the `app_settings` key of the settings table.
 */
export interface AppSettings {
  themeMode: string
  uiLanguage: string
  sourceLang: string
  targetLang: string
  learnLang: string
  /** The user's primary learning language. */
  mainLearnLang: string
  chatMode: string
  /** The exact chat thread that was open when the app last closed. */
  activeThreadId: string | null
  selectionMode: string
  /** Local llama.cpp vs OpenAI-compatible cloud. Desktop ships cloud-first. */
  providerKind: string
  /** Active cloud/local vendor id (see CLOUD_PROVIDERS). */
  cloudProvider: string
  /** Base URL override; blank falls back to the vendor preset. */
  llmBaseUrl: string
  llmModel: string
  llmMaxTokens: number
  llmTemperature: number
  llmEnabled: boolean
  glossaryCacheEnabled: boolean
  /** When on, glosses show a romanized transliteration line between word and gloss. */
  transliterationEnabled: boolean
  /** External translation tier: "none", "deepl" or "google". */
  translationProvider: string
  /** DeepL endpoint plan: "free" or "pro". */
  deeplPlan: string
  /** Enable the fast translation tier (Tailscale Qwen preset). */
  fastTranslateEnabled: boolean
  /** Base URL of the fast translation endpoint. */
  fastTranslateBaseUrl: string
  /** Model id for the fast translation endpoint. */
  fastTranslateModel: string
  /** Per-call budget for the fast tier (ms). */
  fastTranslateTimeoutMs: number
  /** Explicit microphone opt-in; gates the Electron media permission. */
  micEnabled: boolean
  /** Voice-mode STT language; "auto" follows the learning language. */
  voiceInputLang: string
  /** Voice-mode reply language; "auto" replies in the spoken language. */
  voiceResponseLang: string
  /** Speak assistant replies aloud in voice mode. */
  voiceTtsEnabled: boolean
  /** whisper.cpp model id for offline speech recognition. */
  sttModel: string
  /** Desktop notification (max once a day) when SRS cards are due. */
  remindersEnabled: boolean
  saveVolume: number
  /** Auto-update channel: "stable", "beta" or "alpha". */
  updateChannel: string
  /** True once the first-run onboarding tour has been seen (or skipped). */
  onboardingDone: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  uiLanguage: 'auto',
  sourceLang: 'auto',
  targetLang: 'auto',
  learnLang: 'en',
  mainLearnLang: 'auto',
  chatMode: 'conversation',
  activeThreadId: null,
  selectionMode: 'source',
  providerKind: 'openai-compat',
  cloudProvider: DEFAULT_PROVIDER_ID,
  llmBaseUrl: '',
  llmModel: 'deepseek-v4-flash',
  llmMaxTokens: 2048,
  llmTemperature: 0.7,
  llmEnabled: true,
  glossaryCacheEnabled: true,
  transliterationEnabled: false,
  translationProvider: 'none',
  deeplPlan: 'free',
  fastTranslateEnabled: false,
  fastTranslateBaseUrl: '',
  fastTranslateModel: 'qwen-2.5-1.5b-instruct',
  fastTranslateTimeoutMs: 10_000,
  micEnabled: false,
  voiceInputLang: 'auto',
  voiceResponseLang: 'auto',
  voiceTtsEnabled: true,
  sttModel: 'base',
  remindersEnabled: true,
  saveVolume: 0.5,
  updateChannel: 'stable',
  onboardingDone: false
}

export interface SettingsView extends AppSettings {
  readonly theme: ThemeModeType
  readonly mode: ChatModeType
  readonly selMode: SelectionModeType
  readonly provider: ProviderKindType
}

/** Merge unknown persisted JSON over the defaults, coercing types defensively. */
export function normalizeAppSettings(raw: unknown): AppSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    const value = input[key]
    if (value === undefined) continue
    const fallback = DEFAULT_SETTINGS[key]
    if (fallback === null) {
      out[key] = typeof value === 'string' ? value : null
    } else if (typeof fallback === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
    } else if (typeof fallback === 'boolean') {
      if (typeof value === 'boolean') out[key] = value
    } else if (typeof value === 'string') {
      out[key] = value
    }
  }

  const normalized = out as unknown as AppSettings
  normalized.themeMode = ThemeMode.fromWire(normalized.themeMode)
  normalized.chatMode = ChatMode.fromWire(normalized.chatMode)
  normalized.selectionMode = SelectionMode.fromWire(normalized.selectionMode)
  normalized.providerKind = ProviderKind.fromWire(normalized.providerKind)
  normalized.llmMaxTokens = clampInt(normalized.llmMaxTokens, 64, 131072, DEFAULT_SETTINGS.llmMaxTokens)
  normalized.llmTemperature = clampNumber(
    normalized.llmTemperature,
    0,
    2,
    DEFAULT_SETTINGS.llmTemperature
  )
  normalized.saveVolume = clampNumber(normalized.saveVolume, 0, 1, DEFAULT_SETTINGS.saveVolume)
  normalized.updateChannel = UpdateChannel.fromWire(normalized.updateChannel)

  return normalized
}

export function toSettingsView(settings: AppSettings): SettingsView {
  return {
    ...settings,
    theme: ThemeMode.fromWire(settings.themeMode),
    mode: ChatMode.fromWire(settings.chatMode),
    selMode: SelectionMode.fromWire(settings.selectionMode),
    provider: ProviderKind.fromWire(settings.providerKind)
  }
}

/** Normalize a user-provided base URL: prepend http:// if missing, remap 0.0.0.0. */
function normalizeBaseUrl(url: string): string {
  let trimmed = url.replace(/\/+$/, '')
  if (/^https?:\/\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^https?:\/\/0\.0\.0\.0/, 'http://127.0.0.1')
  } else {
    trimmed = trimmed.replace(/^0\.0\.0\.0/, '127.0.0.1')
    trimmed = `http://${trimmed}`
  }
  return trimmed
}

/**
 * Resolve the persisted settings + decrypted API key into a concrete cloud
 * config, filling in vendor defaults for any blank fields.
 */
export function resolveCloudConfig(settings: AppSettings, apiKey: string | null): CloudConfig {
  const preset = getProviderPreset(settings.cloudProvider)
  return {
    baseUrl: normalizeBaseUrl(settings.llmBaseUrl.trim() || preset.baseUrl),
    apiKey: apiKey ?? '',
    model: settings.llmModel,
    maxTokens: settings.llmMaxTokens,
    temperature: settings.llmTemperature,
    route: preset.route,
    auth: preset.auth
  }
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
