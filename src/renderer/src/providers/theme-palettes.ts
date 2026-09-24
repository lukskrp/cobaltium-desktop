import type { ThemeMode } from '@shared/domain/enums'

/** Full set of Cobaltium color tokens for one theme. */
export interface ThemeTokens {
  background: string
  foreground: string
  card: string
  cardForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  input: string
  ring: string
  sidebar: string
  sidebarForeground: string
  header: string
  userMsg: string
  userMsgForeground: string
  assistantMsg: string
  assistantMsgForeground: string
  conjugate: string
  decline: string
  readerBg: string
  readerText: string
  success: string
  warning: string
  info: string
}

export type FixedTheme = Exclude<ThemeMode, 'system'>

/**
 * Palettes for the eight fixed themes. `light`/`dark` are the two defaults;
 * the themed palettes keep the app's existing colors except `charcoal`, which
 * is ported faithfully from Android's `Color.kt` (CobaltCharcoal*).
 */
export const THEME_PALETTES: Record<FixedTheme, ThemeTokens> = {
  light: {
    background: '#f8fafc',
    foreground: '#0f172a',
    card: '#ffffff',
    cardForeground: '#0f172a',
    primary: '#2563eb',
    primaryForeground: '#ffffff',
    secondary: '#e2e8f0',
    secondaryForeground: '#1e293b',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    accent: '#dbeafe',
    accentForeground: '#1e3a8a',
    destructive: '#dc2626',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#2563eb',
    sidebar: '#f1f5f9',
    sidebarForeground: '#0f172a',
    header: '#ffffff',
    userMsg: '#dbeafe',
    userMsgForeground: '#1e3a8a',
    assistantMsg: '#f1f5f9',
    assistantMsgForeground: '#0f172a',
    conjugate: '#fff6dc',
    decline: '#e3f0fd',
    readerBg: '#f7f7f7',
    readerText: '#111111',
    success: '#2e7d32',
    warning: '#f9a825',
    info: '#1565c0'
  },
  dark: {
    background: '#0b0f14',
    foreground: '#e6edf3',
    card: '#111820',
    cardForeground: '#e6edf3',
    primary: '#3b82f6',
    primaryForeground: '#04121f',
    secondary: '#1b2530',
    secondaryForeground: '#e6edf3',
    muted: '#161f29',
    mutedForeground: '#93a1b1',
    accent: '#17273b',
    accentForeground: '#cfe0ff',
    destructive: '#f87171',
    border: '#1f2a36',
    input: '#1f2a36',
    ring: '#3b82f6',
    sidebar: '#0e141b',
    sidebarForeground: '#e6edf3',
    header: '#111820',
    userMsg: '#17273b',
    userMsgForeground: '#cfe0ff',
    assistantMsg: '#161f29',
    assistantMsgForeground: '#e6edf3',
    conjugate: '#5a5130',
    decline: '#33475c',
    readerBg: '#232323',
    readerText: '#f5f5f5',
    success: '#66bb6a',
    warning: '#ffb300',
    info: '#42a5f5'
  },
  // Faithful to Android's CobaltCharcoal* tokens.
  charcoal: {
    background: '#0a0a0a',
    foreground: '#f5f5f5',
    card: '#181818',
    cardForeground: '#f5f5f5',
    primary: '#00aaff',
    primaryForeground: '#ffffff',
    secondary: '#1f1f1f',
    secondaryForeground: '#f5f5f5',
    muted: '#1f1f1f',
    mutedForeground: '#9e9e9e',
    accent: '#14202b',
    accentForeground: '#4cc3ff',
    destructive: '#ef5350',
    border: '#2e2e2e',
    input: '#2e2e2e',
    ring: '#4cc3ff',
    sidebar: '#111111',
    sidebarForeground: '#f5f5f5',
    header: '#111111',
    userMsg: '#1a2a3a',
    userMsgForeground: '#f5f5f5',
    assistantMsg: '#1f1f1f',
    assistantMsgForeground: '#f5f5f5',
    conjugate: '#4a4630',
    decline: '#2a3a4a',
    readerBg: '#0d0d0d',
    readerText: '#f5f5f5',
    success: '#66bb6a',
    warning: '#ffb300',
    info: '#42a5f5'
  },
  'pitch-black': {
    background: '#000000',
    foreground: '#f5f5f5',
    card: '#0a0a0a',
    cardForeground: '#f5f5f5',
    primary: '#3b82f6',
    primaryForeground: '#000000',
    secondary: '#121212',
    secondaryForeground: '#f5f5f5',
    muted: '#101010',
    mutedForeground: '#9ca3af',
    accent: '#15233a',
    accentForeground: '#dbeafe',
    destructive: '#f87171',
    border: '#1a1a1a',
    input: '#1a1a1a',
    ring: '#3b82f6',
    sidebar: '#050505',
    sidebarForeground: '#f5f5f5',
    header: '#050505',
    userMsg: '#15233a',
    userMsgForeground: '#dbeafe',
    assistantMsg: '#101010',
    assistantMsgForeground: '#f5f5f5',
    conjugate: '#3a2c1e',
    decline: '#201e1a',
    readerBg: '#000000',
    readerText: '#f5f5f5',
    success: '#69f0ae',
    warning: '#ffc107',
    info: '#ffb74d'
  },
  'cocoa-cookie': {
    background: '#f7f1ec',
    foreground: '#3a2a20',
    card: '#fffaf6',
    cardForeground: '#3a2a20',
    primary: '#92400e',
    primaryForeground: '#fff7ed',
    secondary: '#eadfd4',
    secondaryForeground: '#4a3427',
    muted: '#f1e7de',
    mutedForeground: '#8a6f5c',
    accent: '#f3e0cf',
    accentForeground: '#6b3410',
    destructive: '#dc2626',
    border: '#e4d5c7',
    input: '#e4d5c7',
    ring: '#92400e',
    sidebar: '#efe4da',
    sidebarForeground: '#3a2a20',
    header: '#fffaf6',
    userMsg: '#f3e0cf',
    userMsgForeground: '#6b3410',
    assistantMsg: '#f1e7de',
    assistantMsgForeground: '#3a2a20',
    conjugate: '#f6e3cf',
    decline: '#eadfd4',
    readerBg: '#f7f1ec',
    readerText: '#3a2a20',
    success: '#2e7d32',
    warning: '#f9a825',
    info: '#1565c0'
  },
  earthy: {
    background: '#f4f6ee',
    foreground: '#26301c',
    card: '#fbfcf7',
    cardForeground: '#26301c',
    primary: '#4d7c0f',
    primaryForeground: '#f7fee7',
    secondary: '#e3e9d5',
    secondaryForeground: '#34401f',
    muted: '#edf1e3',
    mutedForeground: '#6b7a55',
    accent: '#e0e9cd',
    accentForeground: '#3f6212',
    destructive: '#dc2626',
    border: '#dbe3cb',
    input: '#dbe3cb',
    ring: '#4d7c0f',
    sidebar: '#eaf0dd',
    sidebarForeground: '#26301c',
    header: '#fbfcf7',
    userMsg: '#e0e9cd',
    userMsgForeground: '#3f6212',
    assistantMsg: '#edf1e3',
    assistantMsgForeground: '#26301c',
    conjugate: '#e0e9cd',
    decline: '#e3e9d5',
    readerBg: '#f4f6ee',
    readerText: '#26301c',
    success: '#2e7d32',
    warning: '#f9a825',
    info: '#33691e'
  },
  blossom: {
    background: '#fdf2f6',
    foreground: '#3b1f2b',
    card: '#fffafc',
    cardForeground: '#3b1f2b',
    primary: '#db2777',
    primaryForeground: '#fff1f6',
    secondary: '#f6dce7',
    secondaryForeground: '#4c2436',
    muted: '#fbe9f1',
    mutedForeground: '#9d6d82',
    accent: '#fbdce9',
    accentForeground: '#9d174d',
    destructive: '#dc2626',
    border: '#f3d6e2',
    input: '#f3d6e2',
    ring: '#db2777',
    sidebar: '#fbe8f0',
    sidebarForeground: '#3b1f2b',
    header: '#fffafc',
    userMsg: '#fbdce9',
    userMsgForeground: '#9d174d',
    assistantMsg: '#fbe9f1',
    assistantMsgForeground: '#3b1f2b',
    conjugate: '#fbdce9',
    decline: '#f6dce7',
    readerBg: '#fdf2f6',
    readerText: '#3b1f2b',
    success: '#2e7d32',
    warning: '#f9a825',
    info: '#b26a00'
  },
  nature: {
    background: '#f2f8f3',
    foreground: '#1e2f24',
    card: '#fbfefb',
    cardForeground: '#1e2f24',
    primary: '#15803d',
    primaryForeground: '#f0fdf4',
    secondary: '#dceadf',
    secondaryForeground: '#274232',
    muted: '#e8f2ea',
    mutedForeground: '#5f7a68',
    accent: '#d6ecd9',
    accentForeground: '#14532d',
    destructive: '#dc2626',
    border: '#d6e6da',
    input: '#d6e6da',
    ring: '#15803d',
    sidebar: '#e6f1e8',
    sidebarForeground: '#1e2f24',
    header: '#fbfefb',
    userMsg: '#d6ecd9',
    userMsgForeground: '#14532d',
    assistantMsg: '#e8f2ea',
    assistantMsgForeground: '#1e2f24',
    conjugate: '#d6ecd9',
    decline: '#dceadf',
    readerBg: '#f2f8f3',
    readerText: '#1e2f24',
    success: '#15803d',
    warning: '#f9a825',
    info: '#33691e'
  }
}

