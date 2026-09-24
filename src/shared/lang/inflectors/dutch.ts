import type { InflectionEngine, InflectionParadigm } from '../inflection'

interface StrongVerb {
  pastSg: string
  pastPl: string
  participle: string
  stem?: string
}

interface IrregularVerb {
  present: string[]
  pastSg: string
  pastPl: string
  participle: string
  imperative: string
}

interface Noun {
  neuter: boolean
  plural: string
}

const PRONOUN_LIKE = new Set(['pronoun', 'determiner', 'numeral'])

const VOICED_S = new Set(['reis', 'verhuis', 'prijs'])

const IRREGULAR_VERBS: Map<string, IrregularVerb> = new Map([
  [
    'zijn',
    {
      present: ['ben', 'bent', 'zijn'],
      pastSg: 'was',
      pastPl: 'waren',
      participle: 'geweest',
      imperative: 'wees'
    }
  ],
  [
    'hebben',
    {
      present: ['heb', 'hebt', 'hebben'],
      pastSg: 'had',
      pastPl: 'hadden',
      participle: 'gehad',
      imperative: 'heb'
    }
  ],
  [
    'worden',
    {
      present: ['word', 'wordt', 'worden'],
      pastSg: 'werd',
      pastPl: 'werden',
      participle: 'geworden',
      imperative: 'word'
    }
  ],
  [
    'gaan',
    {
      present: ['ga', 'gaat', 'gaan'],
      pastSg: 'ging',
      pastPl: 'gingen',
      participle: 'gegaan',
      imperative: 'ga'
    }
  ],
  [
    'staan',
    {
      present: ['sta', 'staat', 'staan'],
      pastSg: 'stond',
      pastPl: 'stonden',
      participle: 'gestaan',
      imperative: 'sta'
    }
  ],
  [
    'doen',
    {
      present: ['doe', 'doet', 'doen'],
      pastSg: 'deed',
      pastPl: 'deden',
      participle: 'gedaan',
      imperative: 'doe'
    }
  ],
  [
    'kunnen',
    {
      present: ['kan', 'kunt', 'kunnen'],
      pastSg: 'kon',
      pastPl: 'konden',
      participle: 'gekund',
      imperative: ''
    }
  ],
  [
    'mogen',
    {
      present: ['mag', 'mag', 'mogen'],
      pastSg: 'mocht',
      pastPl: 'mochten',
      participle: 'gemogen',
      imperative: ''
    }
  ],
  [
    'moeten',
    {
      present: ['moet', 'moet', 'moeten'],
      pastSg: 'moest',
      pastPl: 'moesten',
      participle: 'gemoeten',
      imperative: ''
    }
  ],
  [
    'willen',
    {
      present: ['wil', 'wilt', 'willen'],
      pastSg: 'wilde',
      pastPl: 'wilden',
      participle: 'gewild',
      imperative: ''
    }
  ]
])

