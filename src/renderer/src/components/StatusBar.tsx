import * as React from 'react'
import type { AppInfo, DbHealth } from '@shared/ipc'
import { getApi } from '@renderer/lib/ipc'

export function StatusBar(): React.JSX.Element {
  const [info, setInfo] = React.useState<AppInfo | null>(null)
  const [health, setHealth] = React.useState<DbHealth | null>(null)

  React.useEffect(() => {
    const api = getApi()
    if (!api) return
    void api.app.getInfo().then(setInfo).catch(() => undefined)
    void api.db.health().then(setHealth).catch(() => undefined)
  }, [])

  const dbLabel = health
    ? `DB ok · ${health.migrations} migration${health.migrations === 1 ? '' : 's'}`
    : 'DB…'

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-sidebar px-3 text-[11px] text-muted-foreground">
      <span className="truncate" title={health?.path}>
        {dbLabel}
      </span>
      <span className="truncate">
        {info ? `Cobaltium ${info.version} · Electron ${info.electron} · ${info.platform}/${info.arch}` : '…'}
      </span>
    </footer>
  )
}
