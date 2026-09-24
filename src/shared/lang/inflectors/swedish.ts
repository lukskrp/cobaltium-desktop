import type { InflectionEngine, InflectionParadigm } from '../inflection'

/**
 * Bundled Swedish (sv) inflector: deterministic, offline LangDex paradigms.
 *
 * Verbs: Swedish verbs have five forms — infinitiv, presens, preteritum,
 * supinum, imperativ. Groups:
 * - Group 1 (-ar/-ade/-at): tala, arbeta, spela (the majority of -a verbs).
 * - Group 2 (-er/-de or -te/-t): curated common verbs (stänga -> stängde,
 *   köpa -> köpte), with the -de/-te split by stem voicing.
 * - Group 3 (-r/-dde/-tt, vowel stems): bo -> bor/bodde/bott, tro, sy.
 * - Group 4 strong (curated ~28): vara, ha, komma, se, ge, gå, ta, få, äta,
 *   dricka, skriva, läsa, sitta, ligga, stå, säga, veta, bli, förstå, springa,
 *   sjunga, dö, le, höra, göra, finna, hålla, dra.
 *
 * Nouns: en/ett gender (lexical) via article-prefixed queries ("en hund",
 * "ett hus") or a curated dictionary; five forms: indefinite/definite x
 * singular/plural (hunden, hundar, hundarna) plus the -s genitive note.
 * Plural patterns: -or, -ar, -er (with umlaut), -r, -n, and invariant.
 *
 * Adjectives: agreement in gender and number (stor/stort/stora) with the
 * -en/-el/-er stem rules (öppen -> öppet/öppna).
 *
 * Unhandled words return null so the caller falls back to the LLM tier.
 */
export const SwedishInflector: InflectionEngine = {
  engine: 'sv-bundled',

  async inflect(
    lemma: string,
    lang: string,
    pos: string | null
  ): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'sv') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const [article, noun] = splitArticle(word)
    const kind = classify(pos)
    if (kind === 'conjugation') return conjugate(noun)
    if (kind === 'declension') {
      return pos?.toLowerCase() === 'adjective' ? adjectiveParadigm(noun) : nounParadigm(article, noun)
    }

    const lowered = pos?.toLowerCase()
    if (lowered != null && PRONOUN_LIKE.has(lowered)) return null
    if (isNullOrBlank(pos) && article != null) return nounParadigm(article, noun)
    if (isNullOrBlank(pos) && looksLikeVerb(noun)) return conjugate(noun) ?? nounParadigm(article, noun)
    return {
      lemma,
      lang: 'sv',
      kind: null,
      note: 'Adverb och oböjliga ord böjs inte i svenskan.',
      tables: []
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

const PRONOUN_LIKE: Set<string> = new Set(['pronoun', 'determiner', 'numeral'])

function isNullOrBlank(pos: string | null): boolean {
  return pos == null || pos.trim() === ''
}

function looksLikeVerb(word: string): boolean {
  return word.endsWith('a') || (word.length > 0 && VOWEL_TAIL.includes(word[word.length - 1]))
}

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(inf: string): InflectionParadigm | null {
  const strong = STRONG_VERBS[inf]
  if (strong) return strongVerb(inf, strong)
  if (GROUP_2.has(inf)) return group2Verb(inf)
  if (inf.length > 0 && VOWEL_TAIL.includes(inf[inf.length - 1]) && !inf.endsWith('a')) {
    return group3Verb(inf)
  }
  if (inf.endsWith('a')) return group1Verb(inf)
  return null
}

function group1Verb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 1)
  return verbTables(inf, stem + 'ar', stem + 'ade', stem + 'at', inf)
}

function group2Verb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 1)
  const suffix = 'gmnlrv'.includes(stem[stem.length - 1]) ? 'de' : 'te'
  return verbTables(inf, stem + 'er', stem + suffix, stem + 't', stem)
}

function group3Verb(inf: string): InflectionParadigm {
  return verbTables(inf, inf + 'r', inf + 'dde', inf + 'tt', inf)
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
  return {
    lemma: inf,
    lang: 'sv',
    kind: 'conjugation',
    note: 'De fem verbböjningarna. S-formen (passiv) bildas med -s (talas).',
    tables: [
      {
        title: 'Böjning',
        columns: ['Form'],
        rows: [
          { label: 'Infinitiv', cells: [inf] },
          { label: 'Presens', cells: [present] },
          { label: 'Preteritum', cells: [preterite] },
          { label: 'Supinum', cells: [supine] },
          { label: 'Imperativ', cells: [imperative] }
        ]
      }
    ]
  }
}

// ── Nouns & adjectives ──────────────────────────────────────────────────

function splitArticle(query: string): [string | null, string] {
  const trimmed = query.trim()
  const match = /\s+/.exec(trimmed)
  const parts: string[] = match
    ? [trimmed.slice(0, match.index), trimmed.slice(match.index + match[0].length)]
    : [trimmed]
  const first = parts[0]?.toLowerCase()
  return first === 'en' || first === 'ett' || first === 'den' || first === 'det'
    ? [first, parts[1] ?? trimmed]
    : [null, trimmed]
}

