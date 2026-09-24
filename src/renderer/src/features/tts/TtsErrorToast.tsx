import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useT } from '@renderer/lib/i18n'
import { useTtsErrorStore } from './tts-error-store'

/** Surfaces an offline-TTS failure (which otherwise silently downgrades to OS voices). */
export function TtsErrorToast(): React.JSX.Element | null {
  const t = useT()
  const message = useTtsErrorStore((s) => s.message)
  const tick = useTtsErrorStore((s) => s.tick)
  const dismiss = useTtsErrorStore((s) => s.dismiss)

  useEffect(() => {
    if (!message) return
    const id = setTimeout(dismiss, 8000)
    return () => clearTimeout(id)
  }, [message, tick, dismiss])

  if (!message) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-[80] flex max-w-[min(560px,90vw)] -translate-x-1/2 items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-xl">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{t('settings.tts.playbackFailed')}</div>
        <div className="mt-0.5 break-words text-muted-foreground">{message}</div>
      </div>
      <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
