import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Flag, Highlighter, Languages as LanguagesIcon, Save, Trash2, Volume2, X } from 'lucide-react'
import { createCjkTokenizer, KoreanTokenizer, WhitespaceTokenizer } from '@shared/lang/tokenizers'
import { contentDir } from '@shared/domain/text-direction'
import { readerDraftOverflow } from '@shared/epub'
import { Button } from '@renderer/components/ui/button'
import { LanguageSign } from '@renderer/components/LanguageSign'
import { TransliterationLine } from '@renderer/components/TransliterationLine'
import { cn } from '@renderer/lib/utils'
import { getApi } from '@renderer/lib/ipc'
import { speak } from '@renderer/lib/tts'
import { useT } from '@renderer/lib/i18n'
import { resolveTargetLang } from '@renderer/features/chat/chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'
import { LanguageSelect } from '@renderer/features/chat/components/LanguageSelect'
import { useReportStore } from '@renderer/features/report/report-store'
import { buildReaderReport } from '@renderer/features/report/transcripts'
import { useReaderStore } from './reader-store'

interface WordPopoverState {
  text: string
  x: number
  y: number
}

interface PickedWord {
  block: number
  token: number
  text: string
}

function tokenize(text: string, lang: string): { text: string; word: boolean }[] {
  const normalized = lang.toLowerCase()
  const tokenizer =
    normalized === 'zh' || normalized === 'ja'
      ? createCjkTokenizer()
      : normalized === 'ko'
        ? KoreanTokenizer
        : WhitespaceTokenizer
  return tokenizer.segment(text).map((segment) => ({ text: segment.text, word: segment.word }))
}

