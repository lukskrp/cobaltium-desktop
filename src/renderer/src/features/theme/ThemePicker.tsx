import { useState } from 'react'
import { Check, Moon, Palette, Sun, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useT } from '@renderer/lib/i18n'
import { THEMES, useTheme, type ThemeName } from '@renderer/providers/ThemeProvider'
import { resolveTheme, type ThemeTokens } from '@renderer/providers/theme-palettes'

const THEME_KEY: Record<ThemeName, string> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
  charcoal: 'theme.charcoal',
  'pitch-black': 'theme.pitchBlack',
  'cocoa-cookie': 'theme.cocoa',
  earthy: 'theme.earthy',
  blossom: 'theme.blossom',
  nature: 'theme.nature'
}

/** Mini chat-window mock rendered from a palette (Android `ThemesSheet` preview). */
function ThemePreview({ tokens }: { tokens: ThemeTokens }): React.JSX.Element {
  return (
    <div className="h-14 w-24 shrink-0 rounded-lg p-1.5" style={{ background: tokens.background }}>
      <div
        className="flex items-center gap-1 rounded px-1.5 py-1"
        style={{ background: tokens.header }}
      >
        <span className="size-1.5 rounded-full" style={{ background: tokens.primary }} />
        <span
          className="h-1 flex-1 rounded-full"
          style={{ background: tokens.mutedForeground, opacity: 0.4 }}
        />
      </div>
      <div className="mt-1 flex gap-1">
        <span className="h-2.5 flex-[3] rounded" style={{ background: tokens.assistantMsg }} />
        <span className="h-2.5 flex-[2] rounded" style={{ background: tokens.userMsg }} />
      </div>
      <div className="mt-1 h-4 rounded" style={{ background: tokens.card }} />
    </div>
  )
}

/** Top-bar theme controls: quick light/dark menu + full themes modal. */
export function ThemePicker(): React.JSX.Element {
  const t = useT()
  const { theme, resolved, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  function choose(next: ThemeName): void {
    setTheme(next)
    setMenuOpen(false)
    setSheetOpen(false)
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <Button
          size="icon"
          variant="ghost"
          title={t('themes_menu_title')}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {resolved === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-xl">
              {THEMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => choose(name)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                    theme === name
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/60'
                  )}
                >
                  <span>{t(THEME_KEY[name])}</span>
                  {theme === name && <Check className="size-3.5" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Button
        size="icon"
        variant="ghost"
        data-tour="themes.button"
        title={t('themes_menu_title')}
        onClick={() => setSheetOpen(true)}
      >
        <Palette className="size-4" />
      </Button>

      {sheetOpen && (
        <ThemesSheet current={theme} onSelect={choose} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  )
}

function ThemesSheet({
  current,
  onSelect,
  onClose
}: {
  current: ThemeName
  onSelect: (theme: ThemeName) => void
  onClose: () => void
}): React.JSX.Element {
  const t = useT()
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('themes_menu_title')}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {THEMES.map((name) => {
            const tokens = resolveTheme(name, systemDark)
            const selected = name === current
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  selected ? 'border-primary bg-accent/60' : 'border-border hover:bg-accent/40'
                )}
              >
                <ThemePreview tokens={tokens} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t(THEME_KEY[name])}</div>
                  {selected && (
                    <div className="text-xs text-muted-foreground">{t('themes_menu_current')}</div>
                  )}
                </div>
                {selected && <Check className="size-4 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
