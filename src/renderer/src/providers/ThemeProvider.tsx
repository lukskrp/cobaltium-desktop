import * as React from 'react'
import { ThemeMode } from '@shared/domain/enums'
import { getApi } from '@renderer/lib/ipc'
import {
  TOKEN_VAR_NAMES,
  isDarkPalette,
  resolveTheme,
  type ThemeTokens
} from './theme-palettes'

export const THEMES = [
  'system',
  'light',
  'dark',
  'charcoal',
  'pitch-black',
  'cocoa-cookie',
  'earthy',
  'blossom',
  'nature'
] as const

export type ThemeName = (typeof THEMES)[number]

interface ThemeContextValue {
  theme: ThemeName
  resolved: 'light' | 'dark'
  palette: ThemeTokens
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function applyPalette(tokens: ThemeTokens): void {
  const root = document.documentElement
  for (const key of Object.keys(tokens) as (keyof ThemeTokens)[]) {
    root.style.setProperty(`--${TOKEN_VAR_NAMES[key]}`, tokens[key])
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [theme, setThemeState] = React.useState<ThemeName>('system')
  const [systemDark, setSystemDark] = React.useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  )

  React.useEffect(() => {
    const api = getApi()
    if (!api) return
    let cancelled = false
    api.settings
      .loadApp()
      .then((settings) => {
        if (!cancelled) setThemeState(ThemeMode.fromWire(settings.themeMode))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent): void => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const palette = React.useMemo(() => resolveTheme(theme, systemDark), [theme, systemDark])
  const resolved: 'light' | 'dark' = isDarkPalette(palette) ? 'dark' : 'light'

  React.useEffect(() => {
    applyPalette(palette)
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = resolved
  }, [palette, theme, resolved])

  const setTheme = React.useCallback((next: ThemeName) => {
    setThemeState(next)
    getApi()
      ?.settings.patchApp({ themeMode: next })
      .catch(() => undefined)
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolved, palette, setTheme }),
    [theme, resolved, palette, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
