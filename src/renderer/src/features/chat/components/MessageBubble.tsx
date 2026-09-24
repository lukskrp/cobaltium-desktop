import { useMemo, useState } from 'react'
import { BookOpen, Bookmark, Copy, Highlighter, Volume2, X } from 'lucide-react'
import type { Message } from '@shared/domain/models'
import { filterGlossMap } from '@shared/domain/translation'
import { contentDir } from '@shared/domain/text-direction'
import { lookupGloss } from '@shared/lang/hebrew'
import { cn } from '@renderer/lib/utils'
import { useT } from '@renderer/lib/i18n'
import { resolveTargetLang } from '@renderer/features/chat/chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'
import { glossaryKey, useChatToolbarStore } from '../chat-toolbar-store'
import { useChatStore } from '../chat-store'
import { GlossableText } from './GlossableText'
import { Markdown } from './Markdown'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolButton } from './ToolButton'
import { TtsLoadingDots } from './TtsLoadingDots'
import { WordGlossaryPopup } from './WordGlossaryPopup'

export function MessageBubble({ message }: { message: Message }): React.JSX.Element {
  const t = useT()
  const isUser = message.role === 'user'
  const learn = useSettingsStore((s) => s.settings.learnLang)
  const helper = resolveTargetLang(useSettingsStore((s) => s.settings.targetLang))
  const addPhrase = useLexiconStore((s) => s.addPhrase)

  const selectMode = useChatToolbarStore((s) => s.selectMode)
  const glossaryMode = useChatToolbarStore((s) => s.glossaryMode)
  const granularSave = useChatToolbarStore((s) => s.granularSave)
  const selection = useChatToolbarStore((s) => (s.selection?.messageId === message.id ? s.selection : null))
  const glossaryTarget = useChatToolbarStore((s) =>
    s.glossaryTarget?.messageId === message.id ? s.glossaryTarget : null
  )
  const toggleSelectMode = useChatToolbarStore((s) => s.toggleSelectMode)
  const toggleSelection = useChatToolbarStore((s) => s.toggleSelection)
  const clearSelection = useChatToolbarStore((s) => s.clearSelection)
  const saveSelection = useChatToolbarStore((s) => s.saveSelection)
  const saveGranular = useChatToolbarStore((s) => s.saveGranular)
  const openGlossary = useChatToolbarStore((s) => s.openGlossary)
  const closeGlossary = useChatToolbarStore((s) => s.closeGlossary)
  const analysis = useChatToolbarStore((s) =>
    s.glossaryTarget
      ? (s.glossaryCache[glossaryKey(s.glossaryTarget.word, s.glossaryTarget.lang)] ?? null)
      : null
  )
  const generating = useChatToolbarStore((s) =>
    s.glossaryTarget ? !!s.glossaryGenerating[glossaryKey(s.glossaryTarget.word, s.glossaryTarget.lang)] : false
  )

  const [study, setStudy] = useState(isUser)
  const [popover, setPopover] = useState<{ word: string; x: number; y: number } | null>(null)
  const [savedPhrase, setSavedPhrase] = useState(false)

  const selectedIndices = selection?.words.map((entry) => entry.index) ?? []
  const selectedText = [...(selection?.words ?? [])]
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.text)
    .join(' ')

  const filteredGlossMap = useMemo(() => {
    const map = message.immersive?.glossMap
    const source = message.immersive?.sourceText
    if (!map || !source) return {} as Record<string, string>
    return filterGlossMap(source, map)
  }, [message.immersive])

  function glossFor(word: string): string {
    return lookupGloss(filteredGlossMap, word, learn) ?? ''
  }

  function onWordClick(word: string, index: number, event: React.MouseEvent): void {
    event.stopPropagation()
    if (glossaryMode) {
      openGlossary({ messageId: message.id, index, word, lang: learn, x: event.clientX, y: event.clientY })
      return
    }
    if (granularSave) {
      void saveGranular(word, learn, glossFor(word))
      return
    }
    if (selectMode) {
      toggleSelection(message.id, learn, message.content, index, word)
      return
    }
    setPopover({ word, x: event.clientX, y: event.clientY })
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  async function saveMessage(): Promise<void> {
    if ((selection?.words.length ?? 0) > 0) {
      const single = selection?.words.length === 1 ? glossFor(selectedText) : undefined
      await saveSelection(single)
      return
    }
    const phrase = message.content.trim()
    if (phrase === '') return
    await addPhrase({ phrase, lang: learn, translation: '' })
    setSavedPhrase(true)
    setTimeout(() => setSavedPhrase(false), 1500)
  }

  const speakMessageAction = useChatStore((s) => s.speakMessage)
  const speaking = useChatStore((s) => s.speakingMessageId === message.id)
  const thinking = useChatStore((s) => s.messageThinking[message.id] ?? null)
  const thinkingOpen = useChatStore((s) => !!s.expandedThinking[message.id])
  const toggleThinking = useChatStore((s) => s.toggleThinking)

  async function speakMessage(): Promise<void> {
    await speakMessageAction(message.id, selectedText || message.content, learn)
  }

  const active = popover ?? glossaryTarget

  return (
    <div className={cn('group flex w-full flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'mb-1 flex items-center gap-0.5 transition-opacity',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {speaking && <TtsLoadingDots />}
          <ToolButton title={t('chat.copyMessage')} onClick={() => void copy()}>
            <Copy className="size-3.5" />
          </ToolButton>
          <ToolButton title={t('chat.saveMessage')} onClick={() => void saveMessage()}>
            <Bookmark className="size-3.5" />
          </ToolButton>
          <ToolButton title={t('common.speak')} disabled={speaking} onClick={() => void speakMessage()}>
            <Volume2 className="size-3.5" />
          </ToolButton>
          <ToolButton title={t('chat.selectWords')} active={selectMode} onClick={toggleSelectMode}>
            <Highlighter className="size-3.5" />
          </ToolButton>
          {selectedIndices.length > 0 && (
            <ToolButton title={t('chat.clearSelection')} onClick={clearSelection}>
              <X className="size-3.5" />
            </ToolButton>
          )}
          {!isUser && (
            <ToolButton
              title={study ? t('chat.rich') : t('chat.study')}
              active={study}
              onClick={() => setStudy((value) => !value)}
            >
              <BookOpen className="size-3.5" />
            </ToolButton>
          )}
        </div>
        {selectedIndices.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {t('chat.selectedCount', selectedIndices.length)}
          </span>
        )}
        {savedPhrase && <span className="text-[10px] text-muted-foreground">{t('reader.saved')}</span>}
      </div>

      <div
        className={cn(
          'max-w-[min(720px,85%)] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
          isUser
            ? 'bg-user-msg text-user-msg-foreground'
            : 'border border-border bg-assistant-msg text-assistant-msg-foreground'
        )}
        dir={contentDir(learn)}
      >
        {thinking && (
          <ThinkingBlock
            thinking={thinking}
            expanded={thinkingOpen}
            live={false}
            onToggle={() => toggleThinking(message.id)}
          />
        )}
        {isUser || study ? (
          <GlossableText
            text={message.content}
            lang={learn}
            selected={selectedIndices}
            glossaryTargetIndex={glossaryTarget?.index}
            onWordClick={onWordClick}
          />
        ) : (
          <Markdown source={message.content} />
        )}
      </div>

      {active && (
        <WordGlossaryPopup
          key={glossaryTarget ? `${glossaryTarget.word}:${glossaryTarget.index}` : popover?.word}
          word={glossaryTarget?.word ?? popover?.word ?? ''}
          lang={learn}
          otherLang={helper}
          x={glossaryTarget?.x ?? popover?.x ?? 0}
          y={glossaryTarget?.y ?? popover?.y ?? 0}
          analysis={glossaryTarget ? analysis : null}
          generating={glossaryTarget ? generating : false}
          onClose={() => {
            setPopover(null)
            closeGlossary()
          }}
        />
      )}
    </div>
  )
}
