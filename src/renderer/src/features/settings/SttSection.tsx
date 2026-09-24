import { useEffect } from 'react'
import { STT_MODELS } from '@shared/stt/catalog'
import { Button } from '@renderer/components/ui/button'
import { useT } from '@renderer/lib/i18n'
import { useSettingsStore } from './settings-store'
import { useSttStore } from './stt-store'

/** Offline speech-recognition model manager (download/remove per model). */
export function SttSection(): React.JSX.Element | null {
  const t = useT()
  const settings = useSettingsStore((s) => s.settings)
  const patch = useSettingsStore((s) => s.patch)
  const status = useSttStore((s) => s.status)
  const busy = useSttStore((s) => s.busy)
  const progress = useSttStore((s) => s.progress)
  const load = useSttStore((s) => s.load)
  const provision = useSttStore((s) => s.provision)
  const remove = useSttStore((s) => s.remove)

  useEffect(() => {
    void load()
  }, [load])

  if (!status) return null
  const active = STT_MODELS.find((entry) => entry.id === settings.sttModel) ?? STT_MODELS[1]
  const downloading = busy && progress && progress.phase !== 'done' && progress.phase !== 'error'
  const percent =
    downloading && progress.total > 0 ? Math.round((progress.received / progress.total) * 100) : 0

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('settings.stt.description')}</p>
      {!status.serverAvailable && (
        <p className="text-xs text-destructive">{t('settings.stt.engineMissing')}</p>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t('settings.stt.model')}</span>
        <select
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
          value={settings.sttModel}
          onChange={(event) => void patch({ sttModel: event.target.value })}
        >
          {STT_MODELS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} · {t('settings.stt.sizeMb', Math.round(entry.bytes / 1_000_000))}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{active.label}</div>
          <div className="truncate text-xs text-muted-foreground">
            {status.provisioned
              ? t('settings.stt.installedMb', Math.round(status.bytes / 1_000_000))
              : t('settings.stt.notInstalled')}
          </div>
          {downloading && (
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
        {status.provisioned ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void remove(active.id)}>
            {t('settings.stt.remove')}
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => void provision(active.id)}>
            {downloading ? t('settings.stt.downloading', percent) : t('settings.stt.download')}
          </Button>
        )}
      </div>
    </div>
  )
}
