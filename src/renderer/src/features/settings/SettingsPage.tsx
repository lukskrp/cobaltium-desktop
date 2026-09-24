import { useEffect, useState } from 'react'
import { CLOUD_PROVIDERS, getProviderPreset, type CloudProviderPreset } from '@shared/domain/llm'
import { Button } from '@renderer/components/ui/button'
import { LanguageSelect } from '@renderer/features/chat/components/LanguageSelect'
import { TtsSection } from '@renderer/features/tts/TtsSection'
import { SttSection } from './SttSection'
import { BackupSection } from './BackupSection'
import { useTourStore } from '@renderer/features/onboarding/tour-store'
import { UpdateSection } from './UpdateSection'
import { UI_LANGUAGE_CODES, useT } from '@renderer/lib/i18n'
import { useSettingsStore } from './settings-store'

function Section({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  dataTour,
  children
}: {
  label: string
  hint?: string
  dataTour?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label data-tour={dataTour} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

const inputClass =
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'

/** Base URL + model editor. Remounted (via key) whenever the provider changes. */
function ProviderFields({
  preset,
  initialBaseUrl,
  initialModel,
  onCommitBaseUrl,
  onCommitModel
}: {
  preset: CloudProviderPreset
  initialBaseUrl: string
  initialModel: string
  onCommitBaseUrl: (value: string) => void
  onCommitModel: (value: string) => void
}): React.JSX.Element {
  const t = useT()
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl)
  const [model, setModel] = useState(initialModel)

  return (
    <>
      <Field label={t('settings.baseUrl')} dataTour="settings.baseUrl" hint={preset.baseUrl ? t('settings.baseUrlDefault', preset.baseUrl) : t('settings.baseUrlHint')}>
        <input
          className={inputClass}
          value={baseUrl}
          placeholder={preset.baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          onBlur={() => onCommitBaseUrl(baseUrl.trim())}
        />
      </Field>

      <Field label={t('settings.model')} dataTour="settings.model">
        <input
          className={inputClass}
          list="provider-models"
          value={model}
          placeholder={preset.knownModels[0] ?? 'model-id'}
          onChange={(event) => setModel(event.target.value)}
          onBlur={() => onCommitModel(model.trim())}
        />
        <datalist id="provider-models">
          {preset.knownModels.map((known) => (
            <option key={known} value={known} />
          ))}
        </datalist>
      </Field>
    </>
  )
}

/** Numeric input that holds a local draft while typing; only commits on blur/Enter. */
function NumericInput({
  value,
  min,
  max,
  step,
  commit,
  className
}: {
  value: number
  min: number
  max: number
  step?: number
  commit: (value: number) => void
  className?: string
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)

  function flush(): void {
    const raw = draft ?? String(value)
    const parsed = Number(raw)
    const clamped = Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : value))
    setDraft(null)
    commit(clamped)
  }

  return (
    <input
      className={className}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={flush}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          flush()
        }
      }}
    />
  )
}

