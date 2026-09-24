import { useState } from 'react'
import { Volume2, X } from 'lucide-react'
import { analysisHasData, type SavedWordAnalysis } from '@shared/domain/models'
import { AnalysisLabels } from '@shared/domain/prompts'
import { Button } from '@renderer/components/ui/button'
import { TransliterationLine } from '@renderer/components/TransliterationLine'
import { getApi } from '@renderer/lib/ipc'
import { speak } from '@renderer/lib/tts'
import { useT } from '@renderer/lib/i18n'
import { contentDir } from '@shared/domain/text-direction'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'

const WIDTH = 288
const MAX_HEIGHT = 280

/** Morphological analysis chips (port of Android's `AnalysisChips`). */
export function AnalysisChips({ analysis }: { analysis: SavedWordAnalysis }): React.JSX.Element {
  const entries = (Object.keys(analysis) as (keyof SavedWordAnalysis)[]).filter((key) => analysis[key])
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((key) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[11px] text-accent-foreground"
        >
          <span className="opacity-70">{AnalysisLabels.label(key)}:</span>
          {analysis[key]}
        </span>
      ))}
    </div>
  )
}

/**
 * Floating word popup anchored at the click point: romanization, translation
 * gloss, LLM morphological analysis chips, plus gloss/speak/save actions.
 */
export function WordGlossaryPopup({
  word,
  lang,
  otherLang,
  x,
  y,
  analysis,
  generating,
  onClose
}: {
  word: string
  lang: string
  otherLang: string
  x: number
  y: number
  analysis: SavedWordAnalysis | null
  generating: boolean
  onClose: () => void
}): React.JSX.Element {
  const t = useT()
  const addWordPair = useLexiconStore((s) => s.addWordPair)
  const [gloss, setGloss] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.max(8, Math.min(x, viewportWidth - WIDTH - 8))
  const below = y + 8
  const top =
    below + MAX_HEIGHT > viewportHeight ? Math.max(8, y - MAX_HEIGHT - 8) : below

  async function reveal(): Promise<void> {
    setLoading(true)
    try {
      const data = await getApi()?.translation.translate(word, lang, otherLang)
      setGloss(data?.sourceText ?? null)
    } catch {
      setGloss(null)
    } finally {
      setLoading(false)
    }
  }

  async function save(): Promise<void> {
    await addWordPair({ word, lang, otherLang, translation: gloss ?? '' })
    setSaved(true)
  }

  const hasAnalysis = analysisHasData(analysis)

  return (
    <div
      className="fixed z-50 overflow-y-auto rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xl"
      style={{ left, top, width: WIDTH, maxHeight: MAX_HEIGHT }}
      dir={contentDir(lang)}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold">{word}</span>
        <button type="button" onClick={onClose} className="text-muted-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      <TransliterationLine text={word} lang={lang} className="mt-0.5" />
      {gloss && <div className="mt-1 text-sm">{gloss}</div>}
      {loading && <div className="mt-1 text-xs text-muted-foreground">{t('reader.translating')}</div>}

      {generating ? (
        <div className="mt-1 text-xs text-muted-foreground">{t('chat.generating')}</div>
      ) : hasAnalysis && analysis ? (
        <div className="mt-1.5">
          <AnalysisChips analysis={analysis} />
        </div>
      ) : (
        !gloss && <div className="mt-1 text-[11px] italic text-muted-foreground">{t('chat.noGlossary')}</div>
      )}

      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => void reveal()}>
          {t('reader.gloss')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          title={t('common.speak')}
          onClick={() => void speak(word, lang)}
        >
          <Volume2 className="size-3.5" />
        </Button>
        <Button size="sm" onClick={() => void save()} disabled={saved}>
          {saved ? t('reader.saved') : t('reader.saveWord')}
        </Button>
      </div>
    </div>
  )
}
