import { useEffect } from 'react'
import {
  BookA,
  BookOpen,
  Clapperboard,
  GraduationCap,
  MessagesSquare,
  NotebookText,
  Quote,
  Settings,
  Sparkles
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@renderer/lib/utils'
import { getApi } from '@renderer/lib/ipc'
import { warmupAudio } from '@renderer/lib/sound'
import { isRtl, useT, useUiLanguage } from '@renderer/lib/i18n'
import { StatusBar } from '@renderer/components/StatusBar'
import { ThemePicker } from '@renderer/features/theme/ThemePicker'
import { OnboardingDialog } from '@renderer/features/onboarding/OnboardingDialog'
import { GuidedTour } from '@renderer/features/onboarding/GuidedTour'
import { EpubOpenHandler } from '@renderer/features/reader/EpubOpenHandler'
import { ReportDialog } from '@renderer/components/ReportDialog'
import { TtsErrorToast } from '@renderer/features/tts/TtsErrorToast'
import { useChatStore } from '@renderer/features/chat/chat-store'

const NAV_ITEMS = [
  { to: '/chat', label: 'nav.chat', icon: MessagesSquare },
  { to: '/lexicon', label: 'nav.lexicon', icon: BookA },
  { to: '/srs', label: 'nav.srs', icon: GraduationCap },
  { to: '/reader', label: 'nav.reader', icon: BookOpen },
  { to: '/scenarios', label: 'nav.scenarios', icon: Clapperboard }
] as const

const SAVED_ITEMS = [
  { to: '/saved-words', label: 'nav.savedWords', icon: NotebookText },
  { to: '/saved-phrases', label: 'nav.savedPhrases', icon: Quote }
] as const

export function AppShell(): React.JSX.Element {
  const t = useT()
  const lang = useUiLanguage()
  const navigate = useNavigate()
  const initChat = useChatStore((s) => s.init)

  useEffect(() => {
    void initChat()
  }, [initChat])

  // Warm up audio early so the first save bleep doesn't jank the click path;
  // resume again on first gesture for autoplay-policy compliance.
  useEffect(() => {
    warmupAudio()
    window.addEventListener('pointerdown', warmupAudio, { once: true })
    return () => window.removeEventListener('pointerdown', warmupAudio)
  }, [])

  useEffect(() => {
    const off = getApi()?.reminders.onOpen(() => navigate('/srs'))
    return () => off?.()
  }, [navigate])

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = isRtl(lang) ? 'rtl' : 'ltr'
  }, [lang])

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Cobaltium</div>
            <div className="text-[11px] text-muted-foreground">{t('app.tagline')}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-tour={`nav.${to.slice(1)}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
                )
              }
            >
              <Icon className="size-4" />
              {t(label)}
            </NavLink>
          ))}
          <div className="mx-3 border-t border-border" role="separator" />
          {SAVED_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-tour={`nav.${to.slice(1)}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
                )
              }
            >
              <Icon className="size-4" />
              {t(label)}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 pb-2">
          <NavLink
            to="/settings"
            data-tour="nav.settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
              )
            }
          >
            <Settings className="size-4" />
            {t('nav.settings')}
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-header px-4">
          <div className="text-sm font-medium text-muted-foreground">{t('app.edition')}</div>
          <ThemePicker />
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>

        <StatusBar />
      </div>

      <OnboardingDialog />
      <GuidedTour />
      <EpubOpenHandler />
      <ReportDialog />
      <TtsErrorToast />
    </div>
  )
}
