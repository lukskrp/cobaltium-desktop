import { useEffect, useState } from 'react'
import {
  BookOpen,
  Highlighter,
  Languages,
  MousePointerClick,
  Save,
  Volume2
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useT } from '@renderer/lib/i18n'
import { resolveTargetLang } from '@renderer/features/chat/chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useChatToolbarStore } from '../chat-toolbar-store'
import { hasDifferentScript } from '../script'

type Phase = 'idle' | 'active' | 'done'

function RailButton({
  label,
  anchor,
  active,
  done,
  available,
  disabled,
  onClick,
  children
}: {
  label: string
  anchor: string
  active?: boolean
  done?: boolean
  available?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      data-tour={anchor}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-8 place-items-center rounded-md transition-colors',
        done
          ? 'bg-success text-white'
          : active
            ? 'bg-primary text-primary-foreground'
            : available
              ? 'bg-warning/20 text-warning hover:bg-warning/30'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground'
      )}
    >
      {children}
    </button>
  )
}

/** Advances a transient action phase: idle -> active -> done -> idle. */
function usePhase(phase: Phase, setPhase: (value: Phase) => void): void {
  useEffect(() => {
    if (phase === 'idle') return
    if (phase === 'active') {
      const id = setTimeout(() => setPhase('done'), 700)
      return () => clearTimeout(id)
    }
    const id = setTimeout(() => setPhase('idle'), 900)
    return () => clearTimeout(id)
  }, [phase, setPhase])
}

/**
 * Image-editor style tool rail shown on the left in immersive/reflective modes
 * (port of Android's `SelectionToolbar`). Hidden in plain conversation mode.
 */
export function ChatToolRail(): React.JSX.Element {
  const t = useT()
  const learn = useSettingsStore((s) => s.settings.learnLang)
  const helper = resolveTargetLang(useSettingsStore((s) => s.settings.targetLang))
  const transliterationEnabled = useSettingsStore((s) => s.settings.transliterationEnabled)

  const selectMode = useChatToolbarStore((s) => s.selectMode)
  const glossaryMode = useChatToolbarStore((s) => s.glossaryMode)
  const granularSave = useChatToolbarStore((s) => s.granularSave)
  const hasSelection = useChatToolbarStore((s) => (s.selection?.words.length ?? 0) > 0)
  const toggleSelectMode = useChatToolbarStore((s) => s.toggleSelectMode)
  const toggleGlossaryMode = useChatToolbarStore((s) => s.toggleGlossaryMode)
  const toggleGranularSave = useChatToolbarStore((s) => s.toggleGranularSave)
  const toggleTransliteration = useChatToolbarStore((s) => s.toggleTransliteration)
  const saveSelection = useChatToolbarStore((s) => s.saveSelection)
  const speakSelection = useChatToolbarStore((s) => s.speakSelection)

  const [savePhase, setSavePhase] = useState<Phase>('idle')
  const [speakPhase, setSpeakPhase] = useState<Phase>('idle')
  usePhase(savePhase, setSavePhase)
  usePhase(speakPhase, setSpeakPhase)

  const translitAvailable = hasDifferentScript(learn, helper)

  return (
    <div className="absolute bottom-2 left-2 z-30 flex w-11 flex-col items-center gap-1 rounded-[10px] border border-border bg-card/95 py-2 shadow-md">
      <RailButton
        label={t('chat.tool.glossary')}
        anchor="tool.glossary"
        active={glossaryMode}
        onClick={toggleGlossaryMode}
      >
        <BookOpen className="size-4" />
      </RailButton>

      <RailButton
        label={t('chat.tool.select')}
        anchor="tool.select"
        active={selectMode}
        onClick={toggleSelectMode}
      >
        <Highlighter className="size-4" />
      </RailButton>

      <RailButton
        label={t('chat.tool.saveSelection')}
        anchor="tool.save"
        active={savePhase === 'active'}
        done={savePhase === 'done'}
        available={hasSelection}
        disabled={!hasSelection}
        onClick={() => {
          setSavePhase('active')
          // Only flash success once the save actually lands; a failure
          // surfaces through the error toast instead.
          void saveSelection().then((ok) => setSavePhase(ok ? 'done' : 'idle'))
        }}
      >
        <Save className="size-4" />
      </RailButton>

      <RailButton
        label={t('chat.tool.granularSave')}
        anchor="tool.granular"
        active={granularSave}
        onClick={toggleGranularSave}
      >
        <span className="relative grid place-items-center">
          <Save className="size-4" />
          <MousePointerClick className="absolute -bottom-1 -right-1 size-2.5" />
        </span>
      </RailButton>

      <RailButton
        label={t('chat.tool.speakSelection')}
        anchor="tool.speak"
        active={speakPhase === 'active'}
        done={speakPhase === 'done'}
        available={hasSelection}
        disabled={!hasSelection}
        onClick={() => {
          setSpeakPhase('active')
          speakSelection()
        }}
      >
        <Volume2 className="size-4" />
      </RailButton>

      {translitAvailable && (
        <RailButton
          label={t('chat.tool.transliteration')}
          anchor="tool.translit"
          active={transliterationEnabled}
          onClick={toggleTransliteration}
        >
          <Languages className="size-4" />
        </RailButton>
      )}
    </div>
  )
}
