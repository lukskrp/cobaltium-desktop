import type { InflectionEngine, InflectionParadigm, ParadigmKind } from '../inflection'
import { FinnishConjugator } from './finnish/conjugator'
import { FinnishDecliner } from './finnish/decliner'

/**
 * Bundled Finnish (en-fi) inflector: deterministic, offline paradigms for the
 * Finnish learning focus. Verbs conjugate via [FinnishConjugator] (rule-based
 * types 1/3 + irregulars); nouns/adjectives come from a curated declension
 * table. Unhandled words return null so the caller can fall back to the LLM.
 */
export const FinnishInflector: InflectionEngine = {
  engine: 'finnish-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'fi') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const kind = classify(pos)
    if (kind === 'conjugation') return FinnishConjugator.conjugate(word)
    if (kind === 'declension') return WORDS.get(word) ?? FinnishDecliner.decline(word)
    if (pos === null || pos.trim() === '') {
      // Unknown POS: guess by form — verb-like endings conjugate, else decline.
      if (looksLikeVerb(word)) {
        return FinnishConjugator.conjugate(word) ?? WORDS.get(word) ?? FinnishDecliner.decline(word)
      }
      return WORDS.get(word) ?? FinnishDecliner.decline(word)
    }
    return {
      lemma,
      lang: 'fi',
      kind: null,
      note: 'Adverbs and function words do not decline in Finnish.',
      tables: []
    }
  }
}

function looksLikeVerb(word: string): boolean {
  const inflectorEndings = [
    'da',
    'dä',
    'la',
    'lä',
    'na',
    'nä',
    'ra',
    'rä',
    'ta',
    'tä',
    'ita',
    'itä',
    'eta',
    'etä'
  ]
  if (inflectorEndings.some((ending) => word.endsWith(ending))) return true
  // Type 1 verbs end in -a/-ä preceded by a vowel (puhua, heittää, antaa).
  if ((word.endsWith('a') || word.endsWith('ä')) && word.length >= 3) {
    return 'aeiouyäö'.includes(word.charAt(word.length - 2))
  }
  return false
}

function classify(pos: string | null): ParadigmKind | null {
  switch (pos?.toLowerCase()) {
    case 'verb':
      return 'conjugation'
    case 'noun':
    case 'pronoun':
    case 'adjective':
    case 'determiner':
    case 'numeral':
      return 'declension'
    case 'adverb':
    case 'preposition':
    case 'postposition':
    case 'conjunction':
    case 'interjection':
    case 'particle':
      return null
    default:
      return null
  }
}

// ── Helpers ────────────────────────────────────────────────────────────
const CASES = [
  'Nominative',
  'Genitive',
  'Partitive',
  'Inessive',
  'Elative',
  'Illative',
  'Adessive',
  'Ablative',
  'Allative',
  'Essive',
  'Translative',
  'Instructive',
  'Abessive',
  'Comitative',
  'Accusative'
]

function declension(lemma: string, singular: string[], plural: string[]): InflectionParadigm {
  const rows = CASES.map((label, i) => ({
    label,
    cells: [singular[i], plural[i]]
  }))
  return {
    lemma,
    lang: 'fi',
    kind: 'declension',
    note: '',
    tables: [
      { title: 'Declension', columns: ['Singular', 'Plural'], rows }
    ]
  }
}

