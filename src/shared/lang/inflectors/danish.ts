import type {
  InflectionEngine,
  InflectionParadigm,
  ParadigmRow
} from '../inflection'

interface StrongVerb {
  present: string
  preterite: string
  supine: string
  imperative: string
}

interface NounInfo {
  neuter: boolean
  plural: string
}

const PRONOUN_LIKE = new Set(['pronoun', 'determiner', 'numeral'])

const VOWELS = 'aeiouyæøå'

const STRONG_VERBS: Map<string, StrongVerb> = new Map([
  ['se', { present: 'ser', preterite: 'så', supine: 'set', imperative: 'se' }],
  ['gå', { present: 'går', preterite: 'gik', supine: 'gået', imperative: 'gå' }],
  ['komme', { present: 'kommer', preterite: 'kom', supine: 'kommet', imperative: 'kom' }],
  ['tage', { present: 'tager', preterite: 'tog', supine: 'taget', imperative: 'tag' }],
  ['give', { present: 'giver', preterite: 'gav', supine: 'givet', imperative: 'giv' }],
  ['få', { present: 'får', preterite: 'fik', supine: 'fået', imperative: 'få' }],
  ['være', { present: 'er', preterite: 'var', supine: 'været', imperative: 'vær' }],
  ['have', { present: 'har', preterite: 'havde', supine: 'haft', imperative: 'hav' }],
  ['sidde', { present: 'sidder', preterite: 'sad', supine: 'siddet', imperative: 'sid' }],
  ['ligge', { present: 'ligger', preterite: 'lå', supine: 'ligget', imperative: 'lig' }],
  ['stå', { present: 'står', preterite: 'stod', supine: 'stået', imperative: 'stå' }],
  ['drikke', { present: 'drikker', preterite: 'drak', supine: 'drukket', imperative: 'drik' }],
  ['skrive', { present: 'skriver', preterite: 'skrev', supine: 'skrevet', imperative: 'skriv' }],
  ['synge', { present: 'synger', preterite: 'sang', supine: 'sunget', imperative: 'syng' }],
  ['dø', { present: 'dør', preterite: 'døde', supine: 'døet', imperative: 'dø' }],
  ['le', { present: 'ler', preterite: 'lo', supine: 'leet', imperative: 'le' }],
  ['vide', { present: 'ved', preterite: 'vidste', supine: 'vidst', imperative: 'vid' }],
  ['sige', { present: 'siger', preterite: 'sagde', supine: 'sagt', imperative: 'sig' }],
  ['gøre', { present: 'gør', preterite: 'gjorde', supine: 'gjort', imperative: 'gør' }],
  ['blive', { present: 'bliver', preterite: 'blev', supine: 'blevet', imperative: 'bliv' }],
  ['forstå', { present: 'forstår', preterite: 'forstod', supine: 'forstået', imperative: 'forstå' }],
  ['finde', { present: 'finder', preterite: 'fandt', supine: 'fundet', imperative: 'find' }],
  ['holde', { present: 'holder', preterite: 'holdt', supine: 'holdt', imperative: 'hold' }],
  ['kunne', { present: 'kan', preterite: 'kunne', supine: 'kunnet', imperative: '' }],
  ['ville', { present: 'vil', preterite: 'ville', supine: 'villet', imperative: '' }],
  ['skulle', { present: 'skal', preterite: 'skulle', supine: 'skullet', imperative: '' }],
  ['måtte', { present: 'må', preterite: 'måtte', supine: 'måttet', imperative: '' }],
  ['sætte', { present: 'sætter', preterite: 'satte', supine: 'sat', imperative: 'sæt' }],
  ['lægge', { present: 'lægger', preterite: 'lagde', supine: 'lagt', imperative: 'læg' }],
  ['spørge', { present: 'spørger', preterite: 'spurgte', supine: 'spurgt', imperative: 'spørg' }]
])

const GROUP_2: Set<string> = new Set([
  'tale',
  'høre',
  'køre',
  'lære',
  'læse',
  'spise',
  'møde',
  'rejse',
  'røge',
  'tælle',
  'købe',
  'sende',
  'vende',
  'glemme',
  'føle',
  'prøve',
  'øve',
  'lyse',
  'smage'
])

