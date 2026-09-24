import { useT } from '@renderer/lib/i18n'
import { useChatToolbarStore } from '../chat-toolbar-store'

/**
 * Transient save toast. Success replays the animation on every save (fades
 * upward and out); a save failure shows a persistent error instead so a
 * failed save can never look successful.
 */
export function ChatToast(): React.JSX.Element | null {
  const t = useT()
  const tick = useChatToolbarStore((s) => s.toastTick)
  const saveError = useChatToolbarStore((s) => s.saveError)
  if (saveError) {
    return (
      <div className="pointer-events-none absolute bottom-24 left-1/2 z-40 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive shadow-lg">
        {t('chat.saveFailed')}
      </div>
    )
  }
  if (tick === 0) return null
  return (
    <div
      key={tick}
      className="animate-save-toast pointer-events-none absolute bottom-24 left-1/2 z-40 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-lg"
    >
      {t('chat.saveSuccessful')}
    </div>
  )
}
