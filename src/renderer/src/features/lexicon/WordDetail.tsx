import { useEffect, useState } from 'react'
import { MessageSquarePlus, Volume2 } from 'lucide-react'
import { Languages } from '@shared/domain/languages'
import { PROMPT_TYPES, type PromptType } from '@shared/domain/enums'
import { AnalysisLabels, PromptBuilder } from '@shared/domain/prompts'
import type { SavedWord, SavedWordAnalysis } from '@shared/domain/models'
import type { DictionaryEntry, InflectionParadigm } from '@shared/lang'
import { Button } from '@renderer/components/ui/button'
import { getApi } from '@renderer/lib/ipc'
import { speak } from '@renderer/lib/tts'
import { useT } from '@renderer/lib/i18n'
import { useChatStore } from '@renderer/features/chat/chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useLexiconStore } from './lexicon-store'
import { buildWordContext } from './context'
import { morphologyToAnalysis } from './analysis'

export function WordDetail({ word }: { word: SavedWord }): React.JSX.Element {
  const t = useT()
  const saveAnalysis = useLexiconStore((s) => s.saveAnalysis)
  const deleteWord = useLexiconStore((s) => s.deleteWord)
  const askAboutWord = useChatStore((s) => s.askAboutWord)
  const appendContext = useChatStore((s) => s.appendContext)
  const glossaryCacheEnabled = useSettingsStore((s) => s.settings.glossaryCacheEnabled)

  const [romanization, setRomanization] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<SavedWordAnalysis | null>(word.analysis ?? null)
  const [paradigm, setParadigm] = useState<InflectionParadigm | null>(null)
  const [dictionary, setDictionary] = useState<DictionaryEntry[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!glossaryCacheEnabled || word.analysis) return
    let active = true
    void getApi()
      ?.glossary.get(word.word, word.lang)
      .then((cached) => {
        if (active && cached) setAnalysis(cached)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [glossaryCacheEnabled, word.word, word.lang, word.analysis])

  async function run(kind: string, task: () => Promise<void>): Promise<void> {
    setBusy(kind)
    setError(null)
    try {
      await task()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  function askWord(type: PromptType): void {
    const prompt = PromptBuilder.preprompt(word.word, word.lang, type)
    void askAboutWord(prompt)
    window.location.hash = '#/chat'
  }

  function appendToChat(): void {
    void appendContext(buildWordContext([word]))
    window.location.hash = '#/chat'
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{word.word}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {Languages.name(word.lang)} → {Languages.name(word.otherLang)}
          </p>
          {word.translation && <p className="mt-2 text-sm">{word.translation}</p>}
        </div>
        <Button
          variant="outline"
          onClick={() => void deleteWord(word.id)}
          className="text-destructive"
        >
          {t('common.delete')}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run('romanize', async () => {
              const value = await getApi()?.lang.romanize(word.word, word.lang)
              setRomanization(value ?? null)
            })
          }
        >
          {t('lexicon.romanize')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run('analyze', async () => {
              const result = await getApi()?.lang.morph(word.word, word.lang)
              if (!result) {
                setError(t('lexicon.noAnalysisReturned'))
                return
              }
              const fields = morphologyToAnalysis(result)
              setAnalysis(fields)
              await saveAnalysis(word.id, fields)
              if (glossaryCacheEnabled) {
                void getApi()?.glossary.put(word.word, word.lang, fields)
              }
            })
          }
        >
          {t('lexicon.analyze')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run('inflect', async () => {
              const result = await getApi()?.lang.inflect(
                word.word,
                word.lang,
                analysis?.pos ?? word.pos ?? null
              )
              setParadigm(result ?? null)
              if (!result) setError(t('lexicon.noParadigm'))
            })
          }
        >
          {analysis?.pos?.toLowerCase() === 'verb' ? t('lexicon.conjugate') : t('lexicon.conjugateDecline')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run('lookup', async () => {
              const result = await getApi()?.lang.lookup(word.word, word.lang)
              setDictionary(result ?? null)
            })
          }
        >
          {t('lexicon.dictionary')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void speak(word.word, word.lang)}>
          <Volume2 className="size-3.5" />
          {t('common.speak')}
        </Button>
        <Button variant="outline" size="sm" onClick={appendToChat}>
          <MessageSquarePlus className="size-3.5" />
          {t('lexicon.appendToChat')}
        </Button>
        <select
          className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          value=""
          onChange={(event) => {
            if (event.target.value) askWord(event.target.value as PromptType)
          }}
        >
          <option value="">{t('lexicon.askAbout')}</option>
          {PROMPT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`prompt.${type}`)}
            </option>
          ))}
        </select>
      </div>

      {busy && <p className="mt-3 text-xs text-muted-foreground">{t('lexicon.working')}</p>}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {romanization && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('lexicon.romanization')}
          </h2>
          <p className="mt-1 text-sm">{romanization}</p>
        </section>
      )}

      {analysis && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('lexicon.morphology')}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(analysis) as (keyof SavedWordAnalysis)[])
              .filter((key) => analysis[key])
              .map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                >
                  <span className="opacity-70">{AnalysisLabels.label(key)}:</span>
                  {analysis[key]}
                </span>
              ))}
          </div>
        </section>
      )}

      {paradigm && (
        <section className="mt-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('lexicon.langdex')}
            {paradigm.kind ? ` · ${t(`lexicon.${paradigm.kind}`)}` : ''}
          </h2>
          {paradigm.note && <p className="text-xs text-muted-foreground">{paradigm.note}</p>}
          {paradigm.tables.map((table) => (
            <div key={table.title} className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold">
                {table.title}
              </div>
              <table className="w-full text-sm">
                {table.columns.length > 0 && (
                  <thead>
                    <tr>
                      <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground" />
                      {table.columns.map((column) => (
                        <th
                          key={column}
                          className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {table.rows.map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{row.label}</td>
                      {row.cells.map((cell, index) => (
                        <td key={index} className="px-3 py-1.5">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {dictionary && dictionary.length > 0 && (
        <section className="mt-6 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('lexicon.dictionary')}
          </h2>
          {dictionary.map((entry, index) => (
            <div key={index} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{entry.headword}</span>
                {entry.pos && <span className="text-xs text-muted-foreground">{entry.pos}</span>}
                {entry.reading && (
                  <span className="text-xs text-muted-foreground">[{entry.reading}]</span>
                )}
              </div>
              {entry.senses.map((sense, senseIndex) => (
                <p key={senseIndex} className="mt-1 text-muted-foreground">
                  {sense}
                </p>
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
