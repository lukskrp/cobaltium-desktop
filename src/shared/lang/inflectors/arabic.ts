import type { InflectionEngine, InflectionParadigm } from '../inflection'

/**
 * Bundled Arabic (ar) inflector: deterministic, offline LangDex paradigms.
 *
 * Learner-grade Modern Standard Arabic, fully voweled (harakat), dual excluded.
 *
 * Verbs: three tables — present (المضارع), past (الماضي) and imperative (الأمر)
 * across ten persons (هو، هي، أنتَ، أنتِ، أنا، هم، هنَّ، أنتم، أنتنَّ، نحن).
 * Sound verbs are generated from stored past/present stems: the imperfect adds
 * a person prefix (يَـ/تَـ/أَـ/نَـ) and ending (ـُ/ـِينَ/ـُونَ/ـْنَ) to the
 * present stem (كَتَب -> يَكْتُبُ، تَكْتُبِينَ)، while the past appends the
 * suffix-conjugation endings to the past stem (كَتَب -> كَتَبْتُ، كَتَبُوا).
 * Hollow and weak verbs (قَالَ، كَانَ، جَاءَ، رَأَى) carry curated full person
 * lists because their stems collapse (يَقُلْنَ، يَكُنَّ) or rewrite (رَأَيْتُ)
 * beyond simple affixation. The imperative is derived from the stored 2ms
 * (اكْتُبْ -> اكْتُبِي، اكْتُبُوا، اكْتُبْنَ) or hardcoded for irregulars.
 *
 * Nouns: three cases (مرفوع/منصوب/مجرور) x definiteness (نكرة/معرفة) in a
 * table titled "إعراب الاسم". Case endings are derived: tanwin for the
 * indefinite (كِتَابٌ/كِتَابًا/كِتَابٍ)، الـ + short vowel for the definite
 * (الْكِتَابُ/الْكِتَابَ/الْكِتَابِ)؛ taa-marbuta nouns take ـةٌ/ـةً/ـةٍ
 * (مَدِينَةٌ/مَدِينَةً/مَدِينَةٍ). Broken plurals (جمع التكسير) are stored in
 * the dictionary (كِتَاب -> كُتُب) and get their own table. Plurals ending in
 * a bare alif are out of scope (no alif-final form in the curated set).
 *
 * Adjectives agree in gender/number but stay learner-minimal here (kind=null
 * with a note); pronouns and other function words go to the LLM tier.
 */
export const ArabicInflector: InflectionEngine = {
  engine: 'ar-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'ar') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(word)
      case 'declension':
        if (pos?.toLowerCase() === 'adjective') {
          return noInflection(
            word,
            'الصفة في العربية تُطابق الاسم في الجنس والعدد (كَبِير، كَبِيرَة، كِبَار)؛ ' +
              'تصريف الصفات الكامل خارج نطاق المحرك المدمج.'
          )
        }
        return nounParadigm(word)
      default:
        if (PRONOUN_LIKE.has(pos?.toLowerCase() ?? '')) return null
        if (pos === null || pos.trim() === '') return nounParadigm(word)
        return null
    }
  }
}

function classify(pos: string | null): 'conjugation' | 'declension' | null {
  switch (pos?.toLowerCase()) {
    case 'verb':
      return 'conjugation'
    case 'noun':
    case 'adjective':
      return 'declension'
    default:
      return null
  }
}

const PRONOUN_LIKE = new Set(['pronoun', 'determiner', 'numeral'])

// ── Diacritics ─────────────────────────────────────────────────────────

/** Tanwin/short-vowel/sukun/shadda marks, removed for dictionary lookup. */
const DIACRITICS = '\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652'

function stripDiacritics(s: string): string {
  return Array.from(s)
    .filter((ch) => !DIACRITICS.includes(ch))
    .join('')
}

// ── Conjugation ────────────────────────────────────────────────────────

const PERSONS = ['هو', 'هي', 'أنتَ', 'أنتِ', 'أنا', 'هم', 'هنَّ', 'أنتم', 'أنتنَّ', 'نحن']
const IMPERATIVE_PERSONS = ['أنتَ', 'أنتِ', 'أنتم', 'أنتنَّ']

/** Imperfect prefixes by person: يَـ/تَـ/أَـ/نَـ (fat-ha on the prefix). */
const PRESENT_PREFIXES = ['يَ', 'تَ', 'تَ', 'تَ', 'أَ', 'يَ', 'يَ', 'تَ', 'تَ', 'نَ']