// ── Bundled nouns / adjectives ─────────────────────────────────────────
const WORDS: ReadonlyMap<string, InflectionParadigm> = new Map([
  [
    'kissa',
    declension(
      'kissa',
      [
        'kissa',
        'kissan',
        'kissaa',
        'kissassa',
        'kissasta',
        'kissaan',
        'kissalla',
        'kissalta',
        'kissalle',
        'kissana',
        'kissaksi',
        'kissan',
        'kissatta',
        'kissine',
        'kissa'
      ],
      [
        'kissat',
        'kissojen',
        'kissoja',
        'kissoissa',
        'kissoista',
        'kissoihin',
        'kissoilla',
        'kissoilta',
        'kissoille',
        'kissoina',
        'kissoiksi',
        'kissoin',
        'kissoitta',
        'kissoine',
        'kissat'
      ]
    )
  ],
  [
    'talo',
    declension(
      'talo',
      [
        'talo',
        'talon',
        'taloa',
        'talossa',
        'talosta',
        'taloon',
        'talolla',
        'talolta',
        'talolle',
        'talona',
        'taloksi',
        'talon',
        'talotta',
        'taloine',
        'talo'
      ],
      [
        'talot',
        'talojen',
        'taloja',
        'taloissa',
        'taloista',
        'taloihin',
        'taloilla',
        'taloilta',
        'taloille',
        'taloina',
        'taloiksi',
        'taloin',
        'taloitta',
        'taloine',
        'talot'
      ]
    )
  ],
  [
    'katu',
    declension(
      'katu',
      [
        'katu',
        'kadun',
        'katua',
        'kadussa',
        'kadusta',
        'katuun',
        'kadulla',
        'kadulta',
        'kadulle',
        'katuna',
        'kaduksi',
        'kadun',
        'katutta',
        'katuine',
        'katu'
      ],
      [
        'kadut',
        'katujen',
        'katuja',
        'kaduissa',
        'kaduista',
        'katuihin',
        'kaduilla',
        'kaduilta',
        'kaduille',
        'katuina',
        'kaduiksi',
        'katuin',
        'kaduitta',
        'katuine',
        'kadut'
      ]
    )
  ],
  [
    'kirja',
    declension(
      'kirja',
      [
        'kirja',
        'kirjan',
        'kirjaa',
        'kirjassa',
        'kirjasta',
        'kirjaan',
        'kirjalla',
        'kirjalta',
        'kirjalle',
        'kirjana',
        'kirjaksi',
        'kirjan',
        'kirjatta',
        'kirjine',
        'kirja'
      ],
      [
        'kirjat',
        'kirjojen',
        'kirjoja',
        'kirjoissa',
        'kirjoista',
        'kirjoihin',
        'kirjoilla',
        'kirjoilta',
        'kirjoille',
        'kirjoina',
        'kirjoiksi',
        'kirjoin',
        'kirjoitta',
        'kirjoine',
        'kirjat'
      ]
    )
  ],
  [
    'poika',
    declension(
      'poika',
      [
        'poika',
        'pojan',
        'poikaa',
        'pojassa',
        'pojasta',
        'poikaan',
        'pojalla',
        'pojalta',
        'pojalle',
        'poikana',
        'pojaksi',
        'pojan',
        'poikatta',
        'poikine',
        'poika'
      ],
      [
        'pojat',
        'poikien',
        'poikia',
        'pojissa',
        'pojista',
        'poikiin',
        'pojilla',
        'pojilta',
        'pojille',
        'poikina',
        'poikiksi',
        'poikin',
        'poikitta',
        'poikine',
        'pojat'
      ]
    )
  ],
  [
    'nainen',
    declension(
      'nainen',
      [
        'nainen',
        'naisen',
        'naista',
        'naisessa',
        'naisesta',
        'naiseen',
        'naisella',
        'naiselta',
        'naiselle',
        'naisena',
        'naiseksi',
        'naisen',
        'naisetta',
        'naisine',
        'nainen'
      ],
      [
        'naiset',
        'naisten',
        'naisia',
        'naisissa',
        'naisista',
        'naisiin',
        'naisilla',
        'naisilta',
        'naisille',
        'naisina',
        'naisiksi',
        'naisin',
        'naisitta',
        'naisine',
        'naiset'
      ]
    )
  ],
  [
    'vesi',
    declension(
      'vesi',
      [
        'vesi',
        'veden',
        'vettä',
        'vedessä',
        'vedestä',
        'veteen',
        'vedellä',
        'vedeltä',
        'vedelle',
        'vetenä',
        'vedeksi',
        'veden',
        'vedettä',
        'vesine',
        'vesi'
      ],
      [
        'vedet',
        'vesien',
        'vesiä',
        'vesissä',
        'vesistä',
        'vesiin',
        'vesillä',
        'vesiltä',
        'vesille',
        'vesinä',
        'vesiksi',
        'vesin',
        'vesittä',
        'vesine',
        'vedet'
      ]
    )
  ],
  [
    'mies',
    declension(
      'mies',
      [
        'mies',
        'miehen',
        'miestä',
        'miehessä',
        'miehestä',
        'mieheen',
        'miehellä',
        'mieheltä',
        'miehelle',
        'miehenä',
        'mieheksi',
        'miehen',
        'miehettä',
        'miehine',
        'mies'
      ],
      [
        'miehet',
        'miesten',
        'miehiä',
        'miehissä',
        'miehistä',
        'miehiin',
        'miehillä',
        'miehiltä',
        'miehille',
        'miehinä',
        'miehiksi',
        'miehin',
        'miehittä',
        'miehine',
        'miehet'
      ]
    )
  ],
  [
    'lapsi',
    declension(
      'lapsi',
      [
        'lapsi',
        'lapsen',
        'lasta',
        'lapsessa',
        'lapsesta',
        'lapseen',
        'lapsella',
        'lapselta',
        'lapselle',
        'lapsena',
        'lapseksi',
        'lapsen',
        'lapsetta',
        'lapsine',
        'lapsi'
      ],
      [
        'lapset',
        'lasten',
        'lapsia',
        'lapsissa',
        'lapsista',
        'lapsiin',
        'lapsilla',
        'lapsilta',
        'lapsille',
        'lapsina',
        'lapsiksi',
        'lapsin',
        'lapsitta',
        'lapsine',
        'lapset'
      ]
    )
  ],
  [
    'hyvä',
    declension(
      'hyvä',
      [
        'hyvä',
        'hyvän',
        'hyvää',
        'hyvässä',
        'hyvästä',
        'hyvään',
        'hyvällä',
        'hyvältä',
        'hyvälle',
        'hyvänä',
        'hyväksi',
        'hyvän',
        'hyvättä',
        'hyvine',
        'hyvä'
      ],
      [
        'hyvät',
        'hyvien',
        'hyviä',
        'hyvissä',
        'hyvistä',
        'hyviin',
        'hyvillä',
        'hyviltä',
        'hyville',
        'hyvinä',
        'hyviksi',
        'hyvin',
        'hyvittä',
        'hyvine',
        'hyvät'
      ]
    )
  ],
  [
    'iso',
    declension(
      'iso',
      [
        'iso',
        'ison',
        'isoa',
        'isossa',
        'isosta',
        'isoon',
        'isolla',
        'isolta',
        'isolle',
        'isona',
        'isoksi',
        'ison',
        'isotta',
        'isoine',
        'iso'
      ],
      [
        'isot',
        'isojen',
        'isoja',
        'isoissa',
        'isoista',
        'isoihin',
        'isoilla',
        'isoilta',
        'isoille',
        'isoina',
        'isoiksi',
        'isoin',
        'isoitta',
        'isoine',
        'isot'
      ]
    )
  ],
  [
    'uusi',
    declension(
      'uusi',
      [
        'uusi',
        'uuden',
        'uutta',
        'uudessa',
        'uudesta',
        'uuteen',
        'uudella',
        'uudelta',
        'uudelle',
        'uutena',
        'uudeksi',
        'uuden',
        'uudetta',
        'uusine',
        'uusi'
      ],
      [
        'uudet',
        'uusien',
        'uusia',
        'uusissa',
        'uusista',
        'uusiin',
        'uusilla',
        'uusilta',
        'uusille',
        'uusina',
        'uusiksi',
        'uusin',
        'uusitta',
        'uusine',
        'uudet'
      ]
    )
  ]
])
