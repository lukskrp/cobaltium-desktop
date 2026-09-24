import { ScriptRegistry, type ScriptSystem } from './scripts'

/** Per-language engine wiring (port of `profile/LanguageProfile.kt` + registry). */
export interface LanguageProfile {
  language: string
  script: string
  dictionary: string | null
  tokenizer: string
  morphology: string | null
  romanization: string | null
  transliterations: string[]
  furigana: boolean
  ipa: string | null
}

function profile(
  language: string,
  overrides: Partial<Omit<LanguageProfile, 'language'>> = {}
): LanguageProfile {
  return {
    language,
    script: 'latin',
    dictionary: null,
    tokenizer: 'whitespace',
    morphology: null,
    romanization: null,
    transliterations: [],
    furigana: false,
    ipa: 'espeak',
    ...overrides
  }
}

/** Built-in wiring matching `assets/lang-profiles/*.json`. */
export const BUILT_IN_PROFILES: Record<string, LanguageProfile> = {
  en: profile('en', { dictionary: 'wordnet' }),
  fi: profile('fi', { dictionary: 'omorfi', morphology: 'omorfi' }),
  es: profile('es'),
  it: profile('it'),
  sv: profile('sv'),
  da: profile('da'),
  nl: profile('nl'),
  id: profile('id'),
  tr: profile('tr'),
  de: profile('de'),
  fr: profile('fr'),
  'pt-br': profile('pt-br'),
  pl: profile('pl', { morphology: 'pymorphy' }),
  el: profile('el', {
    script: 'greek',
    romanization: 'elot-743',
    transliterations: ['el-cyr']
  }),
  ru: profile('ru', {
    script: 'cyrillic',
    romanization: 'iso-9',
    morphology: 'pymorphy',
    transliterations: ['cyr-el']
  }),
  bg: profile('bg', { script: 'cyrillic', romanization: 'iso-9' }),
  zh: profile('zh', {
    script: 'han',
    dictionary: 'cedict',
    tokenizer: 'cjk',
    romanization: 'pinyin',
    transliterations: ['han-kanji']
  }),
  ja: profile('ja', {
    script: 'kana',
    dictionary: 'ipadic',
    tokenizer: 'sudachi',
    morphology: 'ipadic',
    romanization: 'hepburn',
    transliterations: ['kanji-han'],
    furigana: true,
    ipa: 'openjtalk'
  }),
  ko: profile('ko', {
    script: 'hangul',
    tokenizer: 'korean',
    romanization: 'rr-2000'
  }),
  hi: profile('hi', {
    script: 'devanagari',
    dictionary: 'apertium',
    romanization: 'iast'
  }),
  ar: profile('ar', {
    script: 'arabic',
    dictionary: 'wordfreq',
    romanization: 'din-31635',
    transliterations: ['ar-he', 'ar-syr']
  }),
  fa: profile('fa', { script: 'arabic', romanization: 'unipers' }),
  ur: profile('ur', { script: 'arabic', romanization: 'urdu' }),
  he: profile('he', {
    script: 'hebrew',
    romanization: 'ala-lc',
    transliterations: ['he-ar']
  })
}

export class LanguageProfileRegistry {
  private readonly profiles: Map<string, LanguageProfile>

  /** Extra profiles (e.g. loaded from JSON) override / augment the built-ins. */
  constructor(extra: Iterable<LanguageProfile> = []) {
    this.profiles = new Map(Object.entries(BUILT_IN_PROFILES))
    for (const entry of extra) this.profiles.set(entry.language, entry)
  }

  profile(lang: string): LanguageProfile | null {
    return this.profiles.get(lang.toLowerCase()) ?? null
  }

  all(): LanguageProfile[] {
    return [...this.profiles.values()].sort((a, b) => a.language.localeCompare(b.language))
  }

  contains(lang: string): boolean {
    return this.profiles.has(lang.toLowerCase())
  }

  scriptSystem(lang: string): ScriptSystem | null {
    const entry = this.profile(lang)
    return entry ? ScriptRegistry.fromKey(entry.script) : null
  }
}