function nounParadigm(article: string | null, word: string): InflectionParadigm | null {
  if (word === '') return null
  const info = NOUNS[word]
  let neuter: boolean
  if (article != null) {
    neuter = article === 'ett' || article === 'det'
  } else if (info != null) {
    neuter = info.neuter
  } else {
    return null
  }
  const plural = info?.plural ?? guessPlural(word, neuter)
  const defSg = definiteSingular(word, neuter)
  const defPl = plural === word ? plural + 'en' : plural + 'na'
  return {
    lemma: word,
    lang: 'sv',
    kind: 'declension',
    note: `Genitiv bildas med -s (${word}s, ${defSg}'s).`,
    tables: [
      {
        title: 'Deklination',
        columns: ['Singular', 'Plural'],
        rows: [
          { label: 'Obestämd', cells: [`${articleWord(article)} ${word}`, plural] },
          { label: 'Bestämd', cells: [defSg, defPl] }
        ]
      }
    ]
  }
}

function articleWord(article: string | null): string {
  return article == null ? 'en/ett' : article
}

function definiteSingular(word: string, neuter: boolean): string {
  const endsVowel = VOWEL_TAIL.includes(word[word.length - 1])
  if (neuter) {
    if (word.endsWith('e')) return dropLast(word, 1) + 'et'
    if (endsVowel) return dropLast(word, 1) + 't'
    return word + 'et'
  }
  return endsVowel ? word + 'n' : word + 'en'
}

function guessPlural(word: string, neuter: boolean): string {
  if (word.endsWith('are')) return word
  if (word.endsWith('a')) return dropLast(word, 1) + 'or'
  if (neuter) return VOWEL_TAIL.includes(word[word.length - 1]) ? word + 'n' : word
  return word + 'ar'
}

function adjectiveParadigm(word: string): InflectionParadigm {
  let neuter: string
  if (word.endsWith('en')) {
    neuter = dropLast(word, 2) + 'et'
  } else if (word.endsWith('el')) {
    neuter = dropLast(word, 2) + 'elt'
  } else if (word.endsWith('er')) {
    neuter = dropLast(word, 2) + 'ert'
  } else if (VOWEL_TAIL.includes(word[word.length - 1])) {
    neuter = word + 'tt'
  } else {
    neuter = word + 't'
  }

  let plural: string
  if (word.endsWith('en')) {
    plural = removeSuffix(word, 'en') + 'na'
  } else if (word.endsWith('el')) {
    plural = removeSuffix(word, 'el') + 'la'
  } else if (word.endsWith('er')) {
    plural = removeSuffix(word, 'er') + 'ra'
  } else {
    plural = word + 'a'
  }

  return {
    lemma: word,
    lang: 'sv',
    kind: 'declension',
    note: `Bestämd form och plural: ${plural}.`,
    tables: [
      {
        title: 'Adjektivböjning',
        columns: ['Singular', 'Plural'],
        rows: [
          { label: 'Utrum', cells: [word, plural] },
          { label: 'Neutrum', cells: [neuter, plural] }
        ]
      }
    ]
  }
}

function dropLast(value: string, count: number): string {
  return value.slice(0, value.length - count)
}

function removeSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value.slice(0, value.length - suffix.length) : value
}

// ── Data ────────────────────────────────────────────────────────────────

interface StrongVerb {
  present: string
  preterite: string
  supine: string
  imperative: string
}

const VOWEL_TAIL = 'aeiouyåäö'

