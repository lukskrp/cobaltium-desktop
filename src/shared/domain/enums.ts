/** Enumerations shared across the main process and renderer (port of Android `domain/Enums.kt`). */

export const CHAT_MODES = ['conversation', 'corrective', 'immersive', 'reflective', 'voice'] as const
export type ChatMode = (typeof CHAT_MODES)[number]

export const SELECTION_MODES = ['source', 'gloss', 'both'] as const
export type SelectionMode = (typeof SELECTION_MODES)[number]

export const PROVIDER_KINDS = ['local', 'openai-compat'] as const
export type ProviderKind = (typeof PROVIDER_KINDS)[number]

export const THEME_MODES = [
  'system',
  'light',
  'dark',
  'charcoal',
  'cocoa-cookie',
  'earthy',
  'pitch-black',
  'blossom',
  'nature'
] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const PROMPT_TYPES = [
  'ambiguity',
  'etymology',
  'examples',
  'mistakes',
  'conjugation',
  'mnemonic'
] as const
export type PromptType = (typeof PROMPT_TYPES)[number]

export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const
export type MessageRole = (typeof MESSAGE_ROLES)[number]

function pick<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

export const ChatMode = {
  fromWire: (value: unknown): ChatMode => pick(CHAT_MODES, value, 'conversation')
} as const

export const SelectionMode = {
  fromWire: (value: unknown): SelectionMode => pick(SELECTION_MODES, value, 'source')
} as const

export const ProviderKind = {
  fromWire: (value: unknown): ProviderKind => pick(PROVIDER_KINDS, value, 'local')
} as const

export const ThemeMode = {
  fromWire: (value: unknown): ThemeMode => pick(THEME_MODES, value, 'system')
} as const

export const PromptType = {
  fromWire: (value: unknown): PromptType => pick(PROMPT_TYPES, value, 'ambiguity')
} as const

export const MessageRole = {
  fromWire: (value: unknown): MessageRole => pick(MESSAGE_ROLES, value, 'system'),
  isMessageRole: (value: unknown): value is MessageRole =>
    typeof value === 'string' && (MESSAGE_ROLES as readonly string[]).includes(value)
} as const
