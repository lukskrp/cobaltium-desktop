import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Download, Flag, Folder, FolderPlus, MessageSquarePlus, Pencil, Trash2, Volume2 } from 'lucide-react'
import { Languages } from '@shared/domain/languages'
import type { SavedFolder } from '@shared/domain/models'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { getApi } from '@renderer/lib/ipc'
import { speak } from '@renderer/lib/tts'
import { useT } from '@renderer/lib/i18n'
import { resolveTargetLang, useChatStore } from '@renderer/features/chat/chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useLexiconStore } from './lexicon-store'
import { useReportStore } from '@renderer/features/report/report-store'
import { buildLexiconReport } from '@renderer/features/report/transcripts'
import { buildWordContext } from './context'
import { WordDetail } from './WordDetail'
import { PhraseDetail } from './PhraseDetail'

const inputClass =
  'h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'

type Tab = 'words' | 'phrases'

function childrenOf(folders: SavedFolder[], parentId: string | null): SavedFolder[] {
  return folders.filter((folder) => (folder.parentId ?? null) === parentId)
}

function pathTo(folders: SavedFolder[], id: string | null): SavedFolder[] {
  const path: SavedFolder[] = []
  const guard = new Set<string>()
  let current = id ? folders.find((folder) => folder.id === id) : undefined
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    path.unshift(current)
    const parentId: string | null = current.parentId
    current = parentId ? folders.find((folder) => folder.id === parentId) : undefined
  }
  return path
}

