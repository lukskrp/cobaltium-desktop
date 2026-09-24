import { useState } from 'react'
import { ArrowLeftRight, Download, Flag, Mic } from 'lucide-react'
import type { ChatMode } from '@shared/domain/enums'
import conversationIcon from '@renderer/assets/icons/ic_mode_conversation.png'
import correctiveIcon from '@renderer/assets/icons/ic_mode_corrective.png'
import immersiveIcon from '@renderer/assets/icons/ic_mode_immersive.png'
import reflectiveIcon from '@renderer/assets/icons/ic_mode_reflective.png'
import { Button } from '@renderer/components/ui/button'
import { LanguageSign } from '@renderer/components/LanguageSign'
import { cn } from '@renderer/lib/utils'
import { getApi } from '@renderer/lib/ipc'
import { useT } from '@renderer/lib/i18n'
import { resolveTargetLang, useChatStore } from '@renderer/features/chat/chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useReportStore } from '@renderer/features/report/report-store'
import { buildChatReport } from '@renderer/features/report/transcripts'
import { LanguageSelect } from './LanguageSelect'

const MODES: ChatMode[] = ['conversation', 'corrective', 'immersive', 'reflective', 'voice']

const MODE_ICON: Partial<Record<ChatMode, string>> = {
  conversation: conversationIcon,
  corrective: correctiveIcon,
  immersive: immersiveIcon,
  reflective: reflectiveIcon
}

export function ChatHeader(): React.JSX.Element {
  const t = useT()
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const threads = useChatStore((s) => s.threads)
  const setMode = useChatStore((s) => s.setMode)
  const renameThread = useChatStore((s) => s.renameThread)
  const settings = useSettingsStore((s) => s.settings)
  const patch = useSettingsStore((s) => s.patch)

  const thread = threads.find((t) => t.id === activeThreadId)
  const openReport = useReportStore((s) => s.open)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [exporting, setExporting] = useState(false)
  const editing = editingId !== null && editingId === activeThreadId

  function commitTitle(): void {
    setEditingId(null)
    if (activeThreadId && title.trim() !== '') void renameThread(activeThreadId, title.trim())
  }

  async function exportThread(): Promise<void> {
    if (!activeThreadId) return
    setExporting(true)
    try {
      await getApi()?.chat.exportThread(activeThreadId)
    } finally {
      setExporting(false)
    }
  }

  function flipLanguages(): void {
    const learn = settings.learnLang
    const helper = resolveTargetLang(settings.targetLang)
    void patch({ learnLang: helper, targetLang: learn })
  }

  return (
    <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border px-4 py-1.5">
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitTitle()
            if (event.key === 'Escape') setEditingId(null)
          }}
          className="min-w-0 flex-1 rounded border border-border bg-card px-2 py-1 text-sm text-foreground"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => {
            setTitle(thread?.title ?? '')
            setEditingId(activeThreadId ?? null)
          }}
          title={t('chat.renameHint')}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium"
        >
          {thread?.title || t('chat.newChat')}
        </button>
      )}

      <div
        data-tour="mode.group"
        className="flex max-w-full flex-wrap items-center gap-y-0.5 rounded-lg border border-border bg-card p-0.5"
      >
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            data-tour={`mode.${mode}`}
            onClick={() => void setMode(mode)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              settings.chatMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-[4px] bg-white/90">
              {MODE_ICON[mode] ? (
                <img src={MODE_ICON[mode]} alt="" aria-hidden draggable={false} className="size-4" />
              ) : (
                <Mic className="size-4 text-foreground" aria-hidden />
              )}
            </span>
            {t(`chat.mode.${mode}`)}
          </button>
        ))}
      </div>

      <Button
        size="icon"
        variant="ghost"
        title={t('chat.exportEpub')}
        disabled={!activeThreadId || exporting}
        onClick={() => void exportThread()}
      >
        <Download className="size-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        title={t('report.action')}
        onClick={() => {
          const draft = buildChatReport(t)
          if (draft) openReport(draft)
        }}
      >
        <Flag className="size-4" />
      </Button>

      <div data-tour="lang.pair" className="flex items-center gap-2">
        <LanguageSign kind="help" />
        <span data-tour="lang.helper" className="contents">
          <LanguageSelect
            value={settings.targetLang}
            includeAuto
            ariaLabel={t('settings.native')}
            onChange={(value) => void patch({ targetLang: value })}
          />
        </span>
        <span data-tour="lang.flip" className="contents">
          <Button
            size="icon"
            variant="ghost"
            title={t('chat.flipLanguages')}
            onClick={flipLanguages}
          >
            <ArrowLeftRight className="size-4" />
          </Button>
        </span>
        <span data-tour="lang.learn" className="contents">
          <LanguageSelect
            value={settings.learnLang}
            ariaLabel={t('settings.learning')}
            onChange={(value) => void patch({ learnLang: value })}
          />
        </span>
        <LanguageSign kind="learn" />
      </div>
    </header>
  )
}