export function ReaderPage(): React.JSX.Element {
  const t = useT()
  const load = useReaderStore((s) => s.load)
  const loaded = useReaderStore((s) => s.loaded)
  const library = useReaderStore((s) => s.library)
  const book = useReaderStore((s) => s.book)
  const state = useReaderStore((s) => s.state)
  const busy = useReaderStore((s) => s.busy)
  const error = useReaderStore((s) => s.error)
  const open = useReaderStore((s) => s.open)
  const openBook = useReaderStore((s) => s.openBook)
  const deleteBook = useReaderStore((s) => s.deleteBook)
  const exportBook = useReaderStore((s) => s.exportBook)
  const closeBook = useReaderStore((s) => s.closeBook)
  const setPosition = useReaderStore((s) => s.setPosition)
  const setLanguages = useReaderStore((s) => s.setLanguages)
  const setBlockText = useReaderStore((s) => s.setBlockText)
  const saveNow = useReaderStore((s) => s.saveNow)
  const clearDraft = useReaderStore((s) => s.clearDraft)
  const addWord = useLexiconStore((s) => s.addWord)
  const addPhrase = useLexiconStore((s) => s.addPhrase)
  const openReport = useReportStore((s) => s.open)

  const settings = useSettingsStore((s) => s.settings)
  const [editing, setEditing] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [picked, setPicked] = useState<PickedWord[]>([])
  const [popover, setPopover] = useState<WordPopoverState | null>(null)
  const [gloss, setGloss] = useState<string | null>(null)
  const [loadingGloss, setLoadingGloss] = useState(false)
  const [saved, setSaved] = useState(false)
  const [glosses, setGlosses] = useState<Record<number, string>>({})
  const [glossing, setGlossing] = useState(false)
  const [draftDismissed, setDraftDismissed] = useState(false)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  const chapterIndex = Math.min(state.currentChapterIndex, (book?.chapters.length ?? 1) - 1)
  const chapter = book?.chapters[chapterIndex] ?? null
  const source = state.sourceLang !== 'auto' ? state.sourceLang : (book?.languageHint ?? settings.learnLang)
  const target = state.targetLang !== 'auto' ? state.targetLang : resolveTargetLang(settings.targetLang)
  const edited = chapter ? state.editedBlocks[chapter.id] : undefined

  const blockTexts = useMemo(() => {
    if (!chapter) return []
    return chapter.blocks.map((block, index) => edited?.[index] ?? block)
  }, [chapter, edited])

  const pickedText = [...picked]
    .sort((a, b) => a.block - b.block || a.token - b.token)
    .map((entry) => entry.text)
    .join(' ')

  function handleWordClick(word: string, block: number, token: number, event: React.MouseEvent): void {
    event.stopPropagation()
    if (selectMode) {
      setPicked((prev) =>
        prev.some((entry) => entry.block === block && entry.token === token)
          ? prev.filter((entry) => !(entry.block === block && entry.token === token))
          : [...prev, { block, token, text: word }]
      )
      return
    }
    setPopover({ text: word, x: event.clientX, y: event.clientY })
    setGloss(null)
    setSaved(false)
  }

  async function revealGloss(): Promise<void> {
    if (!popover) return
    setLoadingGloss(true)
    try {
      const data = await getApi()?.translation.translate(popover.text, source, target)
      setGloss(data?.sourceText ?? null)
    } catch (err) {
      setGloss(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingGloss(false)
    }
  }

  async function saveWord(): Promise<void> {
    if (!popover) return
    await addWord({ word: popover.text, lang: source, otherLang: target, translation: gloss ?? '' })
    setSaved(true)
  }

  async function savePickedPhrase(): Promise<void> {
    const phrase = pickedText.trim()
    if (phrase === '') return
    await addPhrase({ phrase, lang: source, translation: '' })
    setPicked([])
  }

  function speakPicked(): void {
    if (pickedText.trim() !== '') void speak(pickedText, source)
  }

  function toggleSelect(): void {
    setSelectMode((value) => !value)
    setPicked([])
  }

  async function glossChapter(): Promise<void> {
    const api = getApi()
    if (!api) return
    setGlossing(true)
    try {
      const next: Record<number, string> = {}
      for (let index = 0; index < blockTexts.length; index++) {
        const text = blockTexts[index].trim()
        if (text === '') continue
        try {
          const data = await api.translation.translate(text, source, target)
          if (data?.sourceText) next[index] = data.sourceText
        } catch {
          // skip failed blocks
        }
      }
      setGlosses(next)
    } finally {
      setGlossing(false)
    }
  }

  const draftOverflow = readerDraftOverflow(state)

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center justify-between px-3">
          <span className="text-sm font-semibold">{t('reader.library')}</span>
          <Button size="sm" onClick={() => void open()} disabled={busy}>
            <BookOpen className="size-4" /> {t('reader.open')}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {library.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">{t('reader.noBooks')}</p>
          )}
          {library.map((meta) => (
            <div
              key={meta.id}
              className={cn(
                'group mb-0.5 flex items-center gap-1 rounded-md px-2 py-1.5',
                meta.id === book?.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => void openBook(meta.id)}
              >
                <span className="block truncate text-sm font-medium">{meta.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {meta.author || `${meta.chapterCount} chapters`}
                </span>
              </button>
              <button
                type="button"
                title={t('common.delete')}
                className="hidden text-destructive group-hover:block"
                onClick={() => void deleteBook(meta.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col" onClick={() => setPopover(null)}>
        {!book || !chapter ? (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            {t('reader.openHint')}
          </div>
        ) : (
          <>
            <header data-tour="reader.toolbar" className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{book.title}</div>
                <div className="truncate text-xs text-muted-foreground">{book.author}</div>
              </div>
              <Button
                size="icon"
                variant={selectMode ? 'default' : 'ghost'}
                title={t('reader.select')}
                onClick={toggleSelect}
              >
                <Highlighter className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={glossing}
                onClick={() => void glossChapter()}
              >
                <LanguagesIcon className="size-4" />
                {glossing ? t('reader.translating') : t('reader.glossChapter')}
              </Button>
              <LanguageSign kind="learn" className="size-4 shrink-0" />
              <LanguageSelect value={state.sourceLang} includeAuto ariaLabel={t('settings.learning')} onChange={(value) => setLanguages(value, state.targetLang)} />
              <span className="text-xs text-muted-foreground">→</span>
              <LanguageSign kind="help" className="size-4 shrink-0" />
              <LanguageSelect value={state.targetLang} includeAuto ariaLabel={t('settings.native')} onChange={(value) => setLanguages(state.sourceLang, value)} />
              <Button size="sm" variant={editing ? 'default' : 'outline'} onClick={() => setEditing((v) => !v)}>
                {t('reader.edit')}
              </Button>
              {editing && (
                <>
                  <Button size="sm" variant="outline" onClick={() => void saveNow()}>
                    <Save className="size-4" /> {t('reader.save')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void clearDraft()}>
                    {t('reader.clearDraft')}
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => void exportBook()}>
                {t('reader.export')}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={t('report.action')}
                onClick={() => {
                  const draft = buildReaderReport(t)
                  if (draft) openReport(draft)
                }}
              >
                <Flag className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" title={t('reader.close')} onClick={closeBook}>
                <X className="size-4" />
              </Button>
            </header>

            {draftOverflow && !draftDismissed && (
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
                <span className="min-w-0 flex-1">{t('reader.draftOverflow')}</span>
                <Button size="sm" variant="outline" onClick={() => void saveNow()}>
                  {t('reader.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void clearDraft()}>
                  {t('reader.clearDraft')}
                </Button>
                <button type="button" onClick={() => setDraftDismissed(true)} className="text-muted-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {picked.length > 0 && (
              <div className="flex items-center gap-2 border-b border-border bg-accent/40 px-4 py-2 text-xs">
                <span className="min-w-0 flex-1">{t('chat.selectedCount', picked.length)}</span>
                <Button size="sm" variant="outline" onClick={() => void savePickedPhrase()}>
                  {t('reader.savePhrase')}
                </Button>
                <Button size="sm" variant="outline" onClick={speakPicked}>
                  <Volume2 className="size-3.5" /> {t('common.speak')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
                  {t('chat.clearSelection')}
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-border px-4 py-1.5 text-xs text-muted-foreground">
              <Button
                size="sm"
                variant="ghost"
                disabled={chapterIndex <= 0}
                onClick={() => setPosition(chapterIndex - 1, 0)}
              >
                {t('reader.prev')}
              </Button>
              <select
                value={chapterIndex}
                onChange={(event) => setPosition(Number(event.target.value), 0)}
                className="h-7 max-w-xs flex-1 rounded border border-border bg-card px-2 text-xs"
              >
                {book.chapters.map((c, index) => (
                  <option key={c.id} value={index}>
                    {index + 1}. {c.title}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="ghost"
                disabled={chapterIndex >= book.chapters.length - 1}
                onClick={() => setPosition(chapterIndex + 1, 0)}
              >
                {t('reader.next')}
              </Button>
            </div>

            <div data-tour="reader.page" className="min-h-0 flex-1 overflow-y-auto bg-reader-bg text-reader-text">
              <div className="mx-auto max-w-3xl px-6 py-6" dir={contentDir(source)}>
                <h1 className="mb-4 text-xl font-semibold">{chapter.title}</h1>
                {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
                {blockTexts.map((block, index) =>
                  editing ? (
                    <textarea
                      key={index}
                      value={block}
                      onChange={(event) => setBlockText(chapter.id, index, event.target.value)}
                      className="mb-3 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm leading-relaxed"
                      rows={Math.max(2, Math.ceil(block.length / 80))}
                    />
                  ) : (
                    <div key={index} className="mb-3">
                      <p className="text-[15px] leading-relaxed">
                        {tokenize(block, source).map((token, tokenIndex) =>
                          token.word ? (
                            <span
                              key={tokenIndex}
                              onClick={(event) => handleWordClick(token.text, index, tokenIndex, event)}
                              className={cn(
                                'cursor-pointer rounded px-0.5',
                                picked.some((entry) => entry.block === index && entry.token === tokenIndex)
                                  ? 'bg-accent text-accent-foreground'
                                  : 'hover:bg-accent'
                              )}
                            >
                              {token.text}
                            </span>
                          ) : (
                            <span key={tokenIndex}>{token.text}</span>
                          )
                        )}
                      </p>
                      {glosses[index] && (
                        <p className="mt-1 text-sm italic text-muted-foreground">{glosses[index]}</p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {popover && (
        <div
          className="fixed z-50 w-72 rounded-lg border border-border bg-card p-3 shadow-xl"
          style={{ left: Math.min(popover.x, window.innerWidth - 300), top: popover.y + 8 }}
          dir={contentDir(source)}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <span className="text-base font-semibold">{popover.text}</span>
            <button type="button" onClick={() => setPopover(null)} className="text-muted-foreground">
              <X className="size-3.5" />
            </button>
          </div>
          <TransliterationLine text={popover.text} lang={source} className="mt-0.5" />
          {gloss && <div className="mt-1 text-sm">{gloss}</div>}
          {loadingGloss && <div className="mt-1 text-xs text-muted-foreground">{t('reader.translating')}</div>}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void revealGloss()}>
              {t('reader.gloss')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              title={t('common.speak')}
              onClick={() => void speak(popover.text, source)}
            >
              <Volume2 className="size-3.5" />
            </Button>
            <Button size="sm" onClick={() => void saveWord()} disabled={saved}>
              {saved ? t('reader.saved') : t('reader.saveWord')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
