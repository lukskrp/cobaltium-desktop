import { useEffect, useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useT } from '@renderer/lib/i18n'
import { useChatStore } from '@renderer/features/chat/chat-store'
import { clampDragHeight, computeBoxHeight } from '../composer-height'

/** Auto-fit ceiling for typing (historical behavior). */
const AUTO_CAP_PX = 200
/** Manual-drag ceiling as a viewport fraction (messages area keeps the rest). */
const MANUAL_CAP_VH = 0.4
/** Floor matching the textarea `min-h-9`. */
const MIN_HEIGHT_PX = 36
/** Keyboard resize step for the divider. */
const KEY_STEP_PX = 24

function manualCapPx(): number {
  if (typeof window === 'undefined') return 800
  return Math.max(AUTO_CAP_PX, Math.floor(window.innerHeight * MANUAL_CAP_VH))
}

export function Composer(): React.JSX.Element {
  const t = useT()
  const isGenerating = useChatStore((s) => s.isGenerating)
  const send = useChatStore((s) => s.send)
  const cancel = useChatStore((s) => s.cancel)
  const updateDraft = useChatStore((s) => s.updateDraft)
  const [text, setText] = useState(() => {
    const id = useChatStore.getState().activeThreadId
    return useChatStore.getState().threads.find((t) => t.id === id)?.draft ?? ''
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Height set by a divider drag (null until dragged). Auto-fit never shrinks
  // below it; submit/thread-switch clears it (remount resets refs).
  const userHeightRef = useRef<number | null>(null)
  // Active edge-drag state (null when not dragging).
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  function applyHeight(px: number): void {
    const el = textareaRef.current
    if (!el) return
    el.style.height = `${px}px`
  }

  // Size the textarea to its content on mount (the component is keyed per thread).
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    applyHeight(computeBoxHeight(el.scrollHeight, null, AUTO_CAP_PX, manualCapPx()))
  }, [])

  /** Apply a divider-driven height (drag or keyboard). */
  function adjustHeight(px: number): void {
    const el = textareaRef.current
    if (!el) return
    const next = clampDragHeight(px, MIN_HEIGHT_PX, manualCapPx())
    userHeightRef.current = next
    el.style.height = `${next}px`
  }

  function onStripPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    const el = textareaRef.current
    if (!el) return
    event.preventDefault()
    dragRef.current = { startY: event.clientY, startHeight: el.clientHeight }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onStripPointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current
    if (!drag) return
    adjustHeight(drag.startHeight + (drag.startY - event.clientY))
  }

  function endDrag(): void {
    dragRef.current = null
  }

  function onStripKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const el = textareaRef.current
    if (!el) return
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      adjustHeight(el.clientHeight + (event.key === 'ArrowUp' ? KEY_STEP_PX : -KEY_STEP_PX))
    }
  }

  function resize(): void {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    applyHeight(computeBoxHeight(el.scrollHeight, userHeightRef.current, AUTO_CAP_PX, manualCapPx()))
  }

  function submit(): void {
    const value = text.trim()
    if (value === '' || isGenerating) return
    setText('')
    userHeightRef.current = null
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    void send(value)
  }

  return (
    <div className="border-t border-border bg-background/60 px-6 pb-4 pt-0">
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('chat.resizeHandle')}
        title={t('chat.resizeHandle')}
        tabIndex={0}
        onPointerDown={onStripPointerDown}
        onPointerMove={onStripPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onStripKeyDown}
        className="group -mx-6 flex h-4 cursor-row-resize touch-none select-none items-center justify-center outline-none"
      >
        <span className="h-1 w-16 rounded-full bg-transparent transition-colors group-hover:bg-accent-foreground/30 group-focus-visible:bg-accent-foreground/30 group-active:bg-accent-foreground/50" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          data-tour="chat.input"
          value={text}
          rows={1}
          placeholder={t('chat.placeholder')}
          onChange={(event) => {
            setText(event.target.value)
            updateDraft(event.target.value)
            resize()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          className="composer-input max-h-[40vh] min-h-9 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isGenerating ? (
          <Button variant="secondary" onClick={cancel}>
            {t('chat.stop')}
          </Button>
        ) : (
          <Button onClick={submit} disabled={text.trim() === ''}>
            {t('chat.send')}
          </Button>
        )}
      </div>
    </div>
  )
}
