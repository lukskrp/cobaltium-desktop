import { useEffect, useState } from 'react'
import { getApi } from '@renderer/lib/ipc'
import { cn } from '@renderer/lib/utils'
import { useSettingsStore } from '@renderer/features/settings/settings-store'

/**
 * Renders a romanized line under text written in a non-Latin script, when the
 * "show transliteration" setting is on. Nothing is shown for Latin scripts —
 * the language engine returns null when romanization would not change the text.
 */
export function TransliterationLine({
  text,
  lang,
  className
}: {
  text: string
  lang: string
  className?: string
}): React.JSX.Element | null {
  const enabled = useSettingsStore((s) => s.settings.transliterationEnabled)
  const requestKey = `${lang}\u0000${text}`
  const [result, setResult] = useState<{ key: string; value: string | null }>({
    key: '',
    value: null
  })

  useEffect(() => {
    if (!enabled || text.trim() === '') return
    let active = true
    void getApi()
      ?.lang.romanize(text, lang)
      .then((value) => {
        if (active) setResult({ key: requestKey, value })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [enabled, lang, text, requestKey])

  if (!enabled || !result.value || result.key !== requestKey) return null
  return <span className={cn('block text-xs text-muted-foreground', className)}>{result.value}</span>
}
