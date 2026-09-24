import { useMemo } from 'react'
import { createCjkTokenizer, KoreanTokenizer, WhitespaceTokenizer } from '@shared/lang/tokenizers'
import { contentDir } from '@shared/domain/text-direction'
import { cn } from '@renderer/lib/utils'

export interface GlossToken {
  text: string
  word: boolean
}

export function tokenizeForGloss(text: string, lang: string): GlossToken[] {
  const normalized = lang.toLowerCase()
  const tokenizer =
    normalized === 'zh' || normalized === 'ja'
      ? createCjkTokenizer()
      : normalized === 'ko'
        ? KoreanTokenizer
        : WhitespaceTokenizer
  return tokenizer.segment(text).map((segment) => ({ text: segment.text, word: segment.word }))
}

/**
 * Plain-text message body whose words are clickable for glossing/selection.
 * Revealed glosses render *under* the word (interlinear), matching the
 * Android flip.
 */
export function GlossableText({
  text,
  lang,
  selected,
  glossaryTargetIndex,
  revealedGlosses,
  onWordClick
}: {
  text: string
  lang: string
  selected: number[]
  glossaryTargetIndex?: number
  revealedGlosses?: Record<number, string>
  onWordClick: (word: string, index: number, event: React.MouseEvent) => void
}): React.JSX.Element {
  const tokens = useMemo(() => tokenizeForGloss(text, lang), [text, lang])
  return (
    <p className="whitespace-pre-wrap break-words" dir={contentDir(lang)}>
      {tokens.map((token, index) => {
        if (!token.word) return <span key={index}>{token.text}</span>
        const gloss = revealedGlosses?.[index]
        const isSelected = selected.includes(index)
        const isTarget = glossaryTargetIndex === index
        return (
          <span key={index} className="inline-flex flex-col">
            <span
              onClick={(event) => onWordClick(token.text, index, event)}
              className={cn(
                'cursor-pointer rounded px-0.5',
                isSelected
                  ? 'bg-accent text-accent-foreground'
                  : isTarget
                    ? 'bg-accent/50 text-accent-foreground'
                    : 'hover:bg-accent/60'
              )}
            >
              {token.text}
            </span>
            {gloss && <span className="px-0.5 text-[10px] leading-tight text-muted-foreground">{gloss}</span>}
          </span>
        )
      })}
    </p>
  )
}
