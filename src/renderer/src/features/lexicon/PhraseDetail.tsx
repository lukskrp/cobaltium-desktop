import { MessageSquarePlus, Trash2, Volume2 } from 'lucide-react'
import { Languages } from '@shared/domain/languages'
import type { SavedPhrase } from '@shared/domain/models'
import { Button } from '@renderer/components/ui/button'
import { speak } from '@renderer/lib/tts'
import { useT } from '@renderer/lib/i18n'
import { useChatStore } from '@renderer/features/chat/chat-store'

/** Detail pane for a saved phrase. */
export function PhraseDetail({
  phrase,
  onDelete
}: {
  phrase: SavedPhrase
  onDelete: () => void
}): React.JSX.Element {
  const t = useT()
  const appendContext = useChatStore((s) => s.appendContext)
  const line = phrase.translation ? `- ${phrase.phrase} = ${phrase.translation}` : `- ${phrase.phrase}`

  function appendToChat(): void {
    void appendContext(`Here are some phrases I've saved:\n${line}\nSaved phrases for context.`)
    window.location.hash = '#/chat'
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{phrase.phrase}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{Languages.name(phrase.lang)}</p>
          {phrase.translation && <p className="mt-2 text-sm">{phrase.translation}</p>}
        </div>
        <Button variant="outline" className="text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" /> {t('common.delete')}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void speak(phrase.phrase, phrase.lang)}>
          <Volume2 className="size-3.5" /> {t('common.speak')}
        </Button>
        <Button size="sm" variant="outline" onClick={appendToChat}>
          <MessageSquarePlus className="size-3.5" /> {t('lexicon.appendToChat')}
        </Button>
      </div>
    </div>
  )
}
