import { useEffect, useMemo, useState } from 'react'
import { Trash2, Volume2 } from 'lucide-react'
import type { SrsCardBucket, SrsGrade } from '@shared/domain/srs'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { getApi } from '@renderer/lib/ipc'
import { useT } from '@renderer/lib/i18n'
import { speak } from '@renderer/lib/tts'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'
import {
  deckMembers,
  deckSummaries,
  dueCards,
  savedItems,
  useSrsStore,
  type SrsCardModel
} from './srs-store'

const BUCKET_DOT: Record<SrsCardBucket, string> = {
  new: 'bg-blue-500',
  learning: 'bg-amber-400',
  again: 'bg-red-500',
  strong: 'bg-emerald-500'
}

function Counters({ summary }: { summary: { blue: number; yellow: number; red: number; green: number; total: number } }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-blue-500" /> {summary.blue}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-amber-400" /> {summary.yellow}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-red-500" /> {summary.red}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-emerald-500" /> {summary.green}
      </span>
    </div>
  )
}

function ReviewCard({ card, grading }: { card: SrsCardModel; grading: boolean }): React.JSX.Element {
  const t = useT()
  const gradeCurrent = useSrsStore((s) => s.gradeCurrent)
  const [revealed, setRevealed] = useState(false)
  const [roman, setRoman] = useState<string | null>(null)

  return (
    <div data-tour="srs.page" className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {card.lang} → {card.learnLang}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            title={t('lexicon.romanize')}
            onClick={() => void getApi()?.lang.romanize(card.front, card.lang).then(setRoman)}
          >
            Aa
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={t('common.speak')}
            onClick={() => void speak(card.front, card.lang)}
          >
            <Volume2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="py-8 text-center">
        <div className="text-3xl font-semibold">{card.front}</div>
        {roman && <div className="mt-1 text-sm text-muted-foreground">{roman}</div>}
        {revealed && card.back && (
          <div className="mt-4 text-lg text-muted-foreground">{card.back}</div>
        )}
      </div>

      {!revealed ? (
        <Button className="w-full" onClick={() => setRevealed(true)}>
          {t('srs.reveal')}
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['again', t('srs.again'), 'bg-red-500 hover:bg-red-500/90'],
              ['good', t('srs.good'), 'bg-amber-500 hover:bg-amber-500/90'],
              ['easy', t('srs.easy'), 'bg-emerald-600 hover:bg-emerald-600/90']
            ] as [SrsGrade, string, string][]
          ).map(([grade, label, cls]) => (
            <button
              key={grade}
              type="button"
              disabled={grading}
              onClick={() => void gradeCurrent(grade)}
              className={cn('rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50', cls)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DeckView({ deckId }: { deckId: string }): React.JSX.Element {
  const t = useT()
  const state = useSrsStore()
  const summary = deckSummaries(
    state.decks,
    state.membership,
    state.words,
    state.phrases,
    state.states
  ).find((deck) => deck.id === deckId)
  const due = dueCards(
    deckId,
    state.membership,
    state.words,
    state.phrases,
    state.states,
    state.clock
  )
  const members = deckMembers(deckId, state.membership, state.words, state.phrases, state.states)
  const allItems = savedItems(state.words, state.phrases)
  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members])
  const [addSelection, setAddSelection] = useState<string[]>([])
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(summary?.name ?? '')

  if (!summary) return <div className="p-6 text-sm text-muted-foreground">{t('srs.noDecks')}</div>

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => state.selectDeck(null)}>
            {t('srs.backToDecks')}
          </Button>
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onBlur={() => {
                setRenaming(false)
                void state.renameDeck(deckId, renameValue)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setRenaming(false)
                  void state.renameDeck(deckId, renameValue)
                }
                if (event.key === 'Escape') setRenaming(false)
              }}
              className="rounded border border-border bg-card px-2 py-1 text-sm"
            />
          ) : (
            <button
              type="button"
              className="text-lg font-semibold"
              onDoubleClick={() => {
                setRenameValue(summary.name)
                setRenaming(true)
              }}
              title={t('chat.renameHint')}
            >
              {summary.name}
            </button>
          )}
          <Counters summary={summary} />
        </div>
        <Button variant="outline" size="sm" className="text-destructive" onClick={() => void state.deleteDeck(deckId)}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      {due.length > 0 ? (
        <section>
          <div className="mb-2 text-xs text-muted-foreground">{t('srs.dueCount', due.length)}</div>
          <ReviewCard key={due[0].id} card={due[0]} grading={state.grading} />
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {members.length === 0 ? t('srs.emptyHintNone') : t('srs.empty')}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          {t('srs.deckCards')} ({members.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          {members.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground">{t('srs.noCards')}</p>
          )}
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0">
              <span className={cn('size-2 shrink-0 rounded-full', BUCKET_DOT[member.bucket])} title={member.bucket} />
              <span className="min-w-0 flex-1 truncate text-sm">{member.front}</span>
              <span className="truncate text-xs text-muted-foreground">{member.back}</span>
              <button
                type="button"
                title={t('srs.remove')}
                className="text-destructive"
                onClick={() => void state.removeCardFromDeck(member.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('srs.addSavedItems')}</h2>
          <Button
            size="sm"
            disabled={addSelection.length === 0}
            onClick={() => {
              void state.addCardsToDeck(deckId, addSelection)
              setAddSelection([])
            }}
          >
            {addSelection.length > 0 ? t('srs.addSelected', addSelection.length) : t('common.create')}
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
          {allItems
            .filter((item) => !memberIds.has(item.cardId))
            .map((item) => {
              const checked = addSelection.includes(item.cardId)
              return (
                <label
                  key={item.cardId}
                  className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-accent/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setAddSelection((current) =>
                        checked
                          ? current.filter((id) => id !== item.cardId)
                          : [...current, item.cardId]
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{item.front}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.langLabel}</span>
                </label>
              )
            })}
          {allItems.every((item) => memberIds.has(item.cardId)) && (
            <p className="p-3 text-xs text-muted-foreground">{t('srs.allAdded')}</p>
          )}
        </div>
      </section>
    </div>
  )
}

export function SrsPage(): React.JSX.Element {
  const t = useT()
  const load = useSrsStore((s) => s.load)
  const lexiconRev = useLexiconStore((s) => s.rev)
  const decks = useSrsStore((s) => s.decks)
  const membership = useSrsStore((s) => s.membership)
  const words = useSrsStore((s) => s.words)
  const phrases = useSrsStore((s) => s.phrases)
  const states = useSrsStore((s) => s.states)
  const selectedDeckId = useSrsStore((s) => s.selectedDeckId)
  const selectDeck = useSrsStore((s) => s.selectDeck)
  const createDeck = useSrsStore((s) => s.createDeck)
  const [newDeck, setNewDeck] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reload on mount and whenever the lexicon changes elsewhere (chat saves,
  // reader saves, imports), so new words are immediately deck-eligible.
  useEffect(() => {
    void load()
  }, [load, lexiconRev])

  const summaries = useMemo(
    () => deckSummaries(decks, membership, words, phrases, states),
    [decks, membership, words, phrases, states]
  )

  async function submitDeck(): Promise<void> {
    const name = newDeck.trim()
    if (name === '') return
    const ok = await createDeck(name)
    if (ok) {
      setNewDeck('')
      setError(null)
    } else {
      setError(t('srs.deckExists'))
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <aside data-tour="srs.drawer" className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="border-b border-border p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('srs.newDeck')}
          </div>
          <div className="flex gap-1.5">
            <input
              value={newDeck}
              onChange={(event) => setNewDeck(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submitDeck()
              }}
              placeholder={t('srs.deckName')}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="sm" onClick={() => void submitDeck()} disabled={newDeck.trim() === ''}>
              {t('srs.create')}
            </Button>
          </div>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {summaries.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              {t('srs.noDecks')} {t('srs.noDecksHint')}
            </p>
          )}
          {summaries.map((deck) => (
            <button
              key={deck.id}
              type="button"
              onClick={() => selectDeck(deck.id)}
              className={cn(
                'mb-0.5 flex w-full flex-col rounded-md px-2 py-1.5 text-left',
                deck.id === selectedDeckId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
              )}
            >
              <span className="truncate text-sm font-medium">{deck.name}</span>
              <div className="mt-0.5">
                <Counters summary={deck} />
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {selectedDeckId ? (
          <DeckView key={selectedDeckId} deckId={selectedDeckId} />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            Select a deck to review, or create one to get started.
          </div>
        )}
      </main>
    </div>
  )
}