export function SettingsPage(): React.JSX.Element {
  const t = useT()
  const settings = useSettingsStore((s) => s.settings)
  const patch = useSettingsStore((s) => s.patch)
  const selectProvider = useSettingsStore((s) => s.selectProvider)
  const providerInfo = useSettingsStore((s) => s.providerInfo)
  const keyPresence = useSettingsStore((s) => s.keyPresence)
  const saveKey = useSettingsStore((s) => s.saveKey)
  const clearKey = useSettingsStore((s) => s.clearKey)
  const load = useSettingsStore((s) => s.load)
  const loaded = useSettingsStore((s) => s.loaded)

  const [apiKey, setApiKey] = useState('')
  const [translationApiKey, setTranslationApiKey] = useState('')
  const [fastTranslateApiKey, setFastTranslateApiKey] = useState('')

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  const preset = getProviderPreset(settings.cloudProvider)
  const hasKey = !!keyPresence[settings.cloudProvider]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.description')}</p>
      </div>

      <Section title={t('settings.provider.title')} description={t('settings.provider.description')}>
        <Field label={t('settings.provider.label')}>
          <select
            data-tour="settings.provider"
            className={inputClass}
            value={settings.cloudProvider}
            onChange={(event) => void selectProvider(event.target.value)}
          >
            {CLOUD_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </Field>

        {loaded && (
          <ProviderFields
            key={settings.cloudProvider}
            preset={preset}
            initialBaseUrl={settings.llmBaseUrl}
            initialModel={settings.llmModel}
            onCommitBaseUrl={(value) => void patch({ llmBaseUrl: value })}
            onCommitModel={(value) => void patch({ llmModel: value })}
          />
        )}

        {preset.requiresKey && (
          <Field
            label={t('settings.apiKey')}
            dataTour="settings.apiKey"
            hint={hasKey ? t('settings.apiKeySaved') : t('settings.apiKeyHint')}
          >
            <div className="flex items-center gap-2">
              <input
                className={inputClass}
                type="password"
                value={apiKey}
                placeholder={hasKey ? '•••••••• (stored)' : 'sk-…'}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <Button
                onClick={() => {
                  void saveKey(settings.cloudProvider, apiKey)
                  setApiKey('')
                }}
                disabled={apiKey.trim() === ''}
              >
                {t('settings.saveKey')}
              </Button>
              <Button
                variant="outline"
                onClick={() => void clearKey(settings.cloudProvider)}
                disabled={!hasKey}
              >
                {t('settings.clearKey')}
              </Button>
            </div>
          </Field>
        )}

        {providerInfo && (
          <p className="text-xs text-muted-foreground">
            {t('settings.active', providerInfo.label, providerInfo.model, providerInfo.baseUrl)}
          </p>
        )}
      </Section>

      <Section title={t('settings.params.title')}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('settings.maxTokens')} dataTour="settings.maxTokens">
            <NumericInput
              className={inputClass}
              value={settings.llmMaxTokens}
              min={64}
              max={131072}
              commit={(value) => void patch({ llmMaxTokens: value })}
            />
          </Field>
          <Field label={t('settings.temperature')} dataTour="settings.temperature">
            <NumericInput
              className={inputClass}
              value={settings.llmTemperature}
              min={0}
              max={2}
              step={0.1}
              commit={(value) => void patch({ llmTemperature: value })}
            />
          </Field>
        </div>
        <label data-tour="settings.enableLlm" className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.llmEnabled}
            onChange={(event) => void patch({ llmEnabled: event.target.checked })}
          />
          {t('settings.enableLlm')}
        </label>
      </Section>

      <Section
        title={t('settings.translation.title')}
        description={t('settings.translation.description')}
      >
        <Field label={t('settings.provider.label')} dataTour="settings.translation.provider">
          <select
            className={inputClass}
            value={settings.translationProvider}
            onChange={(event) => void patch({ translationProvider: event.target.value })}
          >
            <option value="none">{t('settings.translation.builtIn')}</option>
            <option value="deepl">{t('settings.translation.deepl')}</option>
            <option value="google">{t('settings.translation.google')}</option>
          </select>
        </Field>

        {settings.translationProvider === 'deepl' && (
          <Field label={t('settings.translation.deepl')} dataTour="settings.translation.deepl">
            <select
              className={inputClass}
              value={settings.deeplPlan}
              onChange={(event) => void patch({ deeplPlan: event.target.value })}
            >
              <option value="free">{t('settings.translation.planFree')}</option>
              <option value="pro">{t('settings.translation.planPro')}</option>
            </select>
          </Field>
        )}

        {settings.translationProvider !== 'none' && (
          <Field
            label={t('settings.translation.keyLabel')}
            dataTour="settings.translation.google"
            hint={
              keyPresence[settings.translationProvider]
                ? t('settings.translation.keySaved')
                : t('settings.translation.needsKey')
            }
          >
            <div className="flex items-center gap-2">
              <input
                className={inputClass}
                type="password"
                value={translationApiKey}
                placeholder={keyPresence[settings.translationProvider] ? '•••••••• (stored)' : 'API key'}
                onChange={(event) => setTranslationApiKey(event.target.value)}
              />
              <Button
                onClick={() => {
                  void saveKey(settings.translationProvider, translationApiKey)
                  setTranslationApiKey('')
                }}
                disabled={translationApiKey.trim() === ''}
              >
                {t('settings.saveKey')}
              </Button>
              <Button
                variant="outline"
                onClick={() => void clearKey(settings.translationProvider)}
                disabled={!keyPresence[settings.translationProvider]}
              >
                {t('settings.clearKey')}
              </Button>
            </div>
          </Field>
        )}
      </Section>

      <Section title={t('settings.fastTranslation.title')} description={t('settings.fastTranslation.description')}>
        <label data-tour="settings.fastTranslate" className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.fastTranslateEnabled}
            onChange={(event) => void patch({ fastTranslateEnabled: event.target.checked })}
          />
          {t('settings.fastTranslation.enable')}
        </label>
        {settings.fastTranslateEnabled && (
          <>
            <Field label={t('settings.fastTranslation.baseUrl')} hint={t('settings.fastTranslation.baseUrlHint')}>
              <input
                className={inputClass}
                value={settings.fastTranslateBaseUrl}
                placeholder="http://host:port/v1"
                onChange={(event) => void patch({ fastTranslateBaseUrl: event.target.value })}
              />
            </Field>
            <Field label={t('settings.fastTranslation.model')}>
              <input
                className={inputClass}
                value={settings.fastTranslateModel}
                placeholder="qwen-2.5-1.5b-instruct"
                onChange={(event) => void patch({ fastTranslateModel: event.target.value })}
              />
            </Field>
            <Field
              label={t('settings.translation.keyLabel')}
              hint={keyPresence['fast-translate'] ? t('settings.translation.keySaved') : t('settings.translation.needsKey')}
            >
              <div className="flex items-center gap-2">
                <input
                  className={inputClass}
                  type="password"
                  value={fastTranslateApiKey}
                  placeholder={keyPresence['fast-translate'] ? '•••••••• (stored)' : 'API key'}
                  onChange={(event) => setFastTranslateApiKey(event.target.value)}
                />
                <Button
                  onClick={() => { void saveKey('fast-translate', fastTranslateApiKey); setFastTranslateApiKey('') }}
                  disabled={fastTranslateApiKey.trim() === ''}
                >
                  {t('settings.saveKey')}
                </Button>
                <Button variant="outline" onClick={() => void clearKey('fast-translate')} disabled={!keyPresence['fast-translate']}>
                  {t('settings.clearKey')}
                </Button>
              </div>
            </Field>
          </>
        )}
      </Section>

      <Section title={t('settings.reading.title')}>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.glossaryCacheEnabled}
            onChange={(event) => void patch({ glossaryCacheEnabled: event.target.checked })}
          />
          {t('settings.glossaryCache')}
        </label>
        <p className="text-xs text-muted-foreground">{t('settings.glossaryCacheDesc')}</p>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.transliterationEnabled}
            onChange={(event) => void patch({ transliterationEnabled: event.target.checked })}
          />
          {t('settings.transliteration')}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('settings.selectionMode')}>
            <select
              className={inputClass}
              value={settings.selectionMode}
              onChange={(event) => void patch({ selectionMode: event.target.value })}
            >
              <option value="source">{t('settings.selectionMode.source')}</option>
              <option value="gloss">{t('settings.selectionMode.gloss')}</option>
              <option value="both">{t('settings.selectionMode.both')}</option>
            </select>
          </Field>

          <Field label={t('settings.saveVolume')} hint={t('settings.saveVolumeDesc')}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.saveVolume}
              onChange={(event) => void patch({ saveVolume: Number(event.target.value) })}
              className="w-full"
            />
          </Field>
        </div>
      </Section>

      <Section title={t('settings.speech.title')}>
        <p className="text-xs text-muted-foreground">{t('settings.speech.description')}</p>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.micEnabled}
            onChange={(event) => void patch({ micEnabled: event.target.checked })}
          />
          {t('settings.voice.micEnable')}
        </label>
        <p className="text-xs text-muted-foreground">{t('settings.voice.micHint')}</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('settings.voice.input')}>
            <LanguageSelect
              className="h-9 w-full text-sm"
              value={settings.voiceInputLang}
              includeAuto
              onChange={(value) => void patch({ voiceInputLang: value })}
            />
          </Field>
          <Field label={t('settings.voice.response')}>
            <LanguageSelect
              className="h-9 w-full text-sm"
              value={settings.voiceResponseLang}
              includeAuto
              onChange={(value) => void patch({ voiceResponseLang: value })}
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.voiceTtsEnabled}
            onChange={(event) => void patch({ voiceTtsEnabled: event.target.checked })}
          />
          {t('settings.voice.tts')}
        </label>
      </Section>

      <Section title={t('settings.tts.title')}>
        <TtsSection />
      </Section>

      <Section title={t('settings.stt.title')}>
        <SttSection />
      </Section>

      <Section title={t('settings.languages.title')}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('settings.learning')}>
            <LanguageSelect
              className="h-9 w-full text-sm"
              value={settings.learnLang}
              onChange={(value) => void patch({ learnLang: value })}
            />
          </Field>
          <Field label={t('settings.native')}>
            <LanguageSelect
              className="h-9 w-full text-sm"
              includeAuto
              value={settings.targetLang}
              onChange={(value) => void patch({ targetLang: value })}
            />
          </Field>
        </div>
      </Section>

      <Section title={t('settings.interface.title')}>
        <Field label={t('settings.interface.language')}>
          <select
            className={inputClass}
            value={settings.uiLanguage}
            onChange={(event) => void patch({ uiLanguage: event.target.value })}
          >
            <option value="auto">{t('settings.interface.auto')}</option>
            {UI_LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`lang.${code}`)}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-muted-foreground">{t('settings.interface.note')}</p>
        <Button variant="outline" size="sm" onClick={() => useTourStore.getState().start()}>
          {t('tour.replay')}
        </Button>
      </Section>

      <Section title={t('settings.update.title')}>
        <UpdateSection />
      </Section>

      <Section title={t('settings.backup.title')}>
        <BackupSection />
      </Section>

      <Section title={t('settings.reminders.title')}>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.remindersEnabled}
            onChange={(event) => void patch({ remindersEnabled: event.target.checked })}
          />
          {t('settings.reminders.enable')}
        </label>
        <p className="text-xs text-muted-foreground">{t('settings.reminders.hint')}</p>
      </Section>
    </div>
  )
}