const STRONG_VERBS: Map<string, StrongVerb> = new Map([
  ['kijken', { pastSg: 'keek', pastPl: 'keken', participle: 'gekeken', stem: 'kijk' }],
  ['lopen', { pastSg: 'liep', pastPl: 'liepen', participle: 'gelopen', stem: 'loop' }],
  ['zien', { pastSg: 'zag', pastPl: 'zagen', participle: 'gezien', stem: 'zie' }],
  ['geven', { pastSg: 'gaf', pastPl: 'gaven', participle: 'gegeven', stem: 'geef' }],
  ['nemen', { pastSg: 'nam', pastPl: 'namen', participle: 'genomen', stem: 'neem' }],
  ['lezen', { pastSg: 'las', pastPl: 'lazen', participle: 'gelezen', stem: 'lees' }],
  ['spreken', { pastSg: 'sprak', pastPl: 'spraken', participle: 'gesproken', stem: 'spreek' }],
  ['breken', { pastSg: 'brak', pastPl: 'braken', participle: 'gebroken', stem: 'breek' }],
  ['eten', { pastSg: 'at', pastPl: 'aten', participle: 'gegeten', stem: 'eet' }],
  ['slapen', { pastSg: 'sliep', pastPl: 'sliepen', participle: 'geslapen', stem: 'slaap' }],
  ['dragen', { pastSg: 'droeg', pastPl: 'droegen', participle: 'gedragen', stem: 'draag' }],
  ['varen', { pastSg: 'voer', pastPl: 'voeren', participle: 'gevaren', stem: 'vaar' }],
  ['zingen', { pastSg: 'zong', pastPl: 'zongen', participle: 'gezongen', stem: 'zing' }],
  ['drinken', { pastSg: 'dronk', pastPl: 'dronken', participle: 'gedronken', stem: 'drink' }],
  [
    'schrijven',
    { pastSg: 'schreef', pastPl: 'schreven', participle: 'geschreven', stem: 'schrijf' }
  ],
  ['vliegen', { pastSg: 'vloog', pastPl: 'vlogen', participle: 'gevlogen', stem: 'vlieg' }],
  ['vinden', { pastSg: 'vond', pastPl: 'vonden', participle: 'gevonden', stem: 'vind' }],
  ['blijven', { pastSg: 'bleef', pastPl: 'bleven', participle: 'gebleven', stem: 'blijf' }],
  ['beginnen', { pastSg: 'begon', pastPl: 'begonnen', participle: 'begonnen', stem: 'begin' }],
  ['helpen', { pastSg: 'hielp', pastPl: 'hielpen', participle: 'geholpen', stem: 'help' }],
  ['sterven', { pastSg: 'stierf', pastPl: 'stierven', participle: 'gestorven', stem: 'sterf' }],
  ['kiezen', { pastSg: 'koos', pastPl: 'kozen', participle: 'gekozen', stem: 'kies' }],
  [
    'verliezen',
    { pastSg: 'verloor', pastPl: 'verloren', participle: 'verloren', stem: 'verlies' }
  ],
  ['zitten', { pastSg: 'zat', pastPl: 'zaten', participle: 'gezeten', stem: 'zit' }],
  ['liggen', { pastSg: 'lag', pastPl: 'lagen', participle: 'gelegen', stem: 'lig' }],
  ['vallen', { pastSg: 'viel', pastPl: 'vielen', participle: 'gevallen', stem: 'val' }],
  ['rijden', { pastSg: 'reed', pastPl: 'reden', participle: 'gereden', stem: 'rij' }],
  ['houden', { pastSg: 'hield', pastPl: 'hielden', participle: 'gehouden', stem: 'houd' }],
  ['weten', { pastSg: 'wist', pastPl: 'wisten', participle: 'geweten', stem: 'weet' }],
  ['denken', { pastSg: 'dacht', pastPl: 'dachten', participle: 'gedacht', stem: 'denk' }],
  ['brengen', { pastSg: 'bracht', pastPl: 'brachten', participle: 'gebracht', stem: 'breng' }],
  ['zeggen', { pastSg: 'zei', pastPl: 'zeiden', participle: 'gezegd', stem: 'zeg' }],
  ['werken', { pastSg: 'werkte', pastPl: 'werkten', participle: 'gewerkt', stem: 'werk' }]
])

const PRESENT_STEM: Map<string, string> = new Map([
  ['kopen', 'koop'],
  ['lopen', 'loop'],
  ['roken', 'rook'],
  ['wonen', 'woon'],
  ['maken', 'maak'],
  ['lezen', 'lees'],
  ['geven', 'geef'],
  ['nemen', 'neem'],
  ['spreken', 'spreek'],
  ['breken', 'breek'],
  ['eten', 'eet'],
  ['slapen', 'slaap'],
  ['dragen', 'draag'],
  ['praten', 'praat'],
  ['varen', 'vaar'],
  ['weten', 'weet'],
  ['leven', 'leef'],
  ['beven', 'beef'],
  ['komen', 'kom'],
  ['blijven', 'blijf']
])

