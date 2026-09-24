import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/ipc'
import { Button } from '@renderer/components/ui/button'
import { getApi } from '@renderer/lib/ipc'
import { useT } from '@renderer/lib/i18n'
import { useSettingsStore } from '@renderer/features/settings/settings-store'

const selectClass =
  'h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Auto-update controls for the Settings page (no-op in development builds). */
export function UpdateSection(): React.JSX.Element {
  const t = useT()
  const channel = useSettingsStore((s) => s.settings.updateChannel)
  const patch = useSettingsStore((s) => s.patch)
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const api = getApi()
    if (!api) return
    return api.update.onStatus(setStatus)
  }, [])

  async function check(): Promise<void> {
    setBusy(true)
    try {
      await getApi()?.update.check()
    } finally {
      setBusy(false)
    }
  }

  function describe(current: UpdateStatus | null): string | null {
    switch (current?.state) {
      case 'checking':
        return t('settings.update.checking')
      case 'available':
        return t('settings.update.available', current.version ?? '')
      case 'downloading':
        return t('settings.update.downloading', current.percent ?? 0)
      case 'downloaded':
        return t('settings.update.downloaded', current.version ?? '')
      case 'none':
        return t('settings.update.upToDate')
      case 'error':
        return t('settings.update.error')
      default:
        return null
    }
  }

  const label = describe(status)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t('settings.update.channel')}</span>
        <select
          className={selectClass}
          value={channel}
          onChange={(event) => void patch({ updateChannel: event.target.value })}
        >
          <option value="stable">{t('settings.update.stable')}</option>
          <option value="beta">{t('settings.update.beta')}</option>
          <option value="alpha">{t('settings.update.alpha')}</option>
        </select>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void check()}>
          {t('settings.update.check')}
        </Button>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        {status?.state === 'downloaded' && (
          <Button size="sm" onClick={() => void getApi()?.update.install()}>
            {t('settings.update.install')}
          </Button>
        )}
      </div>
    </div>
  )
}
