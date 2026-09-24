import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { buildReport } from '@shared/domain/report'
import { Button } from '@renderer/components/ui/button'
import { getApi } from '@renderer/lib/ipc'
import { useT } from '@renderer/lib/i18n'
import { useReportStore } from '@renderer/features/report/report-store'

/** Confirmation before sending a content report (port of Android's
 *  `ReportConfirmDialog`). Rendered once at AppShell level. */
export function ReportDialog(): React.JSX.Element | null {
  const t = useT()
  const draft = useReportStore((s) => s.draft)
  const close = useReportStore((s) => s.close)
  const [sending, setSending] = useState(false)

  if (!draft) return null
  const { subject, lines } = draft

  async function confirm(): Promise<void> {
    setSending(true)
    try {
      await getApi()?.safety.report(subject, buildReport(subject, lines))
    } finally {
      setSending(false)
      close()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={t('report.confirmTitle')}
      >
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-5 text-destructive" />
          <h2 className="text-sm font-semibold">{t('report.confirmTitle')}</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t('report.confirmMessage')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={sending}>
            {t('report.cancel')}
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={sending}>
            {t('report.send')}
          </Button>
        </div>
      </div>
    </div>
  )
}