const NOUNS: Map<string, Noun> = new Map([
  ['man', { neuter: false, plural: 'mannen' }],
  ['vrouw', { neuter: false, plural: 'vrouwen' }],
  ['kind', { neuter: true, plural: 'kinderen' }],
  ['huis', { neuter: true, plural: 'huizen' }],
  ['boek', { neuter: true, plural: 'boeken' }],
  ['tafel', { neuter: false, plural: 'tafels' }],
  ['stoel', { neuter: false, plural: 'stoelen' }],
  ['auto', { neuter: false, plural: "auto's" }],
  ['fiets', { neuter: false, plural: 'fietsen' }],
  ['hond', { neuter: false, plural: 'honden' }],
  ['kat', { neuter: false, plural: 'katten' }],
  ['dag', { neuter: false, plural: 'dagen' }],
  ['nacht', { neuter: false, plural: 'nachten' }],
  ['stad', { neuter: false, plural: 'steden' }],
  ['land', { neuter: true, plural: 'landen' }],
  ['woord', { neuter: true, plural: 'woorden' }],
  ['jaar', { neuter: true, plural: 'jaren' }],
  ['maand', { neuter: false, plural: 'maanden' }],
  ['week', { neuter: false, plural: 'weken' }],
  ['uur', { neuter: true, plural: 'uren' }],
  ['vader', { neuter: false, plural: 'vaders' }],
  ['moeder', { neuter: false, plural: 'moeders' }],
  ['broer', { neuter: false, plural: 'broers' }],
  ['zus', { neuter: false, plural: 'zussen' }],
  ['appel', { neuter: false, plural: 'appels' }],
  ['ei', { neuter: true, plural: 'eieren' }],
  ['brood', { neuter: true, plural: 'broden' }],
  ['kaas', { neuter: false, plural: 'kazen' }],
  ['glas', { neuter: true, plural: 'glazen' }],
  ['fles', { neuter: false, plural: 'flessen' }],
  ['straat', { neuter: false, plural: 'straten' }],
  ['school', { neuter: false, plural: 'scholen' }],
  ['leraar', { neuter: false, plural: 'leraren' }],
  ['trein', { neuter: false, plural: 'treinen' }],
  ['bus', { neuter: false, plural: 'bussen' }],
  ['vliegtuig', { neuter: true, plural: 'vliegtuigen' }],
  ['meisje', { neuter: true, plural: 'meisjes' }],
  ['jongen', { neuter: false, plural: 'jongens' }],
  ['werk', { neuter: true, plural: 'werken' }],
  ['probleem', { neuter: true, plural: 'problemen' }],
  ['cadeau', { neuter: true, plural: 'cadeaus' }],
  ['idee', { neuter: true, plural: 'ideeën' }],
  ['familie', { neuter: false, plural: 'families' }],
  ['winkel', { neuter: false, plural: 'winkels' }],
  ['ziekenhuis', { neuter: true, plural: 'ziekenhuizen' }],
  ['restaurant', { neuter: true, plural: 'restaurants' }],
  ['hotel', { neuter: true, plural: 'hotels' }],
  ['museum', { neuter: true, plural: 'musea' }],
  ['universiteit', { neuter: false, plural: 'universiteiten' }],
  ['water', { neuter: true, plural: 'wateren' }],
  ['melk', { neuter: false, plural: 'melken' }],
  ['vlees', { neuter: true, plural: 'vlezen' }],
  ['tuin', { neuter: false, plural: 'tuinen' }],
  ['boom', { neuter: false, plural: 'bomen' }],
  ['bloem', { neuter: false, plural: 'bloemen' }],
  ['berg', { neuter: false, plural: 'bergen' }],
  ['zee', { neuter: false, plural: 'zeeën' }],
  ['rivier', { neuter: false, plural: 'rivieren' }]
])

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

function looksLikeVerb(word: string): boolean {
  return word.endsWith('en')
}

function isNullOrBlank(value: string | null): boolean {
  return value === null || value.trim() === ''
}

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(inf: string): InflectionParadigm | null {
  const irregular = IRREGULAR_VERBS.get(inf)
  if (irregular !== undefined) return irregularVerb(inf, irregular)
  const strong = STRONG_VERBS.get(inf)
  if (strong !== undefined) return strongVerb(inf, strong)
  return inf.endsWith('en') ? weakVerb(inf) : null
}

function weakVerb(inf: string): InflectionParadigm {
  const stem = stemOf(inf)
  const last = stem[stem.length - 1] ?? ''
  const unvoiced = 'tkpfch'.includes(last) || (last === 's' && !VOICED_S.has(stem))
  const tStem = stem.endsWith('t')
  const past = unvoiced ? 'te' : 'de'
  const pastPl = past + 'n'
  const participle = tStem
    ? `ge${stem.slice(0, -1)}t`
    : `ge${stem}${unvoiced ? 't' : 'd'}`
  return verbTables(
    inf,
    [stem, tStem ? stem : stem + 't', inf],
    [stem + past, stem + pastPl],
    participle,
    stem
  )
}

function strongVerb(inf: string, v: StrongVerb): InflectionParadigm {
  const stem = v.stem ?? stemOf(inf)
  return verbTables(
    inf,
    [stem, stem.endsWith('t') ? stem : stem + 't', inf],
    [v.pastSg, v.pastPl],
    v.participle,
    stem
  )
}

function irregularVerb(inf: string, v: IrregularVerb): InflectionParadigm {
  return verbTables(inf, v.present, [v.pastSg, v.pastPl], v.participle, v.imperative)
}

function stemOf(inf: string): string {
  const mapped = PRESENT_STEM.get(inf)
  if (mapped !== undefined) return mapped
  let stem = inf.slice(0, -2)
  const length = stem.length
  if (length >= 2 && stem[length - 1] === stem[length - 2]) {
    stem = stem.slice(0, -1)
  }
  if (stem.endsWith('v')) return stem.slice(0, -1) + 'f'
  if (stem.endsWith('z')) return stem.slice(0, -1) + 's'
  return stem
}

