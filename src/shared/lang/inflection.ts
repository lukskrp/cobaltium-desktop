import { extractBalancedJsonObject } from '../domain/json-parser'

/** Whether a paradigm conjugates a verb or declines a noun/adjective/etc. */
export type ParadigmKind = 'conjugation' | 'declension'

/** A row in a table: a label (person, case, ...) and one cell per column. */
export interface ParadigmRow {
  label: string
  cells: string[]
}

/** One table: columns header (e.g. "Singular","Plural") + labelled rows. */
export interface ParadigmTable {
  title: string
  columns: string[]
  rows: ParadigmRow[]
}

/** A LangDex-style inflection paradigm. `kind` is null when nothing applies. */
export interface InflectionParadigm {
  lemma: string
  lang: string
  kind: ParadigmKind | null
  note: string
  tables: ParadigmTable[]
}

export function paradigmIsEmpty(paradigm: InflectionParadigm): boolean {
  return paradigm.tables.length === 0
}

/** Conjugates and declines lexemes (the LangDex-like lexicon backend). */
export interface InflectionEngine {
  readonly engine: string
  inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null>
}

/** Morphological analysis of a single word. */
export interface MorphologyResult {
  word: string
  lang: string
  lemma?: string | null
  pos?: string | null
  inflected: Record<string, string>
}

export interface MorphologyAnalyzer {
  readonly engine: string
  analyze(word: string, lang: string): Promise<MorphologyResult | null>
}

/** A single dictionary entry for a word in a language. */
export interface DictionaryEntry {
  headword: string
  lang: string
  senses: string[]
  reading?: string | null
  pos?: string | null
}

export interface Dictionary {
  readonly source: string
  lookup(word: string, lang: string): Promise<DictionaryEntry[] | null>
}

/** Parses the LangDex-style paradigm JSON produced by the inflection prompt. */
export const InflectionParser = {
  parse(text: string): InflectionParadigm | null {
    const obj = extractBalancedJsonObject(text)
    if (!obj) return null
    const kindStr = typeof obj.kind === 'string' ? obj.kind : null
    const kind: ParadigmKind | null =
      kindStr != null && kindStr.toLowerCase() === 'conjugation'
        ? 'conjugation'
        : kindStr != null && kindStr.toLowerCase() === 'declension'
          ? 'declension'
          : null
    const note = typeof obj.note === 'string' ? obj.note : ''
    const rawTables = Array.isArray(obj.tables) ? obj.tables : []
    const tables: ParadigmTable[] = []
    for (const element of rawTables) {
      if (!element || typeof element !== 'object') continue
      const table = element as Record<string, unknown>
      const title = typeof table.title === 'string' ? table.title.trim() : ''
      if (title === '') continue
      const columns = Array.isArray(table.columns)
        ? table.columns.filter((c): c is string => typeof c === 'string')
        : []
      const rawRows = Array.isArray(table.rows) ? table.rows : []
      const rows: ParadigmRow[] = []
      for (const rawRow of rawRows) {
        if (!rawRow || typeof rawRow !== 'object') continue
        const row = rawRow as Record<string, unknown>
        const label = typeof row.label === 'string' ? row.label.trim() : ''
        if (label === '') continue
        const cells = Array.isArray(row.cells)
          ? row.cells.filter((c): c is string => typeof c === 'string')
          : []
        rows.push({ label, cells })
      }
      tables.push({ title, columns, rows })
    }
    return { lemma: '', lang: '', kind, note, tables }
  }
}

/** Per-language inventory of the inflection tables LangDex should produce. */
export interface LanguageInflectionSpec {
  lang: string
  verbTables: string[]
  personLabels: string[]
  declensionColumns: string[]
  nonFiniteForms: string[]
}

function spec(
  lang: string,
  verbTables: string[],
  personLabels: string[],
  declensionColumns: string[],
  nonFiniteForms: string[]
): LanguageInflectionSpec {
  return { lang, verbTables, personLabels, declensionColumns, nonFiniteForms }
}

