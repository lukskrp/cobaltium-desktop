import { ScriptDetector } from './script-detector'
import { directionOf, type ScriptDirection, type ScriptSystem } from './scripts'
import { LanguageProfileRegistry, type LanguageProfile } from './profiles'
import {
  KoreanTokenizer,
  WhitespaceTokenizer,
  createCjkTokenizer,
  type TextSegment,
  type Tokenizer
} from './tokenizers'
import {
  ArabicRomanizer,
  Elot743Romanizer,
  HebrewRomanizer,
  HepburnRomanizer,
  IastRomanizer,
  Iso9Romanizer,
  PinyinRomanizer,
  RevisedRomanization,
  UniPersRomanizer,
  UrduRomanizer,
  type Romanization,
  type Romanizer
} from './romanization'
import {
  ArabicHebrewTransliterator,
  GreekCyrillicTransliterator,
  HanKanjiTransliterator,
  SyriacArabicTransliterator,
  type Transliterator
} from './transliterators'
import {
  TieredInflectionEngine,
  type Dictionary,
  type DictionaryEntry,
  type InflectionEngine,
  type InflectionParadigm,
  type MorphologyAnalyzer,
  type MorphologyResult
} from './inflection'
import { createLlmDictionary, createLlmInflection, createLlmMorphology, type CompleteFn } from './llm-adapters'
import { InflectionSpecs } from './inflection'
import { BUNDLED_INFLECTORS } from './inflectors'

/** Bundle of every engine output for one piece of text, for the UI layer. */
export interface LanguageAnalysis {
  text: string
  lang: string
  script: ScriptSystem | null
  direction: ScriptDirection
  words: TextSegment[]
  romanization: Romanization | null
  transliterations: Record<string, string>
  ipa: string | null
}

/** The single entry point for the language engine. */
export class LanguageEngine {
  constructor(
    private readonly profiles: LanguageProfileRegistry,
    private readonly tokenizers: Map<string, Tokenizer>,
    private readonly romanizers: Map<string, Romanizer>,
    private readonly transliterators: Map<string, Transliterator>,
    private readonly morphology: MorphologyAnalyzer | null = null,
    private readonly inflection: InflectionEngine | null = null,
    private readonly dictionary: Dictionary | null = null
  ) {}

  profile(lang: string): LanguageProfile | null {
    return this.profiles.profile(lang)
  }

  detectScript(text: string): ScriptSystem | null {
    return ScriptDetector.detect(text)
  }

  detectDirection(text: string): ScriptDirection {
    const script = this.detectScript(text)
    return script ? directionOf(script) : 'ltr'
  }

  tokenize(text: string, lang: string): TextSegment[] {
    const key = this.profiles.profile(lang)?.tokenizer ?? 'whitespace'
    return (this.tokenizers.get(key) ?? WhitespaceTokenizer).segment(text)
  }

  romanize(text: string, lang: string): Romanization | null {
    const scheme = this.profiles.profile(lang)?.romanization
    if (!scheme) return null
    return this.romanizers.get(scheme)?.romanize(text) ?? null
  }

  hasRomanization(lang: string): boolean {
    const scheme = this.profiles.profile(lang)?.romanization
    return scheme != null && this.romanizers.has(scheme)
  }

  script(lang: string): ScriptSystem | null {
    return this.profiles.scriptSystem(lang)
  }

  hasDifferentScript(a: string, b: string): boolean {
    const sa = this.script(a)
    const sb = this.script(b)
    return sa != null && sb != null && sa !== sb
  }

  romanizeWord(text: string, lang: string): string | null {
    if (text.trim() === '') return null
    const latin = this.romanize(text, lang)?.latin
    if (latin == null) return null
    return latin.trim() !== '' && latin !== text ? latin : null
  }

  transliterate(text: string, name: string): string | null {
    return this.transliterators.get(name)?.transliterate(text) ?? null
  }

  async analyzeWord(word: string, lang: string): Promise<MorphologyResult | null> {
    return this.morphology ? this.morphology.analyze(word, lang) : null
  }

  async inflect(lemma: string, lang: string, pos: string | null = null): Promise<InflectionParadigm | null> {
    return this.inflection ? this.inflection.inflect(lemma, lang, pos) : null
  }

  async lookup(word: string, lang: string): Promise<DictionaryEntry[] | null> {
    return this.dictionary ? this.dictionary.lookup(word, lang) : null
  }

