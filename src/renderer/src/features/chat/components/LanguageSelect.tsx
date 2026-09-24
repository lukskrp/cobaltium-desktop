import { coreLanguages } from '@shared/domain/languages'
import { cn } from '@renderer/lib/utils'
import { useT } from '@renderer/lib/i18n'

/**
 * Language picker. Labels use the localized language names from the active UI
 * language's locale (e.g. "Deutsch"), falling back to the shared English name.
 */
export function LanguageSelect({
  value,
  onChange,
  includeAuto = false,
  className,
  ariaLabel
}: {
  value: string
  onChange: (value: string) => void
  includeAuto?: boolean
  className?: string
  ariaLabel?: string
}): React.JSX.Element {
  const t = useT()

  function label(code: string, fallback: string): string {
    const direct = t(`lang.${code}`)
    if (direct !== `lang.${code}`) return direct
    if (code === 'pt-br') {
      const pt = t('lang.pt')
      if (pt !== 'lang.pt') return pt
    }
    return fallback
  }

  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {includeAuto && <option value="auto">{t('common.auto')}</option>}
      {coreLanguages().map((language) => (
        <option key={language.code} value={language.code}>
          {label(language.code, language.name)}
        </option>
      ))}
    </select>
  )
}
