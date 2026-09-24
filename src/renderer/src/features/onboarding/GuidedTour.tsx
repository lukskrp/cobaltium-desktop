import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { useT } from '@renderer/lib/i18n'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { applyTourEnterAction, useTourStore } from './tour-store'
import { mainTourSteps } from './tour-steps'

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** Spotlight guided tour across the main pages (port of Android's GuidedTour). */
export function GuidedTour(): React.JSX.Element | null {
  const t = useT()
  const navigate = useNavigate()
  const active = useTourStore((s) => s.active)
  const index = useTourStore((s) => s.index)
  const patch = useSettingsStore((s) => s.patch)
  const [rect, setRect] = useState<Rect | null>(null)
  const [skipConfirm, setSkipConfirm] = useState(false)

  const STEPS = useMemo(() => mainTourSteps(), [])
  const step = STEPS[Math.min(index, STEPS.length - 1)]

  // Step changes always close the skip-confirm dialog; kept out of the effect
  // below (react-hooks/set-state-in-effect) by routing every advance through
  // these helpers.
  function advance(): void {
    setSkipConfirm(false)
    useTourStore.getState().next(STEPS.length)
  }

  function goBack(): void {
    setSkipConfirm(false)
    useTourStore.getState().back()
  }

  useEffect(() => {
    if (!active || !step) return
    let cancelled = false
    let frame = 0
    let timer = 0
    const measure = (): void => {
      if (!step.anchor) {
        setRect(null)
        return
      }
      const element = document.querySelector(`[data-tour="${step.anchor}"]`)
      if (!element) {
        setRect(null)
        return
      }
      if (step.enterAction === 'SCROLL_TO_ANCHOR') {
        element.scrollIntoView({ block: 'center', behavior: 'auto' })
      }
      const box = element.getBoundingClientRect()
      // Zero-size means the target is mounted but not laid out yet (e.g.
      // ProviderFields remount on provider switch); fall back to centered.
      if (box.width === 0 && box.height === 0) {
        setRect(null)
        return
      }
      setRect({ left: box.left, top: box.top, width: box.width, height: box.height })
    }
    // Apply the step's side effects (e.g. reflective mode, which mounts the
    // tool rail) before navigating and measuring, so the anchor exists when
    // the spotlight is placed. Never blocks the tour on failure.
    void applyTourEnterAction(step)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return
        navigate(step.route)
        timer = window.setTimeout(() => {
          frame = requestAnimationFrame(measure)
        }, 140)
      })
    window.addEventListener('resize', measure)
    return () => {
      cancelled = true
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [active, index, navigate, step, STEPS.length])

  const last = index === STEPS.length - 1

  function finish(): void {
    useTourStore.getState().dismiss()
    void patch({ onboardingDone: true })
  }

  // Enter advances the tour exactly like the primary (Next/Done) button.
  // Skipped when the user is typing, when a focused button/link would
  // handle Enter natively, or while the skip-confirm dialog is open.
  useEffect(() => {
    if (!active) return
    function onKeyDown(event: KeyboardEvent): void {
      if (
        event.key !== 'Enter' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return
      }
      if (skipConfirm) return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, a, input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      if (last) {
        finish()
      } else {
        advance()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, last, skipConfirm, STEPS.length])

  if (!active || !step) return null

  const pad = 6
  // Card placement: below the hole by default, flipped above when it would
  // overflow the viewport (port of Android `SpotlightOverlay` flip logic).
  // `placement` is currently always 'auto' (see `tour-steps.ts`); explicit
  // above/below is honored when set.
  const cardStyle = rect
    ? (() => {
        const gap = 14
        const estCardH = 240
        const estCardW = 336
        const below = rect.top + rect.height + gap
        const above = rect.top - gap - estCardH
        let top: number
        if (step.placement === 'above') {
          top = Math.max(above, 8)
        } else if (step.placement === 'below') {
          top = Math.min(below, Math.max(8, window.innerHeight - estCardH - 8))
        } else if (below + estCardH <= window.innerHeight - 8) {
          top = below
        } else {
          top = Math.max(above, 8)
        }
        return {
          top,
          left: Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - estCardW - 16))
        }
      })()
    : undefined

  return (
    <div className="fixed inset-0 z-[60]">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-primary"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)'
          }}
        />
      ) : (
        <div
          className="fixed inset-0 bg-black/55"
          onClick={advance}
        />
      )}

      <div
        className={
          rect
            ? 'fixed z-[61] w-80 rounded-xl border border-border bg-card p-4 shadow-2xl'
            : 'fixed left-1/2 top-1/2 z-[61] w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-4 shadow-2xl'
        }
        style={cardStyle}
      >
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('onboarding.step', index + 1, STEPS.length)}
        </div>
        <h2 className="text-base font-semibold">{t(step.title)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t(step.body)}</p>
        {step.bullets?.map((bullet) => (
          <p key={bullet} className="mt-1 text-sm text-muted-foreground">
            {'•  '}
            {t(bullet)}
          </p>
        ))}

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSkipConfirm(true)}>
            {t('tour.skip')}
          </Button>
          <span className="text-center text-xs italic text-muted-foreground">
            {t('tour.enterHint')}
          </span>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="outline" size="sm" onClick={goBack}>
                {t('tour.back')}
              </Button>
            )}
            <Button size="sm" onClick={() => (last ? finish() : advance())}>
              {last ? t('tour.done') : t('tour.next')}
            </Button>
          </div>
        </div>
      </div>

      {skipConfirm && (
        <div
          className="fixed inset-0 z-[62] grid place-items-center bg-black/50 p-4"
          onClick={() => setSkipConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold">{t('tour.skipConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('tour.skipConfirmBody')}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSkipConfirm(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={finish}>
                {t('tour.skip')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