function verbTables(
  inf: string,
  present: string[],
  past: string[],
  participle: string,
  imperative: string
): InflectionParadigm {
  return {
    lemma: inf,
    lang: 'nl',
    kind: 'conjugation',
    note: `Voltooid deelwoord met hebben/zijn: ik heb/ben ${participle}.`,
    tables: [
      {
        title: 'Tegenwoordige tijd',
        columns: ['Vorm'],
        rows: [
          { label: 'ik', cells: [present[0]] },
          { label: 'jij/hij/zij', cells: [present[1]] },
          { label: 'wij/jullie/zij', cells: [present[2]] }
        ]
      },
      {
        title: 'Verleden tijd',
        columns: ['Vorm'],
        rows: [
          { label: 'enkelvoud', cells: [past[0]] },
          { label: 'meervoud', cells: [past[1]] }
        ]
      },
      {
        title: 'Voltooid deelwoord',
        columns: ['Vorm'],
        rows: [{ label: 'voltooid', cells: [participle] }]
      },
      {
        title: 'Imperatief',
        columns: ['Vorm'],
        rows: [{ label: 'jij', cells: [imperative] }]
      }
    ]
  }
}

// ── Nouns & adjectives ──────────────────────────────────────────────────

function splitArticle(query: string): [string | null, string] {
  const parts = query.trim().split(/\s+/, 2)
  const first = parts[0]?.toLowerCase()
  if (first === 'de' || first === 'het' || first === 'een') {
    return [first, parts[1] ?? query.trim()]
  }
  return [null, query.trim()]
}

function nounParadigm(article: string | null, word: string): InflectionParadigm | null {
  if (word === '') return null
  const info = NOUNS.get(word)
  let neuter: boolean
  if (article !== null) {
    neuter = article === 'het'
  } else if (info !== undefined) {
    neuter = info.neuter
  } else {
    return null
  }
  const plural = info?.plural ?? guessPlural(word)
  const art = neuter ? 'het' : 'de'
  return {
    lemma: word,
    lang: 'nl',
    kind: 'declension',
    note: 'Het Nederlands kent geen naamvallen; alleen getal wordt gemarkeerd.',
    tables: [
      {
        title: 'Meervoud',
        columns: ['Singular', 'Plural'],
        rows: [
          { label: 'onbepaald', cells: [`${articleWord(article)} ${word}`, plural] },
          { label: 'bepaald', cells: [`${art} ${word}`, `de ${plural}`] }
        ]
      }
    ]
  }
}

function articleWord(article: string | null): string {
  return article === null ? 'de/het' : article
}

function guessPlural(word: string): string {
  if (word.endsWith('s') || word.endsWith('f')) return word + 'en'
  if ('aeiou'.includes(word[word.length - 1] ?? '')) return word + "'s"
  if (
    word.endsWith('el') ||
    word.endsWith('er') ||
    word.endsWith('en') ||
    word.endsWith('em')
  ) {
    return word + 's'
  }
  return word + 'en'
}

function adjectiveParadigm(word: string): InflectionParadigm {
  const inflected = word + 'e'
  return {
    lemma: word,
    lang: 'nl',
    kind: 'declension',
    note:
      "Verbogen vorm: een mooi(e) ... — attributief na 'een' + onzijdig blijft onverbogen.",
    tables: [
      {
        title: 'Adjectief',
        columns: ['Vorm'],
        rows: [
          { label: 'onverbogen', cells: [word] },
          { label: 'verbogen (-e)', cells: [inflected] }
        ]
      }
    ]
  }
}

export const DutchInflector: InflectionEngine = {
  engine: 'nl-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'nl') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const [article, noun] = splitArticle(word)
    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(noun)
      case 'declension':
        return pos?.toLowerCase() === 'adjective'
          ? adjectiveParadigm(noun)
          : nounParadigm(article, noun)
      default: {
        if (pos !== null && PRONOUN_LIKE.has(pos.toLowerCase())) return null
        if (isNullOrBlank(pos) && article !== null) {
          return nounParadigm(article, noun)
        }
        if (isNullOrBlank(pos) && looksLikeVerb(noun)) {
          return conjugate(noun) ?? nounParadigm(article, noun)
        }
        return {
          lemma,
          lang: 'nl',
          kind: null,
          note: 'Bijwoorden en onveranderlijke woorden worden niet verbogen in het Nederlands.',
          tables: []
        }
      }
    }
  }
}