/** Resolve the concrete palette for a mode ('system' follows the OS). */
export function resolveTheme(mode: ThemeMode, systemDark: boolean): ThemeTokens {
  if (mode === 'system') return systemDark ? THEME_PALETTES.dark : THEME_PALETTES.light
  return THEME_PALETTES[mode] ?? THEME_PALETTES.light
}

/** CSS custom-property names (without the leading `--`) for each token. */
export const TOKEN_VAR_NAMES: Record<keyof ThemeTokens, string> = {
  background: 'background',
  foreground: 'foreground',
  card: 'card',
  cardForeground: 'card-foreground',
  primary: 'primary',
  primaryForeground: 'primary-foreground',
  secondary: 'secondary',
  secondaryForeground: 'secondary-foreground',
  muted: 'muted',
  mutedForeground: 'muted-foreground',
  accent: 'accent',
  accentForeground: 'accent-foreground',
  destructive: 'destructive',
  border: 'border',
  input: 'input',
  ring: 'ring',
  sidebar: 'sidebar',
  sidebarForeground: 'sidebar-foreground',
  header: 'header',
  userMsg: 'user-msg',
  userMsgForeground: 'user-msg-foreground',
  assistantMsg: 'assistant-msg',
  assistantMsgForeground: 'assistant-msg-foreground',
  conjugate: 'conjugate',
  decline: 'decline',
  readerBg: 'reader-bg',
  readerText: 'reader-text',
  success: 'success',
  warning: 'warning',
  info: 'info'
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Relative luminance of a `#rrggbb` color (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return 1
  const int = Number.parseInt(match[1], 16)
  const r = (int >> 16) & 0xff
  const g = (int >> 8) & 0xff
  const b = int & 0xff
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Whether a palette should present as dark (used for `color-scheme`). */
export function isDarkPalette(tokens: ThemeTokens): boolean {
  return luminance(tokens.background) < 0.5
}
