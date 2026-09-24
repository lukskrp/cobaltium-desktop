import { useEffect } from 'react'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { ChatHeader } from './components/ChatHeader'
import { ChatToast } from './components/ChatToast'
import { ChatToolRail } from './components/ChatToolRail'
import { Composer } from './components/Composer'
import { MessageList } from './components/MessageList'
import { SessionSidebar } from './components/SessionSidebar'
import { VoicePanel } from './VoicePanel'
import { useChatStore } from './chat-store'
import { useChatToolbarStore } from './chat-toolbar-store'

export function ChatPage(): React.JSX.Element {
  // The composer is keyed per thread so its draft text reloads on switch.
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const chatMode = useSettingsStore((s) => s.settings.chatMode)
  const resetForThread = useChatToolbarStore((s) => s.resetForThread)

  // Clear tool modes/selection whenever the session changes.
  useEffect(() => {
    resetForThread()
  }, [activeThreadId, resetForThread])

  const showTools = chatMode !== 'conversation' && chatMode !== 'voice'

  return (
    <div className="flex h-full min-h-0">
      <SessionSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <ChatHeader />
        <div className="relative flex min-h-0 flex-1">
          <MessageList />
          {showTools && <ChatToolRail />}
        </div>
        {chatMode === 'voice' ? (
          <VoicePanel key={activeThreadId ?? 'none'} />
        ) : (
          <Composer key={activeThreadId ?? 'none'} />
        )}
        <ChatToast />
      </div>
    </div>
  )
}
