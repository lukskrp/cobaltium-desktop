import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@renderer/features/chat/chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useT } from '@renderer/lib/i18n'
import { ImmersiveCard } from './ImmersiveCard'
import { Markdown } from './Markdown'
import { MessageBubble } from './MessageBubble'
import { ThinkingBlock } from './ThinkingBlock'

export function MessageList(): React.JSX.Element {
  const t = useT()
  const messages = useChatStore((s) => s.messages)
  const isGenerating = useChatStore((s) => s.isGenerating)
  const streamingText = useChatStore((s) => s.streamingText)
  const generatingThreadId = useChatStore((s) => s.generatingThreadId)
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const error = useChatStore((s) => s.error)
  const dismissError = useChatStore((s) => s.dismissError)
  const chatMode = useSettingsStore((s) => s.settings.chatMode)
  const streamingThinking = useChatStore((s) => s.streamingThinking)
  const [liveOpen, setLiveOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, streamingText, error])

  const useCard = chatMode === 'immersive' || chatMode === 'reflective'
  const showTools = chatMode !== 'conversation' && chatMode !== 'voice'
  const streamingHere = isGenerating && generatingThreadId === activeThreadId
  const hasContent = messages.length > 0 || streamingHere

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={
          showTools
            ? 'mx-auto flex w-full max-w-3xl flex-col gap-4 py-6 pl-16 pr-6'
            : 'mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6'
        }
      >
        {!hasContent && (
          <div className="m-auto max-w-md py-16 text-center text-sm text-muted-foreground">
            {t('chat.empty')}
          </div>
        )}

        {messages.map((message) =>
          useCard ? (
            <ImmersiveCard key={message.id} message={message} />
          ) : (
            <MessageBubble key={message.id} message={message} />
          )
        )}

        {streamingHere && (
          <div className="flex w-full justify-start">
            <div className="max-w-[min(720px,85%)] rounded-2xl border border-border bg-assistant-msg px-4 py-2.5 text-sm text-assistant-msg-foreground shadow-sm">
              {streamingThinking && (
                <ThinkingBlock
                  key={`${generatingThreadId}:${messages.length}`}
                  thinking={streamingThinking}
                  expanded={liveOpen}
                  live
                  onToggle={() => setLiveOpen((value) => !value)}
                />
              )}
              {streamingText ? (
                <Markdown source={streamingText} />
              ) : (
                <span className="inline-flex gap-1 text-muted-foreground">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:150ms]">●</span>
                  <span className="animate-bounce [animation-delay:300ms]">●</span>
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto flex w-full items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <button type="button" onClick={dismissError} className="font-medium hover:underline">
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