/** Imperfect endings by person: short vowel, ـِينَ, ـُونَ or ـْنَ. */
const PRESENT_SUFFIXES = ['ُ', 'ُ', 'ُ', 'ِينَ', 'ُ', 'ُونَ', 'ْنَ', 'ُونَ', 'ْنَ', 'ُ']

/** Perfect (suffix-conjugation) endings by person. */
const PAST_SUFFIXES = ['َ', 'َتْ', 'ْتَ', 'ْتِ', 'ْتُ', 'ُوا', 'ْنَ', 'ْتُمْ', 'ْتُنَّ', 'ْنَا']

interface VerbEntry {
  present: string[]
  past: string[]
  imperative: string[]
}

/** Builds a sound verb: the stems generate all ten present/past forms. */
function soundVerb(pastStem: string, presentStem: string, imperative2ms: string): VerbEntry {
  const present = PRESENT_PREFIXES.map((prefix, i) =>
    mergeHamza(prefix + presentStem + PRESENT_SUFFIXES[i])
  )
  const past = PAST_SUFFIXES.map((suffix) => pastStem + suffix)
  return { present, past, imperative: imperativeForms(imperative2ms) }
}

/** أَ + أْكُلُ collapses to آكُلُ (two adjacent hamzas become alif madda). */
function mergeHamza(form: string): string {
  return form.startsWith('أَأْ') ? 'آ' + form.slice(4) : form
}

/** Derives 2fs/2mp/2fp from the 2ms (strip its sukun, append ي/وا/نَ). */
function imperativeForms(twoMs: string): string[] {
  const base = twoMs.endsWith('ْ') ? twoMs.slice(0, -1) : twoMs
  return [twoMs, base + 'ِي', base + 'ُوا', base + 'ْنَ']
}

const VERBS: Record<string, VerbEntry> = {
  'كَتَبَ': soundVerb('كَتَب', 'كْتُب', 'اكْتُبْ'),
  'ذَهَبَ': soundVerb('ذَهَب', 'ذْهَب', 'اذْهَبْ'),
  'شَرِبَ': soundVerb('شَرِب', 'شْرَب', 'اشْرَبْ'),
  'أَكَلَ': soundVerb('أَكَل', 'أْكُل', 'كُلْ'),
  'أَخَذَ': soundVerb('أَخَذ', 'أْخُذ', 'خُذْ'),
  'قَالَ': {
    present: [
      'يَقُولُ',
      'تَقُولُ',
      'تَقُولُ',
      'تَقُولِينَ',
      'أَقُولُ',
      'يَقُولُونَ',
      'يَقُلْنَ',
      'تَقُولُونَ',
      'تَقُلْنَ',
      'نَقُولُ'
    ],
    past: [
      'قَالَ',
      'قَالَتْ',
      'قُلْتَ',
      'قُلْتِ',
      'قُلْتُ',
      'قَالُوا',
      'قُلْنَ',
      'قُلْتُمْ',
      'قُلْتُنَّ',
      'قُلْنَا'
    ],
    imperative: ['قُلْ', 'قُولِي', 'قُولُوا', 'قُلْنَ']
  },
  'كَانَ': {
    present: [
      'يَكُونُ',
      'تَكُونُ',
      'تَكُونُ',
      'تَكُونِينَ',
      'أَكُونُ',
      'يَكُونُونَ',
      'يَكُنَّ',
      'تَكُونُونَ',
      'تَكُنَّ',
      'نَكُونُ'
    ],
    past: [
      'كَانَ',
      'كَانَتْ',
      'كُنْتَ',
      'كُنْتِ',
      'كُنْتُ',
      'كَانُوا',
      'كُنَّ',
      'كُنْتُمْ',
      'كُنْتُنَّ',
      'كُنَّا'
    ],
    imperative: ['كُنْ', 'كُونِي', 'كُونُوا', 'كُنَّ']
  },
  'جَاءَ': {
    present: [
      'يَجِيءُ',
      'تَجِيءُ',
      'تَجِيءُ',
      'تَجِيئِينَ',
      'أَجِيءُ',
      'يَجِيئُونَ',
      'يَجِئْنَ',
      'تَجِيئُونَ',
      'تَجِئْنَ',
      'نَجِيءُ'
    ],
    past: [
      'جَاءَ',
      'جَاءَتْ',
      'جِئْتَ',
      'جِئْتِ',
      'جِئْتُ',
      'جَاءُوا',
      'جِئْنَ',
      'جِئْتُمْ',
      'جِئْتُنَّ',
      'جِئْنَا'
    ],
    imperative: ['جِئْ', 'جِيئِي', 'جِيئُوا', 'جِئْنَ']
  },
  'رَأَى': {
    present: [
      'يَرَى',
      'تَرَى',
      'تَرَى',
      'تَرَيْنَ',
      'أَرَى',
      'يَرَوْنَ',
      'يَرَيْنَ',
      'تَرَوْنَ',
      'تَرَيْنَ',
      'نَرَى'
    ],
    past: [
      'رَأَى',
      'رَأَتْ',
      'رَأَيْتَ',
      'رَأَيْتِ',
      'رَأَيْتُ',
      'رَأَوْا',
      'رَأَيْنَ',
      'رَأَيْتُمْ',
      'رَأَيْتُنَّ',
      'رَأَيْنَا'
    ],
    imperative: ['اِرَ', 'اِرَيْ', 'اِرَوْا', 'اِرَيْنَ']
  }
}

