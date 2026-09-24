import { ChevronDown, ChevronRight } from 'lucide-react'
import { useT } from '@renderer/lib/i18n'

/**
 * Collapsible model-thinking block. While `live`, it stays expanded showing
 * a bouncing indicator; completed thinking starts collapsed and the user can
 * expand it any time during the session.
 */
export function ThinkingBlock({
  thinking,
  expanded,
  live,
  onToggle
}: {
  thinking: string
  expanded: boolean
  live: boolean
  onToggle: () => void
}): React.JSX.Element {
  const t = useT()
  return (
    <div className="mb-1.5 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span className="font-medium">{live ? t('chat.thinking') : t('chat.thought')}</span>
        {live && (
          <span className="inline-flex gap-0.5" aria-hidden>
            <span className="animate-bounce text-[9px] leading-none">●</span>
            <span className="animate-bounce text-[9px] leading-none [animation-delay:150ms]">●</span>
            <span className="animate-bounce text-[9px] leading-none [animation-delay:300ms]">●</span>
          </span>
        )}
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words px-2.5 pb-2 text-xs text-muted-foreground">
          {thinking}
        </div>
      )}
    </div>
  )
}