/** Common strong (group 4) verbs. */
const STRONG_VERBS: Record<string, StrongVerb> = {
  vara: { present: 'är', preterite: 'var', supine: 'varit', imperative: 'var' },
  ha: { present: 'har', preterite: 'hade', supine: 'haft', imperative: 'ha' },
  komma: { present: 'kommer', preterite: 'kom', supine: 'kommit', imperative: 'kom' },
  se: { present: 'ser', preterite: 'såg', supine: 'sett', imperative: 'se' },
  ge: { present: 'ger', preterite: 'gav', supine: 'gett', imperative: 'ge' },
  gå: { present: 'går', preterite: 'gick', supine: 'gått', imperative: 'gå' },
  ta: { present: 'tar', preterite: 'tog', supine: 'tagit', imperative: 'ta' },
  få: { present: 'får', preterite: 'fick', supine: 'fått', imperative: 'få' },
  äta: { present: 'äter', preterite: 'åt', supine: 'ätit', imperative: 'ät' },
  dricka: { present: 'dricker', preterite: 'drack', supine: 'druckit', imperative: 'drick' },
  skriva: { present: 'skriver', preterite: 'skrev', supine: 'skrivit', imperative: 'skriv' },
  läsa: { present: 'läser', preterite: 'läste', supine: 'läst', imperative: 'läs' },
  sitta: { present: 'sitter', preterite: 'satt', supine: 'suttit', imperative: 'sitt' },
  ligga: { present: 'ligger', preterite: 'låg', supine: 'legat', imperative: 'ligg' },
  stå: { present: 'står', preterite: 'stod', supine: 'stått', imperative: 'stå' },
  säga: { present: 'säger', preterite: 'sa', supine: 'sagt', imperative: 'säg' },
  veta: { present: 'vet', preterite: 'visste', supine: 'vetat', imperative: 'vet' },
  bli: { present: 'blir', preterite: 'blev', supine: 'blivit', imperative: 'bli' },
  förstå: { present: 'förstår', preterite: 'förstod', supine: 'förstått', imperative: 'förstå' },
  springa: { present: 'springer', preterite: 'sprang', supine: 'sprungit', imperative: 'spring' },
  sjunga: { present: 'sjunger', preterite: 'sjöng', supine: 'sjungit', imperative: 'sjung' },
  dö: { present: 'dör', preterite: 'dog', supine: 'dött', imperative: 'dö' },
  le: { present: 'ler', preterite: 'log', supine: 'lett', imperative: 'le' },
  höra: { present: 'hör', preterite: 'hörde', supine: 'hört', imperative: 'hör' },
  göra: { present: 'gör', preterite: 'gjorde', supine: 'gjort', imperative: 'gör' },
  finna: { present: 'finner', preterite: 'fann', supine: 'funnit', imperative: 'finn' },
  hålla: { present: 'håller', preterite: 'höll', supine: 'hållit', imperative: 'håll' },
  dra: { present: 'drar', preterite: 'drog', supine: 'dragit', imperative: 'dra' }
}

/** Common group 2 weak verbs (stänga -> stänger/stängde/stängt). */
const GROUP_2: Set<string> = new Set([
  'stänga',
  'ringa',
  'känna',
  'följa',
  'bygga',
  'vända',
  'sända',
  'kräva',
  'leva',
  'glömma',
  'drömma',
  'köpa',
  'tänka',
  'tycka',
  'hjälpa',
  'röka',
  'söka',
  'möta',
  'släppa',
  'resa',
  'nämna',
  'stämma',
  'döma',
  'störa',
  'böja'
])

interface Noun {
  neuter: boolean
  plural: string
}

/** Common nouns: gender + plural. Bare words outside the dictionary fall back to the LLM. */
const NOUNS: Record<string, Noun> = {
  hund: { neuter: false, plural: 'hundar' },
  katt: { neuter: false, plural: 'katter' },
  bil: { neuter: false, plural: 'bilar' },
  flicka: { neuter: false, plural: 'flickor' },
  pojke: { neuter: false, plural: 'pojkar' },
  kvinna: { neuter: false, plural: 'kvinnor' },
  man: { neuter: false, plural: 'män' },
  hus: { neuter: true, plural: 'hus' },
  barn: { neuter: true, plural: 'barn' },
  bord: { neuter: true, plural: 'bord' },
  äpple: { neuter: true, plural: 'äpplen' },
  fönster: { neuter: true, plural: 'fönster' },
  bok: { neuter: false, plural: 'böcker' },
  dag: { neuter: false, plural: 'dagar' },
  natt: { neuter: false, plural: 'nätter' },
  hand: { neuter: false, plural: 'händer' },
  fot: { neuter: false, plural: 'fötter' },
  stad: { neuter: false, plural: 'städer' },
  tand: { neuter: false, plural: 'tänder' },
  skola: { neuter: false, plural: 'skolor' },
  lärare: { neuter: false, plural: 'lärare' },
  sak: { neuter: false, plural: 'saker' },
  stol: { neuter: false, plural: 'stolar' },
  öga: { neuter: true, plural: 'ögon' },
  öra: { neuter: true, plural: 'öron' },
  land: { neuter: true, plural: 'länder' },
  vatten: { neuter: true, plural: 'vatten' },
  tid: { neuter: false, plural: 'tider' },
  vän: { neuter: false, plural: 'vänner' },
  mamma: { neuter: false, plural: 'mammor' },
  pappa: { neuter: false, plural: 'pappor' },
  bror: { neuter: false, plural: 'bröder' },
  syster: { neuter: false, plural: 'systrar' },
  familj: { neuter: false, plural: 'familjer' },
  rum: { neuter: true, plural: 'rum' },
  tåg: { neuter: true, plural: 'tåg' },
  flygplan: { neuter: true, plural: 'flygplan' },
  frukost: { neuter: false, plural: 'frukostar' },
  middag: { neuter: false, plural: 'middagar' },
  kaffe: { neuter: true, plural: 'kaffen' },
  fisk: { neuter: false, plural: 'fiskar' },
  fågel: { neuter: false, plural: 'fåglar' },
  träd: { neuter: true, plural: 'träd' },
  blomma: { neuter: false, plural: 'blommor' },
  skog: { neuter: false, plural: 'skogar' },
  hav: { neuter: true, plural: 'hav' },
  berg: { neuter: true, plural: 'berg' }
}