export function LexiconPage({ initialTab = 'words' }: { initialTab?: Tab }): React.JSX.Element {
  const t = useT()
  const load = useLexiconStore((s) => s.load)
  const loaded = useLexiconStore((s) => s.loaded)
  const words = useLexiconStore((s) => s.words)
  const phrases = useLexiconStore((s) => s.phrases)
  const folders = useLexiconStore((s) => s.folders)
  const addWord = useLexiconStore((s) => s.addWord)
  const addPhrase = useLexiconStore((s) => s.addPhrase)
  const createFolder = useLexiconStore((s) => s.createFolder)
  const renameFolder = useLexiconStore((s) => s.renameFolder)
  const deleteFolder = useLexiconStore((s) => s.deleteFolder)
  const moveWords = useLexiconStore((s) => s.moveWords)
  const movePhrases = useLexiconStore((s) => s.movePhrases)
  const deleteWord = useLexiconStore((s) => s.deleteWord)
  const deletePhrase = useLexiconStore((s) => s.deletePhrase)

  const appendContext = useChatStore((s) => s.appendContext)
  const openReport = useReportStore((s) => s.open)
  const learn = useSettingsStore((s) => s.settings.learnLang)
  const target = resolveTargetLang(useSettingsStore((s) => s.settings.targetLang))

  const [tab, setTab] = useState<Tab>(initialTab)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<string[]>([])
  const [moveTarget, setMoveTarget] = useState<string>('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [newPhrase, setNewPhrase] = useState('')
  const [langFilter, setLangFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  const wordLangs = useMemo(
    () => [...new Set(words.map((word) => word.lang))].sort((a, b) => a.localeCompare(b)),
    [words]
  )
  const filteredWords = words.filter(
    (word) => (word.folderId ?? null) === currentFolderId && (!langFilter || word.lang === langFilter)
  )
  const filteredPhrases = phrases.filter((phrase) => (phrase.folderId ?? null) === currentFolderId)
  const breadcrumb = pathTo(folders, currentFolderId)
  const childFolders = childrenOf(folders, currentFolderId)
  const selectedWord =
    tab === 'words' ? (filteredWords.find((word) => word.id === selectedId) ?? null) : null
  const selectedPhrase =
    tab === 'phrases' ? (filteredPhrases.find((phrase) => phrase.id === selectedId) ?? null) : null

  function switchTab(next: Tab): void {
    setTab(next)
    setSelectedId(null)
    setChecked([])
  }

  function toggleChecked(id: string): void {
    setChecked((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
  }

  function submitWord(): void {
    if (newWord.trim() === '') return
    void addWord({
      word: newWord,
      lang: learn,
      otherLang: target,
      translation: newTranslation,
      folderId: currentFolderId
    })
    setNewWord('')
    setNewTranslation('')
  }

  function submitPhrase(): void {
    if (newPhrase.trim() === '') return
    void addPhrase({
      phrase: newPhrase,
      lang: learn,
      translation: newTranslation,
      folderId: currentFolderId
    })
    setNewPhrase('')
    setNewTranslation('')
  }

  function commitMove(): void {
    const folderId = moveTarget === '' ? null : moveTarget
    if (tab === 'words') void moveWords(checked, folderId)
    else void movePhrases(checked, folderId)
    setChecked([])
    setMoveTarget('')
  }

  function commitRename(): void {
    if (renamingId) void renameFolder(renamingId, renameValue)
    setRenamingId(null)
  }

  function appendCurrent(): void {
    if (tab === 'words') {
      if (filteredWords.length === 0) return
      void appendContext(buildWordContext(filteredWords))
    } else {
      if (filteredPhrases.length === 0) return
      const text = filteredPhrases.map((phrase) => `- ${phrase.phrase} = ${phrase.translation}`).join('\n')
      void appendContext(`Here are some phrases I've saved:\n${text}\nSaved phrases for context.`)
    }
    window.location.hash = '#/chat'
  }

  // Flatten folders with depth for the move picker.
  function folderOptions(parentId: string | null, depth: number): { id: string; label: string }[] {
    const out: { id: string; label: string }[] = []
    for (const folder of childrenOf(folders, parentId)) {
      out.push({ id: folder.id, label: `${'  '.repeat(depth)}${folder.name}` })
      out.push(...folderOptions(folder.id, depth + 1))
    }
    return out
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex gap-1 border-b border-border p-2">
          {(['words', 'phrases'] as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchTab(value)}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-sm font-medium',
                tab === value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60'
              )}
            >
              {t(`lexicon.${value}`)}
            </button>
          ))}
        </div>

        <div className="border-b border-border p-3">
          <div className="space-y-1.5">
            {tab === 'words' ? (
              <input
                className={inputClass}
                placeholder={t('lexicon.wordPlaceholder', Languages.name(learn))}
                value={newWord}
                onChange={(event) => setNewWord(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitWord()
                }}
              />
            ) : (
              <input
                className={inputClass}
                placeholder={t('lexicon.phrasePlaceholder', Languages.name(learn))}
                value={newPhrase}
                onChange={(event) => setNewPhrase(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitPhrase()
                }}
              />
            )}
            <input
              className={inputClass}
              placeholder={t('lexicon.translationPlaceholder')}
              value={newTranslation}
              onChange={(event) => setNewTranslation(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') (tab === 'words' ? submitWord : submitPhrase)()
              }}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={tab === 'words' ? submitWord : submitPhrase}
              disabled={tab === 'words' ? newWord.trim() === '' : newPhrase.trim() === ''}
            >
              {tab === 'words' ? t('lexicon.saveWord') : t('lexicon.addPhrase')}
            </Button>
          </div>
        </div>

        <div className="border-b border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('lexicon.folders')}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title={t('lexicon.appendAll')}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={appendCurrent}
              >
                <MessageSquarePlus className="size-3.5" />
              </button>
              {tab === 'words' && (
                <button
                  type="button"
                  title={t('lexicon.exportWords')}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => void getApi()?.lexicon.exportWords()}
                >
                  <Download className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                title={t('report.action')}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  const draft = buildLexiconReport(t)
                  if (draft) openReport(draft)
                }}
              >
                <Flag className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-1.5 flex flex-wrap items-center gap-0.5 text-xs text-muted-foreground">
            <button type="button" className="hover:underline" onClick={() => setCurrentFolderId(null)}>
              {t('lexicon.root')}
            </button>
            {breadcrumb.map((folder) => (
              <span key={folder.id} className="flex items-center gap-0.5">
                <ChevronRight className="size-3" />
                <button type="button" className="hover:underline" onClick={() => setCurrentFolderId(folder.id)}>
                  {folder.name}
                </button>
              </span>
            ))}
          </div>

          {childFolders.map((folder) => {
            const count =
              tab === 'words'
                ? words.filter((word) => (word.folderId ?? null) === folder.id).length
                : phrases.filter((phrase) => (phrase.folderId ?? null) === folder.id).length
            return (
              <div
                key={folder.id}
                className="group flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm hover:bg-accent/60"
              >
                {renamingId === folder.id ? (
                  <input
                    autoFocus
                    className={inputClass}
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename()
                      if (event.key === 'Escape') setRenamingId(null)
                    }}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      onClick={() => setCurrentFolderId(folder.id)}
                      onDoubleClick={() => {
                        setRenamingId(folder.id)
                        setRenameValue(folder.name)
                      }}
                    >
                      <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <span className="text-xs text-muted-foreground group-hover:hidden">{count}</span>
                    <button
                      type="button"
                      title={t('lexicon.rename')}
                      className="hidden text-muted-foreground group-hover:block"
                      onClick={() => {
                        setRenamingId(folder.id)
                        setRenameValue(folder.name)
                      }}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      title={t('common.delete')}
                      className="hidden text-destructive group-hover:block"
                      onClick={() => void deleteFolder(folder.id)}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </>
                )}
              </div>
            )
          })}

          <div className="mt-2 flex gap-1.5">
            <input
              className={inputClass}
              placeholder={t('lexicon.newFolder')}
              value={newFolder}
              onChange={(event) => setNewFolder(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && newFolder.trim() !== '') {
                  void createFolder(newFolder, currentFolderId)
                  setNewFolder('')
                }
              }}
            />
            <Button
              size="icon"
              variant="outline"
              title={t('lexicon.createFolder')}
              onClick={() => {
                if (newFolder.trim() !== '') {
                  void createFolder(newFolder, currentFolderId)
                  setNewFolder('')
                }
              }}
            >
              <FolderPlus className="size-4" />
            </Button>
          </div>
        </div>

        {checked.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-border p-2">
            <span className="text-xs text-muted-foreground">{t('lexicon.selectedCount', checked.length)}</span>
            <select
              className={cn(inputClass, 'flex-1')}
              value={moveTarget}
              onChange={(event) => setMoveTarget(event.target.value)}
            >
              <option value="">{t('lexicon.root')}</option>
              {folderOptions(null, 0).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={commitMove}>
              {t('lexicon.move')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setChecked([])}>
              {t('chat.clearSelection')}
            </Button>
          </div>
        )}

        <div data-tour="lex.page" className="min-h-0 flex-1 overflow-y-auto p-2">
          {tab === 'words' && wordLangs.length > 1 && (
            <div data-tour="langdex.search" className="mb-1 flex items-center gap-2 px-2">
              <span className="text-xs text-muted-foreground">{t('lexicon.filterLanguage')}</span>
              <select
                value={langFilter ?? ''}
                onChange={(event) => setLangFilter(event.target.value || null)}
                className="h-7 rounded-md border border-border bg-background px-1.5 text-xs text-foreground outline-none"
              >
                <option value="">{t('lexicon.allWords')}</option>
                {wordLangs.map((code) => (
                  <option key={code} value={code}>
                    {Languages.name(code)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {tab === 'words' && filteredWords.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">{t('lexicon.emptyHint')}</p>
          )}
          {tab === 'words' &&
            filteredWords.map((word) => (
              <div
                key={word.id}
                className={cn(
                  'mb-0.5 flex items-center gap-1 rounded-md px-1.5 py-1.5',
                  word.id === selectedId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                )}
              >
                <button
                  type="button"
                  title={t('lexicon.select')}
                  onClick={() => toggleChecked(word.id)}
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded border border-border',
                    checked.includes(word.id) && 'bg-primary text-primary-foreground'
                  )}
                >
                  {checked.includes(word.id) && <Check className="size-3" />}
                </button>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col text-left"
                  onClick={() => setSelectedId(word.id)}
                >
                  <span className="truncate text-sm font-medium">{word.word}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {word.translation || Languages.name(word.lang)}
                  </span>
                </button>
                <button
                  type="button"
                  title={t('common.speak')}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => void speak(word.word, word.lang)}
                >
                  <Volume2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  title={t('common.delete')}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (selectedId === word.id) setSelectedId(null)
                    setChecked((prev) => prev.filter((id) => id !== word.id))
                    void deleteWord(word.id)
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}

          {tab === 'phrases' && filteredPhrases.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">{t('lexicon.emptyHint')}</p>
          )}
          {tab === 'phrases' &&
            filteredPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className={cn(
                  'mb-0.5 flex items-center gap-1 rounded-md px-1.5 py-1.5',
                  phrase.id === selectedId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                )}
              >
                <button
                  type="button"
                  title={t('lexicon.select')}
                  onClick={() => toggleChecked(phrase.id)}
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded border border-border',
                    checked.includes(phrase.id) && 'bg-primary text-primary-foreground'
                  )}
                >
                  {checked.includes(phrase.id) && <Check className="size-3" />}
                </button>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col text-left"
                  onClick={() => setSelectedId(phrase.id)}
                >
                  <span className="truncate text-sm font-medium">{phrase.phrase}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {phrase.translation || Languages.name(phrase.lang)}
                  </span>
                </button>
                <button
                  type="button"
                  title={t('common.speak')}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => void speak(phrase.phrase, phrase.lang)}
                >
                  <Volume2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  title={t('common.delete')}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (selectedId === phrase.id) setSelectedId(null)
                    setChecked((prev) => prev.filter((id) => id !== phrase.id))
                    void deletePhrase(phrase.id)
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        {selectedWord ? (
          <WordDetail key={selectedWord.id} word={selectedWord} />
        ) : selectedPhrase ? (
          <PhraseDetail key={selectedPhrase.id} phrase={selectedPhrase} onDelete={() => void deletePhrase(selectedPhrase.id)} />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            {t('lexicon.selectHint')}
          </div>
        )}
      </main>
    </div>
  )
}
