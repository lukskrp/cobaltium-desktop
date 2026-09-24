import type { InflectionEngine, InflectionParadigm, ParadigmTable } from '../inflection'

/**
 * Bundled Persian (fa) inflector: deterministic, offline LangDex paradigms.
 *
 * Persian is written in an unvowelled Arabic-derived script (no short-vowel
 * diacritics) and its grammar is analytic: no grammatical gender, no cases,
 * and adjectives never agree with the noun they modify. Inflection is limited
 * to verbs and noun plurals.
 *
 * Verbs: three tables —
 *  - حال (present/habitual): می + present stem + person endings (رفتن → رو →
 *    میروم، میروی، میرود، میرویم، میروید، میروند). The present stem is
 *    lexical and often unpredictable, so each verb stores its own stem.
 *  - گذشته (past/simple): past stem + person endings (رفتم، رفتی، رفت، ...).
 *    The past stem is the infinitive minus its final ن for most verbs, but the
 *    exceptions are stored in the dictionary.
 *  - امر (imperative): second person only — ب + present stem for تو (برو، بده،
 *    بگیر) and that form plus ید for شما (بروید، بدهید، بگیرید); both are
 *    stored/derived per verb.
 *
 * بودن has a fully irregular present (هستم، هستی، است، هستیم، هستید، هستند)
 * which is stored whole. Verbs outside the dictionary are derived only when
 * they follow the productive -یدن family (خندیدن → میخندم); anything else
 * returns null so the LLM tier answers instead of guessing a wrong stem.
 *
 * Nouns: a single plural table — -ها for the vast majority (کتاب → کتابها)
 * with a curated set of -ان animate plurals (مرد → مردان, دانشجو → دانشجویان
 * with ی insertion). There are no cases or genders.
 *
 * Adjectives do not inflect (kind=null + native note); pronouns and other
 * closed classes go to the LLM tier.
 */
export const PersianInflector: InflectionEngine = {
  engine: 'fa-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'fa') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    if (pos === null || pos.trim() === '') return nounParadigm(word)
    switch (pos.toLowerCase()) {
      case 'verb':
        return conjugate(word)
      case 'noun':
        return nounParadigm(word)
      case 'adjective':
        return noInflection(word, ADJECTIVE_NOTE)
      default:
        return null // pronouns, adverbs, prepositions... → LLM tier
    }
  }
}

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(inf: string): InflectionParadigm | null {
  const forms = IRREGULAR.get(inf) ?? derivedForms(inf)
  if (forms == null) return null
  const present = PRESENT_WHOLE.get(inf) ?? PRESENT_ENDINGS.map((it) => 'می' + forms.presentStem + it)
  const past = PAST_ENDINGS.map((it) => forms.pastStem + it)
  const imperative = [forms.imperative, forms.imperative + 'ید']
  const tables: ParadigmTable[] = [
    {
      title: 'حال',
      columns: ['فرم'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [present[i]] }))
    },
    {
      title: 'گذشته',
      columns: ['فرم'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [past[i]] }))
    },
    {
      title: 'امر',
      columns: ['فرم'],
      rows: IMPERATIVE_PERSONS.map((p, i) => ({ label: p, cells: [imperative[i]] }))
    }
  ]
  return {
    lemma: inf,
    lang: 'fa',
    kind: 'conjugation',
    note: 'فعل در فارسی برای شخص صرف میشود؛ جنسیت ندارد.',
    tables
  }
}

/**
 * Guess stems for verbs outside the dictionary. Only infinitives ending in
 * -ن whose past stem follows the productive -یدن family (past stem = bare
 * present stem + ید: خندیدن → خند) are derived; any other Persian present
 * stem is lexical, so we return null and let the LLM tier answer.
 */
