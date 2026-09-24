import { useState } from 'react'
import { Star, Trash2 } from 'lucide-react'
import newChatIcon from '@renderer/assets/icons/new_chat_icon.png'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useT } from '@renderer/lib/i18n'
import { useChatStore } from '@renderer/features/chat/chat-store'

export function SessionSidebar(): React.JSX.Element {
  const t = useT()
  const threads = useChatStore((s) => s.threads)
  const messageCounts = useChatStore((s) => s.messageCounts)
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const selectThread = useChatStore((s) => s.selectThread)
  const newThread = useChatStore((s) => s.newThread)
  const deleteThread = useChatStore((s) => s.deleteThread)
  const toggleStarred = useChatStore((s) => s.toggleStarred)
  const renameThread = useChatStore((s) => s.renameThread)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const sessions = threads
    .filter((thread) => (messageCounts[thread.id] ?? 0) > 0 || thread.draft.trim() !== '')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  function commitRename(id: string): void {
    const value = editValue.trim()
    setEditingId(null)
    if (value !== '') void renameThread(id, value)
  }

  return (
    <aside data-tour="sess.list" className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center justify-between px-3">
        <span className="text-sm font-semibold">{t('chat.sessions')}</span>
        <Button size="icon" variant="ghost" data-tour="sess.new" title={t('chat.newSession')} onClick={() => void newThread()}>
          <img src={newChatIcon} alt="" aria-hidden draggable={false} className="size-5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">{t('chat.noSessions')}</p>
        )}

        {sessions.map((thread) => {
          const count = messageCounts[thread.id] ?? 0
          const isDraft = count === 0 && thread.draft.trim() !== ''
          const isActive = thread.id === activeThreadId
          return (
            <div
              key={thread.id}
              className={cn(
                'group mb-0.5 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => void selectThread(thread.id)}
                onDoubleClick={() => {
                  setEditingId(thread.id)
                  setEditValue(thread.title)
                }}
              >
                {editingId === thread.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    onBlur={() => commitRename(thread.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename(thread.id)
                      if (event.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full rounded border border-border bg-card px-1 py-0.5 text-xs text-foreground"
                  />
                ) : (
                  <div className="flex items-center gap-1.5">
                    {thread.starred && <Star className="size-3 shrink-0 fill-current text-amber-400" />}
                    <span className="truncate">{thread.title || t('chat.newChat')}</span>
                    {isDraft && (
                      <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                        {t('chat.draft')}
                      </span>
                    )}
                  </div>
                )}
              </button>

              <button
                type="button"
                title="Star"
                onClick={() => void toggleStarred(thread.id)}
                className="hidden shrink-0 rounded p-0.5 hover:bg-accent group-hover:block"
              >
                <Star className="size-3.5" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => void deleteThread(thread.id)}
                className="hidden shrink-0 rounded p-0.5 text-destructive hover:bg-accent group-hover:block"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