export const InflectionSpecs: Record<string, LanguageInflectionSpec> = {
  es: spec(
    'es',
    [
      'Presente',
      'Pretérito perfecto simple',
      'Pretérito imperfecto',
      'Futuro simple',
      'Condicional simple',
      'Pretérito perfecto compuesto',
      'Pluscuamperfecto',
      'Presente de subjuntivo',
      'Pretérito imperfecto de subjuntivo',
      'Imperativo'
    ],
    ['yo', 'tú', 'él/ella/usted', 'nosotros/as', 'vosotros/as', 'ellos/ellas/ustedes'],
    ['Singular', 'Plural'],
    ['Infinitivo', 'Gerundio', 'Participio']
  ),
  ru: spec(
    'ru',
    ['Настоящее время', 'Прошедшее время', 'Будущее время', 'Повелительное наклонение'],
    ['я', 'ты', 'он/она/оно', 'мы', 'вы', 'они'],
    ['Singular', 'Plural'],
    ['Инфинитив', 'Причастие', 'Деепричастие']
  ),
  de: spec(
    'de',
    ['Präsens', 'Präteritum', 'Perfekt', 'Futur I', 'Imperativ'],
    ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie'],
    ['Singular', 'Plural'],
    ['Infinitiv', 'Partizip I', 'Partizip II']
  ),
  fr: spec(
    'fr',
    [
      'Présent',
      'Imparfait',
      'Passé simple',
      'Futur simple',
      'Conditionnel présent',
      'Présent du subjonctif',
      'Impératif',
      'Passé composé',
      'Plus-que-parfait'
    ],
    ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'],
    ['Singulier', 'Pluriel'],
    ['Infinitif', 'Participe présent', 'Participe passé']
  ),
  it: spec(
    'it',
    [
      'Presente',
      'Imperfetto',
      'Passato remoto',
      'Futuro semplice',
      'Condizionale presente',
      'Congiuntivo presente',
      'Congiuntivo imperfetto',
      'Imperativo',
      'Passato prossimo',
      'Trapassato prossimo'
    ],
    ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'],
    ['Singolare', 'Plurale'],
    ['Infinito', 'Participio presente', 'Participio passato', 'Gerundio']
  ),
  sv: spec(
    'sv',
    ['Presens', 'Preteritum', 'Supinum'],
    ['jag', 'du', 'han/hon', 'vi', 'ni', 'de'],
    ['Singular', 'Plural'],
    ['Infinitiv', 'Imperativ']
  ),
  da: spec(
    'da',
    ['Nutid', 'Datid', 'Førnutid'],
    ['jeg', 'du', 'han/hun', 'vi', 'I', 'de'],
    ['Singular', 'Plural'],
    ['Infinitiv', 'Bydeform']
  ),
  nl: spec(
    'nl',
    ['Tegenwoordige tijd', 'Verleden tijd', 'Voltooid deelwoord'],
    ['ik', 'jij', 'hij/zij', 'wij', 'jullie', 'zij'],
    ['Singular', 'Plural'],
    ['Infinitief', 'Imperatief']
  ),
  id: spec('id', [], ['saya', 'kamu', 'dia', 'kami', 'kalian', 'mereka'], ['Singular', 'Plural'], []),
  pl: spec(
    'pl',
    ['Czas teraźniejszy', 'Czas przeszły', 'Czas przyszły', 'Tryb rozkazujący'],
    ['ja', 'ty', 'on/ona/ono', 'my', 'wy', 'oni/one'],
    ['Singular', 'Plural'],
    [
      'Bezokolicznik',
      'Imiesłów przymiotnikowy czynny',
      'Imiesłów przysłówkowy współczesny',
      'Imiesłów bierny'
    ]
  ),
  tr: spec(
    'tr',
    [
      'Şimdiki zaman',
      'Geniş zaman',
      'Geçmiş zaman (-di)',
      'Geçmiş zaman (-miş)',
      'Gelecek zaman',
      'Şart kipi',
      'Emir kipi'
    ],
    ['ben', 'sen', 'o', 'biz', 'siz', 'onlar'],
    ['Tekil', 'Çoğul'],
    ['Mastar', 'Ortaç', 'Ulaç']
  ),
  ar: spec(
    'ar',
    ['المضارع', 'الماضي', 'الأمر'],
    ['هو', 'هي', 'أنتَ', 'أنتِ', 'أنا', 'هم', 'هنَّ', 'أنتم', 'أنتنَّ', 'نحن'],
    ['نكرة', 'معرفة'],
    []
  ),
  hi: spec(
    'hi',
    ['वर्तमान काल', 'भूतकाल', 'भविष्यत् काल', 'आज्ञार्थ'],
    ['मैं', 'तुम', 'वह', 'हम', 'आप', 'वे'],
    ['एकवचन', 'बहुवचन'],
    []
  ),
  fa: spec(
    'fa',
    ['حال', 'گذشته', 'امر'],
    ['من', 'تو', 'او', 'ما', 'شما', 'آنها'],
    ['مفرد', 'جمع'],
    []
  ),
  ko: spec('ko', ['현재', '과거', '미래'], ['해요체'], ['형태'], []),
  zh: spec('zh', [], ['我', '你', '他/她', '我们', '你们', '他们/她们'], ['形式'], [])
}

/** Tiered engine: bundled rule engines answer first, then the LLM fallback. */
export class TieredInflectionEngine implements InflectionEngine {
  readonly engine = 'tiered'

  constructor(
    private readonly bundled: Map<string, InflectionEngine>,
    private readonly llm: InflectionEngine
  ) {}

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    const bundled = this.bundled.get(lang.toLowerCase())
    if (bundled) {
      const result = await bundled.inflect(lemma, lang, pos)
      if (result) return result
    }
    return this.llm.inflect(lemma, lang, pos)
  }
}