function derivedForms(inf: string): VerbForms | null {
  if (!inf.endsWith('ن')) return null
  const pastStem = inf.slice(0, -1)
  if (!pastStem.endsWith('ید')) return null
  const presentStem = pastStem.slice(0, -2)
  return { presentStem, pastStem, imperative: 'ب' + presentStem }
}

// ── Nouns ───────────────────────────────────────────────────────────────

function nounParadigm(word: string): InflectionParadigm {
  const plural = ANIMATE_PLURALS.get(word) ?? word + 'ها'
  return {
    lemma: word,
    lang: 'fa',
    kind: 'declension',
    note: 'اسم در فارسی حالت ندارد؛ جمع با -ها و -ان ساخته میشود.',
    tables: [
      {
        title: 'جمع',
        columns: ['مفرد', 'جمع'],
        rows: [{ label: 'شکل', cells: [word, plural] }]
      }
    ]
  }
}

function noInflection(word: string, note: string): InflectionParadigm {
  return { lemma: word, lang: 'fa', kind: null, note, tables: [] }
}

// ── Data ────────────────────────────────────────────────────────────────

const PERSONS = ['من', 'تو', 'او', 'ما', 'شما', 'آنها']
const IMPERATIVE_PERSONS = ['تو', 'شما']
const PRESENT_ENDINGS = ['م', 'ی', 'د', 'یم', 'ید', 'ند']
const PAST_ENDINGS = ['م', 'ی', '', 'یم', 'ید', 'ند']

const ADJECTIVE_NOTE =
  'صفت در فارسی صرف نمیشود و با اسم هماهنگ نمیشود (کتاب خوب، کتابهای خوب).'

/** One verb's lexical stems: present stem, past stem, imperative 2sg. */
interface VerbForms {
  presentStem: string
  pastStem: string
  imperative: string
}

/** Curated verbs: infinitive → present stem, past stem, imperative 2sg. */
const IRREGULAR: Map<string, VerbForms> = new Map([
  ['بودن', { presentStem: 'هست', pastStem: 'بود', imperative: 'باش' }],
  ['شدن', { presentStem: 'شو', pastStem: 'شد', imperative: 'شو' }],
  ['گرفتن', { presentStem: 'گیر', pastStem: 'گرفت', imperative: 'بگیر' }],
  ['دادن', { presentStem: 'ده', pastStem: 'داد', imperative: 'بده' }],
  ['آمدن', { presentStem: 'آ', pastStem: 'آمد', imperative: 'بیا' }],
  ['رفتن', { presentStem: 'رو', pastStem: 'رفت', imperative: 'برو' }],
  ['خوردن', { presentStem: 'خور', pastStem: 'خورد', imperative: 'بخور' }],
  ['دیدن', { presentStem: 'بین', pastStem: 'دید', imperative: 'ببین' }],
  ['گفتن', { presentStem: 'گو', pastStem: 'گفت', imperative: 'بگو' }],
  ['شنیدن', { presentStem: 'شنو', pastStem: 'شنید', imperative: 'بشنو' }],
  ['کردن', { presentStem: 'کن', pastStem: 'کرد', imperative: 'بکن' }],
  ['خواستن', { presentStem: 'خواه', pastStem: 'خواست', imperative: 'بخواه' }]
])

/** Verbs whose present does not follow می+stem+endings and is stored whole. */
const PRESENT_WHOLE: Map<string, string[]> = new Map([
  ['بودن', ['هستم', 'هستی', 'است', 'هستیم', 'هستید', 'هستند']]
])

/** Curated animate plurals taking -ان; every other noun defaults to -ها. */
const ANIMATE_PLURALS: Map<string, string> = new Map([
  ['مرد', 'مردان'],
  ['زن', 'زنان'],
  ['دانشجو', 'دانشجویان'], // -و inserts ی before -ان
  ['کودک', 'کودکان'],
  ['معلم', 'معلمان'],
  ['ایرانی', 'ایرانیان'],
  ['دانشآموز', 'دانشآموزان']
])