  analyze(text: string, lang: string): LanguageAnalysis {
    const script = this.detectScript(text)
    const words = this.tokenize(text, lang)
    const romanization = this.romanize(text, lang)
    const enabled = new Set(this.profiles.profile(lang)?.transliterations ?? [])
    const present = new Set(ScriptDetector.scripts(text))
    const transliterations: Record<string, string> = {}
    for (const [name, impl] of this.transliterators) {
      if (enabled.has(name) && present.has(impl.from)) {
        transliterations[name] = impl.transliterate(text)
      }
    }
    return {
      text,
      lang,
      script,
      direction: script ? directionOf(script) : 'ltr',
      words,
      romanization,
      transliterations,
      ipa: null
    }
  }
}

export interface LanguageEngineComponents {
  engine: LanguageEngine
  tokenizers: Map<string, Tokenizer>
  romanizers: Map<string, Romanizer>
  transliterators: Map<string, Transliterator>
}

export interface CreateLanguageEngineOptions {
  /** Non-streaming completion used to build the LLM morphology/inflection/dictionary tiers. */
  complete?: CompleteFn
  profiles?: LanguageProfileRegistry
  /** Override or add tokenizers by profile key (e.g. a native Japanese tokenizer). */
  tokenizers?: Record<string, Tokenizer>
  /** Override or add romanizers by scheme (e.g. kanji-reading-aware Hepburn). */
  romanizers?: Record<string, Romanizer>
  /** Override or add transliterators by name. */
  transliterators?: Record<string, Transliterator>
}

/** Assembles the LanguageEngine with the built-in tokenizers/romanizers/transliterators. */
export function createLanguageEngine(
  options: CreateLanguageEngineOptions = {}
): LanguageEngineComponents {
  const profiles = options.profiles ?? new LanguageProfileRegistry()
  const pinyin = new PinyinRomanizer()

  const tokenizers = new Map<string, Tokenizer>([
    ['whitespace', WhitespaceTokenizer],
    ['cjk', createCjkTokenizer()],
    ['korean', KoreanTokenizer],
    ['sudachi', createCjkTokenizer()]
  ])

  const romanizers = new Map<string, Romanizer>([
    ['iso-9', new Iso9Romanizer()],
    ['elot-743', new Elot743Romanizer()],
    ['hepburn', new HepburnRomanizer()],
    ['rr-2000', new RevisedRomanization()],
    ['iast', new IastRomanizer()],
    ['din-31635', new ArabicRomanizer()],
    ['unipers', new UniPersRomanizer()],
    ['urdu', new UrduRomanizer()],
    ['ala-lc', new HebrewRomanizer()],
    ['pinyin', pinyin]
  ])

  const transliterators = new Map<string, Transliterator>([
    ['han-kanji', new HanKanjiTransliterator('han-kanji', 'han', 'han')],
    ['kanji-han', new HanKanjiTransliterator('kanji-han', 'han', 'han')],
    ['ar-he', new ArabicHebrewTransliterator('ar-he', 'arabic', 'hebrew')],
    ['he-ar', new ArabicHebrewTransliterator('he-ar', 'hebrew', 'arabic')],
    ['el-cyr', new GreekCyrillicTransliterator('el-cyr', 'greek', 'cyrillic')],
    ['cyr-el', new GreekCyrillicTransliterator('cyr-el', 'cyrillic', 'greek')],
    ['syr-ar', new SyriacArabicTransliterator('syr-ar', 'syriac', 'arabic')],
    ['ar-syr', new SyriacArabicTransliterator('ar-syr', 'arabic', 'syriac')]
  ])

  let morphology: MorphologyAnalyzer | null = null
  let inflection: InflectionEngine | null = null
  let dictionary: Dictionary | null = null
  if (options.complete) {
    morphology = createLlmMorphology(options.complete)
    inflection = new TieredInflectionEngine(
      BUNDLED_INFLECTORS,
      createLlmInflection(options.complete, InflectionSpecs)
    )
    dictionary = createLlmDictionary(options.complete)
  }

  for (const [key, value] of Object.entries(options.tokenizers ?? {})) tokenizers.set(key, value)
  for (const [key, value] of Object.entries(options.romanizers ?? {})) romanizers.set(key, value)
  for (const [key, value] of Object.entries(options.transliterators ?? {})) {
    transliterators.set(key, value)
  }

  const engine = new LanguageEngine(
    profiles,
    tokenizers,
    romanizers,
    transliterators,
    morphology,
    inflection,
    dictionary
  )

  return { engine, tokenizers, romanizers, transliterators }
}
