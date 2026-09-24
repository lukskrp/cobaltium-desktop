import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { getApi } from '@renderer/lib/ipc'
import { useT } from '@renderer/lib/i18n'
import { useChatStore } from '@renderer/features/chat/chat-store'

/** Full backup export/restore plus `cobaltium.chat` import (Android parity). */
export function BackupSection(): React.JSX.Element {
  const t = useT()
  const navigate = useNavigate()
  const selectThread = useChatStore((s) => s.selectThread)
  const [busy, setBusy] = useState<'export' | 'restore' | 'chat' | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  async function run(kind: 'export' | 'restore' | 'chat'): Promise<void> {
    setBusy(kind)
    setStatus(null)
    try {
      const api = getApi()
      if (!api) return
      if (kind === 'export') {
        const result = await api.data.exportBackup()
        setStatus(
          result.ok
            ? t('settings.backup.exportOk')
            : (result.error ?? t('settings.backup.exportFailed'))
        )
      } else if (kind === 'restore') {
        const result = await api.data.importBackup()
        setStatus(
          result.ok
            ? t('settings.backup.restoreOk')
            : (result.error ?? t('settings.backup.restoreFailed'))
        )
      } else {
        const result = await api.data.importChat()
        if (result.ok && result.threadId) {
          setStatus(t('settings.backup.importOk'))
          navigate('/chat')
          await selectThread(result.threadId)
        } else {
          setStatus(result.error ?? t('settings.backup.importFailed'))
        }
      }
    } finally {
      setBusy(null)
      setArmed(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('settings.backup.description')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={busy !== null} onClick={() => void run('export')}>
          {busy === 'export' ? t('settings.backup.working') : t('settings.backup.export')}
        </Button>
        <Button
          size="sm"
          variant={armed ? 'destructive' : 'outline'}
          disabled={busy !== null}
          onClick={() => {
            if (armed) {
              void run('restore')
            } else {
              setArmed(true)
              setStatus(t('settings.backup.restoreConfirm'))
              setTimeout(() => setArmed(false), 6000)
            }
          }}
        >
          {armed ? t('settings.backup.restoreConfirmButton') : t('settings.backup.restore')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run('chat')}>
          {busy === 'chat' ? t('settings.backup.working') : t('settings.backup.importChat')}
        </Button>
      </div>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  )
}
