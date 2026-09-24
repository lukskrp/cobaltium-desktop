import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useT } from '@renderer/lib/i18n'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useTourStore } from './tour-store'

const STEPS: { title: string; body: string }[] = [
  { title: 'onboarding.welcome.title', body: 'onboarding.welcome.body' },
  { title: 'onboarding.model.title', body: 'onboarding.model.body' },
  { title: 'onboarding.modes.title', body: 'onboarding.modes.body' },
  { title: 'onboarding.study.title', body: 'onboarding.study.body' }
]

export function OnboardingDialog(): React.JSX.Element | null {
  const t = useT()
  const loaded = useSettingsStore((s) => s.loaded)
  const settings = useSettingsStore((s) => s.settings)
  const patch = useSettingsStore((s) => s.patch)
  const [step, setStep] = useState(0)

  if (!loaded || settings.onboardingDone) return null
  const current = STEPS[step]
  const last = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('onboarding.step', step + 1, STEPS.length)}
        </div>
        <h2 className="text-lg font-semibold">{t(current.title)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t(current.body)}</p>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => void patch({ onboardingDone: true })}>
            {t('onboarding.skip')}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((value) => value - 1)}>
                {t('onboarding.back')}
              </Button>
            )}
            <Button
              onClick={() => {
                if (last) {
                  void patch({ onboardingDone: true })
                  useTourStore.getState().start()
                } else {
                  setStep((value) => value + 1)
                }
              }}
            >
              {last ? t('onboarding.getStarted') : t('onboarding.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