const NOUNS: Map<string, NounInfo> = new Map([
  ['hund', { neuter: false, plural: 'hunde' }],
  ['kat', { neuter: false, plural: 'katte' }],
  ['bil', { neuter: false, plural: 'biler' }],
  ['dag', { neuter: false, plural: 'dage' }],
  ['bog', { neuter: false, plural: 'bøger' }],
  ['mand', { neuter: false, plural: 'mænd' }],
  ['kvinde', { neuter: false, plural: 'kvinder' }],
  ['pige', { neuter: false, plural: 'piger' }],
  ['dreng', { neuter: false, plural: 'drenge' }],
  ['hus', { neuter: true, plural: 'huse' }],
  ['barn', { neuter: true, plural: 'børn' }],
  ['bord', { neuter: true, plural: 'borde' }],
  ['æble', { neuter: true, plural: 'æbler' }],
  ['år', { neuter: true, plural: 'år' }],
  ['nat', { neuter: false, plural: 'nætter' }],
  ['hånd', { neuter: false, plural: 'hænder' }],
  ['fod', { neuter: false, plural: 'fødder' }],
  ['tand', { neuter: false, plural: 'tænder' }],
  ['by', { neuter: false, plural: 'byer' }],
  ['gade', { neuter: false, plural: 'gader' }],
  ['skole', { neuter: false, plural: 'skoler' }],
  ['lærer', { neuter: false, plural: 'lærere' }],
  ['sag', { neuter: false, plural: 'sager' }],
  ['stol', { neuter: false, plural: 'stole' }],
  ['ting', { neuter: false, plural: 'ting' }],
  ['ord', { neuter: true, plural: 'ord' }],
  ['får', { neuter: true, plural: 'får' }],
  ['sko', { neuter: false, plural: 'sko' }],
  ['mor', { neuter: false, plural: 'mødre' }],
  ['far', { neuter: false, plural: 'fædre' }],
  ['øje', { neuter: true, plural: 'øjne' }],
  ['øre', { neuter: true, plural: 'ører' }],
  ['land', { neuter: true, plural: 'lande' }],
  ['vand', { neuter: true, plural: 'vand' }],
  ['fisk', { neuter: false, plural: 'fisk' }],
  ['bygning', { neuter: false, plural: 'bygninger' }],
  ['tid', { neuter: false, plural: 'tider' }],
  ['uge', { neuter: false, plural: 'uger' }],
  ['måned', { neuter: false, plural: 'måneder' }],
  ['bror', { neuter: false, plural: 'brødre' }],
  ['søster', { neuter: false, plural: 'søstre' }],
  ['familie', { neuter: false, plural: 'familier' }],
  ['rum', { neuter: true, plural: 'rum' }],
  ['tog', { neuter: true, plural: 'tog' }],
  ['fly', { neuter: true, plural: 'fly' }],
  ['morgenmad', { neuter: false, plural: 'morgenmader' }],
  ['kaffe', { neuter: false, plural: 'kaffer' }],
  ['vinter', { neuter: false, plural: 'vintre' }],
  ['sommer', { neuter: false, plural: 'somre' }],
  ['træ', { neuter: true, plural: 'træer' }],
  ['blomst', { neuter: false, plural: 'blomster' }],
  ['skov', { neuter: false, plural: 'skove' }],
  ['hav', { neuter: true, plural: 'have' }],
  ['bjerg', { neuter: true, plural: 'bjerge' }]
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
  return word.endsWith('e') || (word.length > 0 && VOWELS.includes(word[word.length - 1]))
}

function conjugate(inf: string): InflectionParadigm | null {
  const strong = STRONG_VERBS.get(inf)
  if (strong !== undefined) return strongVerb(inf, strong)
  if (GROUP_2.has(inf)) return group2Verb(inf)
  if (inf.length > 0 && VOWELS.includes(inf[inf.length - 1]) && !inf.endsWith('e')) {
    return group3Verb(inf)
  }
  if (inf.endsWith('e')) return group1Verb(inf)
  return null
}

function group1Verb(inf: string): InflectionParadigm {
  const stem = inf.slice(0, -1)
  return verbTables(inf, inf + 'r', stem + 'ede', stem + 'et', stem)
}

function group2Verb(inf: string): InflectionParadigm {
  const stem = inf.slice(0, -1)
  return verbTables(inf, inf + 'r', stem + 'te', stem + 't', stem)
}

function group3Verb(inf: string): InflectionParadigm {
  return verbTables(inf, inf + 'r', inf + 'ede', inf + 'et', inf)
}

function strongVerb(inf: string, v: StrongVerb): InflectionParadigm {
  return verbTables(inf, v.present, v.preterite, v.supine, v.imperative)
}

function verbTables(
  inf: string,
  present: string,
  preterite: string,
  supine: string,
  imperative: string
): InflectionParadigm {
  const rows: ParadigmRow[] = [
    { label: 'Infinitiv', cells: [inf] },
    { label: 'Nutid', cells: [present] },
    { label: 'Datid', cells: [preterite] },
    { label: 'Førnutid', cells: [supine] }
  ]
  if (imperative !== '') rows.push({ label: 'Bydeform', cells: [imperative] })
  return {
    lemma: inf,
    lang: 'da',
    kind: 'conjugation',
    note: 'De fem verbbøjninger. Passiv dannes med -s (tales).',
    tables: [{ title: 'Bøjning', columns: ['Form'], rows }]
  }
}

function splitArticle(query: string): [string | null, string] {
  const parts = query.trim().split(/\s+/, 2)
  const first = parts[0]?.toLowerCase()
  if (first === 'en' || first === 'et') {
    return [first, parts[1] ?? query.trim()]
  }
  return [null, query.trim()]
}

function nounParadigm(article: string | null, word: string): InflectionParadigm | null {
  if (word === '') return null
  const info = NOUNS.get(word)
  let neuter: boolean
  if (article !== null) {
    neuter = article === 'et'
  } else if (info !== undefined) {
    neuter = info.neuter
  } else {
    return null
  }
  const plural = info?.plural ?? guessPlural(word)
  const defSg = definiteSingular(word, neuter)
  const defPl =
    VOWELS.includes(plural[plural.length - 1]) && !plural.endsWith('e')
      ? plural + 'ene'
      : plural + 'ne'
  return {
    lemma: word,
    lang: 'da',
    kind: 'declension',
    note: `Genitiv dannes med -s (${word}s).`,
    tables: [
      {
        title: 'Bøjning',
        columns: ['Singular', 'Plural'],
        rows: [
          { label: 'Ubestemt', cells: [`${articleWord(article)} ${word}`, plural] },
          { label: 'Bestemt', cells: [defSg, defPl] }
        ]
      }
    ]
  }
}

function articleWord(article: string | null): string {
  return article === null ? 'en/et' : article
}

function definiteSingular(word: string, neuter: boolean): string {
  const endsVowel = VOWELS.includes(word[word.length - 1])
  if (neuter) {
    if (word.endsWith('e')) return word.slice(0, -1) + 'et'
    if (endsVowel) return word.slice(0, -1) + 't'
    return word + 'et'
  }
  return endsVowel ? word + 'n' : word + 'en'
}

function guessPlural(word: string): string {
  if (word.endsWith('e')) return word + 'r'
  if (VOWELS.includes(word[word.length - 1])) return word + 'r'
  return word + 'e'
}

function adjectiveParadigm(word: string): InflectionParadigm {
  const neuter = word + 't'
  const plural = word.endsWith('en') ? word.slice(0, -2) + 'ne' : word + 'e'
  return {
    lemma: word,
    lang: 'da',
    kind: 'declension',
    note: `Bestemt form: ${plural}.`,
    tables: [
      {
        title: 'Adjektivbøjning',
        columns: ['Singular', 'Plural'],
        rows: [
          { label: 'Fælleskøn', cells: [word, plural] },
          { label: 'Intetkøn', cells: [neuter, plural] }
        ]
      }
    ]
  }
}

export const DanishInflector: InflectionEngine = {
  engine: 'da-bundled',

  async inflect(
    lemma: string,
    lang: string,
    pos: string | null
  ): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'da') return null
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
        if ((pos === null || pos.trim() === '') && article !== null) {
          return nounParadigm(article, noun)
        }
        if ((pos === null || pos.trim() === '') && looksLikeVerb(noun)) {
          return conjugate(noun) ?? nounParadigm(article, noun)
        }
        return {
          lemma,
          lang: 'da',
          kind: null,
          note: 'Adverbier og uforanderlige ord bøjes ikke på dansk.',
          tables: []
        }
      }
    }
  }
}
