import { useEffect, useState } from 'react'
import { ttsSampleWord } from '@shared/tts/catalog'
import { Button } from '@renderer/components/ui/button'
import { speakDetailed } from '@renderer/lib/tts'
import { useT } from '@renderer/lib/i18n'
import { useTtsStore } from './tts-store'

/** Offline voice pack manager (download/remove/test per language). */
export function TtsSection(): React.JSX.Element | null {
  const t = useT()
  const status = useTtsStore((s) => s.status)
  const busy = useTtsStore((s) => s.busy)
  const progress = useTtsStore((s) => s.progress)
  const load = useTtsStore((s) => s.load)
  const provision = useTtsStore((s) => s.provision)
  const remove = useTtsStore((s) => s.remove)
  const [test, setTest] = useState<Record<string, 'busy' | 'ok' | 'fallback'>>({})

  useEffect(() => {
    void load()
  }, [load])

  async function runTest(lang: string): Promise<void> {
    setTest((state) => ({ ...state, [lang]: 'busy' }))
    const result = await speakDetailed(ttsSampleWord(lang), lang)
    setTest((state) => ({ ...state, [lang]: result.source === 'offline' ? 'ok' : 'fallback' }))
  }

  if (!status) return null

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('settings.tts.description')}</p>
      {!status.espeakAvailable && (
        <p className="text-xs text-destructive">{t('settings.tts.engineMissing')}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        {status.languages.map((entry) => {
          const isBusy = !!busy[entry.lang]
          const item = progress[entry.lang]
          const percent =
            item && item.total > 0 && item.phase !== 'done'
              ? Math.round((item.received / item.total) * 100)
              : 0
          return (
            <div
              key={entry.lang}
              className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{entry.label}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {entry.lang.toUpperCase()} · {entry.license}
                </div>
              </div>

              {entry.provisioned ? (
                <>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t('settings.tts.sizeMb', Math.round(entry.bytes / 1_000_000))}
                  </span>
                  {test[entry.lang] === 'ok' && (
                    <span className="shrink-0 text-xs text-success">{t('settings.tts.testOk')}</span>
                  )}
                  {test[entry.lang] === 'fallback' && (
                    <span className="shrink-0 text-xs text-warning">
                      {t('settings.tts.testFallback')}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={test[entry.lang] === 'busy'}
                    onClick={() => void runTest(entry.lang)}
                  >
                    {test[entry.lang] === 'busy' ? t('settings.tts.testing') : t('settings.tts.test')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void remove(entry.lang)}
                  >
                    {t('settings.tts.remove')}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={isBusy || !status.espeakAvailable}
                  onClick={() => void provision(entry.lang)}
                >
                  {isBusy
                    ? percent > 0
                      ? `${t('settings.tts.downloading')} ${percent}%`
                      : t('settings.tts.downloading')
                    : t('settings.tts.download')}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">{t('settings.tts.license')}</p>
    </div>
  )
}
