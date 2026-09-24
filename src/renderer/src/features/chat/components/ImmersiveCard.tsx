import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Copy, RefreshCw, Volume2 } from 'lucide-react'
import { Languages } from '@shared/domain/languages'
import { orientPhrasePair } from '@shared/domain/phrase-pair'
import type { Message } from '@shared/domain/models'
import { filterGlossMap } from '@shared/domain/translation'
import { contentDir } from '@shared/domain/text-direction'
import { lookupGloss } from '@shared/lang/hebrew'
import { TransliterationLine } from '@renderer/components/TransliterationLine'
import { useT } from '@renderer/lib/i18n'
import { resolveTargetLang, useChatStore } from '@renderer/features/chat/chat-store'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { glossaryKey, useChatToolbarStore } from '../chat-toolbar-store'
import { GlossableText } from './GlossableText'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolButton } from './ToolButton'
import { TtsLoadingDots } from './TtsLoadingDots'
import { WordGlossaryPopup } from './WordGlossaryPopup'

/**
 * Flip card for the immersive/reflective modes: the front shows the translated
 * face (or the original until translation arrives), the back shows the source.
 * Words are glossable/selectable and the card carries the per-message actions.
 */
export function ImmersiveCard({ message }: { message: Message }): React.JSX.Element {
  const t = useT()
  const translateMessage = useChatStore((s) => s.translateMessage)
  const translating = useChatStore((s) => !!s.translating[message.id])
  const chatMode = useSettingsStore((s) => s.settings.chatMode)
  const learn = useSettingsStore((s) => s.settings.learnLang)
  const helper = resolveTargetLang(useSettingsStore((s) => s.settings.targetLang))
  const addPhrasePair = useLexiconStore((s) => s.addPhrasePair)

  const selectMode = useChatToolbarStore((s) => s.selectMode)
  const glossaryMode = useChatToolbarStore((s) => s.glossaryMode)
  const granularSave = useChatToolbarStore((s) => s.granularSave)
  const selection = useChatToolbarStore((s) => (s.selection?.messageId === message.id ? s.selection : null))
  const glossaryTarget = useChatToolbarStore((s) =>
    s.glossaryTarget?.messageId === message.id ? s.glossaryTarget : null
  )
  const toggleSelection = useChatToolbarStore((s) => s.toggleSelection)
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

  const [flipped, setFlipped] = useState(false)
  const [savedPhrase, setSavedPhrase] = useState(false)
  const [popover, setPopover] = useState<{ word: string; x: number; y: number } | null>(null)
  const data = message.immersive

  useEffect(() => {
    if (!data) void translateMessage(message)
    // Re-run only when the message id or its cached translation changes.
  }, [message.id, data, translateMessage, message])

  const frontName = chatMode === 'reflective' ? learn : helper
  const backName = learn
  // Language of the untranslated message content (translation maps foreign->native).
  const originalLang = chatMode === 'reflective' ? helper : learn
  const selectedIndices = selection?.words.map((entry) => entry.index) ?? []

  const filteredGlossMap = useMemo(() => {
    if (!data?.glossMap || !data.sourceText) return {} as Record<string, string>
    return filterGlossMap(data.sourceText, data.glossMap)
  }, [data])

  function glossFor(word: string, lang: string): string {
    return lookupGloss(filteredGlossMap, word, lang) ?? ''
  }

  function wordHandler(lang: string, sourceText: string) {
    return (word: string, index: number, event: React.MouseEvent): void => {
      event.stopPropagation()
      if (glossaryMode) {
        openGlossary({ messageId: message.id, index, word, lang, x: event.clientX, y: event.clientY })
        return
      }
      if (granularSave) {
        void saveGranular(word, lang, glossFor(word, lang))
        return
      }
      if (selectMode) {
        toggleSelection(message.id, lang, sourceText, index, word)
        return
      }
      setPopover({ word, x: event.clientX, y: event.clientY })
    }
  }

  async function copyFace(): Promise<void> {
    const text = flipped ? message.content : (data?.sourceText ?? message.content)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  const speakMessage = useChatStore((s) => s.speakMessage)
  const speaking = useChatStore((s) => s.speakingMessageId === message.id)
  const thinking = useChatStore((s) => s.messageThinking[message.id] ?? null)
  const thinkingOpen = useChatStore((s) => !!s.expandedThinking[message.id])
  const toggleThinking = useChatStore((s) => s.toggleThinking)

  async function speakFace(): Promise<void> {
    // Speak the language that is actually face-up: the back face is the original
    // text; the front is the translation once it arrives, otherwise the original.
    if (flipped) {
      await speakMessage(message.id, message.content, originalLang)
      return
    }
    if (data) {
      await speakMessage(message.id, data.sourceText, frontName)
      return
    }
    await speakMessage(message.id, message.content, originalLang)
  }

  async function savePhrase(): Promise<void> {
    // Save both faces as a phrase pair (port of Android saveMessageAsPhrase):
    // source side tagged with the pair, plus the flip-direction entry so SRS
    // decks can quiz either way.
    const oriented = orientPhrasePair({
      front: data?.sourceText ?? message.content,
      back: message.content,
      frontFaceLang: frontName,
      learn,
      helper,
      originalLang
    })
    // Without a translation yet there is no target side to store.
    const targetText = data ? oriented.targetText : ''
    if (oriented.sourceText === '' && targetText === '') return
    await addPhrasePair({
      phrase: oriented.sourceText,
      lang: oriented.tag,
      translation: targetText,
      translationLang: oriented.translationLang
    })
    setSavedPhrase(true)
    setTimeout(() => setSavedPhrase(false), 1500)
  }

  const active = popover ?? glossaryTarget

  return (
    <div className="group w-full max-w-[min(720px,85%)] self-start">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {flipped
            ? t('chat.originalLabel', Languages.name(backName))
            : t('chat.translationLabel', Languages.name(frontName))}
        </span>
        <div className="flex items-center gap-0.5">
          {savedPhrase && <span className="text-[10px] text-muted-foreground">{t('reader.saved')}</span>}
          {speaking && <TtsLoadingDots />}
          <ToolButton title={t('chat.flip')} onClick={() => setFlipped((value) => !value)}>
            <RefreshCw className="size-3.5" />
          </ToolButton>
          <ToolButton title={t('chat.saveMessage')} onClick={() => void savePhrase()}>
            <Bookmark className="size-3.5" />
          </ToolButton>
          <ToolButton title={t('common.speak')} disabled={speaking} onClick={() => void speakFace()}>
            <Volume2 className="size-3.5" />
          </ToolButton>
          <ToolButton title={t('chat.copyMessage')} onClick={() => void copyFace()}>
            <Copy className="size-3.5" />
          </ToolButton>
        </div>
      </div>

      {thinking && (
        <div className="mb-1.5" dir={contentDir(frontName)}>
          <ThinkingBlock
            thinking={thinking}
            expanded={thinkingOpen}
            live={false}
            onToggle={() => toggleThinking(message.id)}
          />
        </div>
      )}

      <div className="flip-scene">
        <div className="flip-card min-h-[60px]" data-flipped={flipped}>
          <div
            className="flip-face rounded-2xl border border-border bg-assistant-msg px-4 py-3 text-sm text-assistant-msg-foreground shadow-sm"
            dir={contentDir(frontName)}
          >
            {data ? (
              <>
                <GlossableText
                  text={data.sourceText}
                  lang={frontName}
                  selected={selectedIndices}
                  glossaryTargetIndex={glossaryTarget?.index}
                  onWordClick={wordHandler(frontName, data.sourceText)}
                />
                {chatMode === 'reflective' && (
                  <TransliterationLine text={data.sourceText} lang={learn} className="mt-1" />
                )}
              </>
            ) : translating ? (
              <p className="text-muted-foreground">{t('chat.translating')}</p>
            ) : (
              <GlossableText
                text={message.content}
                lang={learn}
                selected={selectedIndices}
                glossaryTargetIndex={glossaryTarget?.index}
                onWordClick={wordHandler(learn, message.content)}
              />
            )}
          </div>
          <div
            className="flip-face flip-face-back rounded-2xl border border-border bg-assistant-msg px-4 py-3 text-sm text-assistant-msg-foreground shadow-sm"
            dir={contentDir(learn)}
          >
            <GlossableText
              text={message.content}
              lang={learn}
              selected={selectedIndices}
              glossaryTargetIndex={glossaryTarget?.index}
              onWordClick={wordHandler(learn, message.content)}
            />
            <TransliterationLine text={message.content} lang={learn} className="mt-1" />
          </div>
        </div>
      </div>

      {active && (
        <WordGlossaryPopup
          key={glossaryTarget ? `${glossaryTarget.word}:${glossaryTarget.index}` : popover?.word}
          word={glossaryTarget?.word ?? popover?.word ?? ''}
          lang={glossaryTarget?.lang ?? learn}
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
