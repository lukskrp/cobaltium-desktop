import { useEffect, useMemo } from 'react'
import { BookPlus, Volume2 } from 'lucide-react'
import { SCENARIO_CATEGORIES, type ScenarioTab } from '@shared/domain/scenarios'
import { Button } from '@renderer/components/ui/button'
import { LanguageSign } from '@renderer/components/LanguageSign'
import { cn } from '@renderer/lib/utils'
import { useT } from '@renderer/lib/i18n'
import { speak } from '@renderer/lib/tts'
import { LanguageSelect } from '@renderer/features/chat/components/LanguageSelect'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useScenariosStore } from './scenarios-store'

const TABS: { id: ScenarioTab; label: string }[] = [
  { id: 'vocabulary', label: 'scenarios.tab.vocabulary' },
  { id: 'phrases', label: 'scenarios.tab.phrases' },
  { id: 'dialogues', label: 'scenarios.tab.dialogues' }
]

function CategoryName({ id }: { id: string }): React.JSX.Element {
  return <>{SCENARIO_CATEGORIES.find((category) => category.id === id)?.displayName ?? id}</>
}

export function ScenariosPage(): React.JSX.Element {
  const t = useT()
  const load = useScenariosStore((s) => s.load)
  const scenarios = useScenariosStore((s) => s.scenarios)
  const pair = useScenariosStore((s) => s.pair)
  const categoryFilter = useScenariosStore((s) => s.categoryFilter)
  const setCategoryFilter = useScenariosStore((s) => s.setCategoryFilter)
  const selected = useScenariosStore((s) => s.selected)
  const select = useScenariosStore((s) => s.select)
  const clearSelection = useScenariosStore((s) => s.clearSelection)
  const tab = useScenariosStore((s) => s.tab)
  const setTab = useScenariosStore((s) => s.setTab)
  const saveWord = useScenariosStore((s) => s.saveWord)
  const savePhrase = useScenariosStore((s) => s.savePhrase)
  const saveMessage = useScenariosStore((s) => s.saveMessage)
  const dismissSaveMessage = useScenariosStore((s) => s.dismissSaveMessage)

  const learn = useSettingsStore((s) => s.settings.learnLang)
  const patch = useSettingsStore((s) => s.patch)
  const expectedPair = `fi-${learn}`

  useEffect(() => {
    void load(expectedPair)
  }, [expectedPair, load])

  const source = pair.slice(0, 2)
  const other = pair.length > 3 ? pair.slice(3) : learn

  const categories = useMemo(
    () => [...new Set(scenarios.map((scenario) => scenario.category))],
    [scenarios]
  )
  const filtered = scenarios.filter(
    (scenario) => categoryFilter === null || scenario.category === categoryFilter
  )

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="space-y-2 border-b border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('scenarios.translationLanguage')}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSign kind="help" className="size-5 shrink-0" />
            <LanguageSelect
              className="h-8 w-full text-sm"
              value={learn}
              ariaLabel={t('scenarios.translationLanguage')}
              onChange={(value) => void patch({ learnLang: value })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t('scenarios.hint', other.toUpperCase())}
          </p>
        </div>

        <div data-tour="scenarios.filter" className="border-b border-border p-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={cn(
              'mb-0.5 flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm',
              categoryFilter === null ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
            )}
          >
            {t('scenarios.allCategories')}
          </button>
          {categories.map((category) => (            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={cn(
                'mb-0.5 flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm',
                categoryFilter === category ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
              )}
            >
              <CategoryName id={category} />
            </button>
          ))}
        </div>

        <div data-tour="scenarios.grid" className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              {t('scenarios.empty', pair.toUpperCase())}
            </p>
          )}
          {filtered.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => select(scenario)}
              className={cn(
                'mb-0.5 flex w-full flex-col rounded-md px-2 py-1.5 text-left',
                scenario.id === selected?.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
              )}
            >
              <span className="truncate text-sm font-medium">{scenario.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                <CategoryName id={scenario.category} />
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main data-tour="scenarios.card" className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            {t('scenarios.pick')}
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-border px-6 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">{selected.title}</div>
                <div className="truncate text-xs text-muted-foreground">{selected.description}</div>
              </div>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                {t('common.back')}
              </Button>
            </header>

            <div className="flex gap-1 border-b border-border px-6 py-2">
              {TABS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium',
                    tab === entry.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t(entry.label)}
                </button>
              ))}
            </div>

            {saveMessage && (
              <div className="mx-6 mt-3 flex items-center gap-3 rounded-lg border border-border bg-accent/40 px-3 py-2 text-xs">
                <span className="flex-1">{t(saveMessage)}</span>
                <button type="button" onClick={dismissSaveMessage} className="font-medium hover:underline">
                  {t('common.dismiss')}
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {tab === 'vocabulary' &&
                selected.vocabulary.map((word, index) => (
                  <div key={index} className="mb-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{word.word}</span>
                      {word.pos && <span className="text-xs text-muted-foreground">{word.pos}</span>}
                      <span className="text-sm text-muted-foreground">— {word.translation}</span>
                      <div className="ml-auto flex gap-1">
                        <Button size="icon" variant="ghost" title={t('common.speak')} onClick={() => void speak(word.word, source)}>
                          <Volume2 className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t('scenarios.saveWord')}
                          onClick={() => void saveWord(word, source, other)}
                        >
                          <BookPlus className="size-4" />
                        </Button>
                      </div>
                    </div>
                    {word.example && (
                      <div className="mt-1 text-sm">
                        {word.example}
                        {word.exampleTranslation && (
                          <span className="text-muted-foreground"> — {word.exampleTranslation}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

              {tab === 'phrases' &&
                selected.phrases.map((phrase, index) => (
                  <div key={index} className="mb-2 flex items-center gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{phrase.phrase}</div>
                      <div className="text-sm text-muted-foreground">{phrase.translation}</div>
                      {phrase.context && <div className="text-xs text-muted-foreground">{phrase.context}</div>}
                    </div>
                    <Button size="icon" variant="ghost" title={t('common.speak')} onClick={() => void speak(phrase.phrase, source)}>
                      <Volume2 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t('scenarios.saveWord')}
                      onClick={() => void savePhrase(phrase, source, other)}
                    >
                      <BookPlus className="size-4" />
                    </Button>
                  </div>
                ))}

              {tab === 'dialogues' &&
                selected.dialogues.map((line, index) => (
                  <div key={index} className="mb-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {line.speaker}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t('common.speak')}
                        className="ml-auto"
                        onClick={() => void speak(line.text, source)}
                      >
                        <Volume2 className="size-4" />
                      </Button>
                    </div>
                    <div className="text-sm">{line.text}</div>
                    <div className="text-sm text-muted-foreground">{line.translation}</div>
                  </div>
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