/** Voweled key -> entry, indexed by the plain (diacritic-stripped) lemma. */
const VERB_LOOKUP: Record<string, VerbEntry> = Object.fromEntries(
  Object.entries(VERBS).map(([key, value]) => [stripDiacritics(key), value])
)

function conjugate(word: string): InflectionParadigm | null {
  const entry = VERB_LOOKUP[stripDiacritics(word)]
  if (!entry) return null
  const tables = [
    {
      title: 'المضارع',
      columns: ['Form'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [entry.present[i]] }))
    },
    {
      title: 'الماضي',
      columns: ['Form'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [entry.past[i]] }))
    },
    {
      title: 'الأمر',
      columns: ['Form'],
      rows: IMPERATIVE_PERSONS.map((l, i) => ({ label: l, cells: [entry.imperative[i]] }))
    }
  ]
  return {
    lemma: word,
    lang: 'ar',
    kind: 'conjugation',
    note: 'التصريف للمفرد والجمع فقط (بدون المثنى).',
    tables
  }
}

// ── Declension ─────────────────────────────────────────────────────────

/** Voweled singular -> voweled broken plural. */
const NOUNS: Record<string, string> = {
  'كِتَاب': 'كُتُب',
  'بَيْت': 'بُيُوت',
  'مَدِينَة': 'مُدُن',
  'وَلَد': 'أَوْلَاد',
  'قَلَم': 'أَقْلَام'
}

/** Voweled singular -> plural, indexed by the plain lemma. */
const NOUN_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(NOUNS).map(([key]) => [stripDiacritics(key), key])
)

const CASES = ['مرفوع', 'منصوب', 'مجرور']

function nounParadigm(word: string): InflectionParadigm | null {
  const key = NOUN_LOOKUP[stripDiacritics(word)]
  if (!key) return null
  const singular = decline(key)
  const plural = decline(NOUNS[key])
  const rows = CASES.map((c, i) => ({ label: c, cells: [singular[i], singular[i + 3]] }))
  const pluralRows = CASES.map((c, i) => ({ label: c, cells: [plural[i], plural[i + 3]] }))
  return {
    lemma: key,
    lang: 'ar',
    kind: 'declension',
    note: 'جمع التكسير مذكور في القاموس؛ الصفات تُطابق الاسم في الجنس والعدد.',
    tables: [
      { title: 'إعراب الاسم', columns: ['نكرة', 'معرفة'], rows },
      { title: 'جمع التكسير', columns: ['نكرة', 'معرفة'], rows: pluralRows }
    ]
  }
}

/** Six forms: indefinite/definite x nominative/accusative/genitive. */
function decline(word: string): string[] {
  const taaMarbuta = word.endsWith('ة')
  const indefinite = [
    word + 'ٌ', // مرفوع نكرة
    word + (taaMarbuta ? 'ً' : 'ًا'), // منصوب نكرة
    word + 'ٍ' // مجرور نكرة
  ]
  const definite = ['الْ' + word + 'ُ', 'الْ' + word + 'َ', 'الْ' + word + 'ِ']
  return [...indefinite, ...definite]
}

function noInflection(word: string, note: string): InflectionParadigm {
  return { lemma: word, lang: 'ar', kind: null, note, tables: [] }
}
