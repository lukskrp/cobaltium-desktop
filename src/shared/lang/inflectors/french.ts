import type { InflectionEngine, InflectionParadigm, ParadigmTable } from '../inflection'

/**
 * Bundled French (fr) inflector: deterministic, offline LangDex paradigms.
 *
 * Verbs:
 * - Regular groups with full tenses: -er (parler), -ir (finir), -re (vendre).
 *   -er includes the orthographic classes: -cer/-ger (nous commençons,
 *   mangeons), -yer (je paie), -eler/-eter (j'appelle vs j'achète), and -é-er
 *   (j'espère). Tenses: Présent, Imparfait, Passé simple, Futur simple,
 *   Conditionnel présent, Présent du subjonctif, Impératif, Passé composé,
 *   Plus-que-parfait, plus Participe présent/passé.
 * - Passé composé uses avoir, or être for the curated motion/change verbs
 *   (aller, venir, arriver, naître, mourir, ...).
 * - Curated irregulars (~38): être, avoir, aller, faire, dire, voir, venir,
 *   pouvoir, vouloir, devoir, savoir, prendre, mettre, boire, croire, partir,
 *   sortir, dormir, servir, suivre, vivre, écrire, lire, conduire, connaître,
 *   naître, recevoir, ouvrir, offrir, courir, mourir, rire, craindre, peindre,
 *   tenir, plaire, valoir, falloir (impersonal).
 *
 * Nouns: no case system — only number. Plural rules cover -eau/-au/-eu -> -x,
 * -al -> -aux (with exceptions), -ou -> -x (bijoux, choux, ...), -ail -> -aux
 * (travail, ...) and unchanged -s/-x/-z.
 *
 * Adjectives: agreement in gender and number (petit/petite/petits/petites),
 * with the common stem rules (-er -> -ère, -eux -> -euse, -f -> -ve, -c -> -che,
 * -en/-on/-an -> -nne, -el -> -elle, -s -> -sse, ...) and a curated exception
 * set (beau, vieux, gros, sec, doux, faux, long, frais, fou, complet, ...).
 *
 * Unhandled words return null so the caller falls back to the LLM tier.
 */
export const FrenchInflector: InflectionEngine = {
  engine: 'fr-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'fr') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const kind = classify(pos)
    if (kind === 'conjugation') return conjugate(word)
    if (kind === 'declension') {
      return pos?.toLowerCase() === 'adjective' ? adjectiveParadigm(word) : nounParadigm(word)
    }

    const lowered = pos?.toLowerCase()
    if (lowered != null && PRONOUN_LIKE.has(lowered)) return null
    if ((pos == null || pos.trim() === '') && looksLikeVerb(word)) {
      return conjugate(word) ?? nounParadigm(word)
    }
    if (pos == null || pos.trim() === '') return nounParadigm(word)
    return {
      lemma,
      lang: 'fr',
      kind: null,
      note: 'Les adverbes et mots invariables ne se conjuguent pas en français.',
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

function looksLikeVerb(word: string): boolean {
  return word.endsWith('er') || word.endsWith('ir') || word.endsWith('re')
}

/** Pronouns/determiners/numeral decline in French but the rule engine cannot
 *  guess them (je, ce, mon) — send them to the LLM tier. */
const PRONOUN_LIKE: Set<string> = new Set(['pronoun', 'determiner', 'numeral'])

function conjugate(word: string): InflectionParadigm | null {
  const irregular = IRREGULAR_VERBS[word]
  if (irregular) return irregularVerbParadigm(word, irregular)
  if (word.endsWith('er')) return erVerb(word)
  if (word.endsWith('ir')) return irVerb(word)
  if (word.endsWith('re')) return reVerb(word)
  return null
}

/** Regular -er verbs, including the orthographic stem classes. */
function erVerb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 2)
  const ortho = orthoEr(stem)
  const present = presentEr(stem, ortho)
  const imparfaitStem = removeSuffix(present[3], 'ons')
  const stem3pl = removeSuffix(present[5], 'ent')
  let passeSimple: string[]
  if (ortho === 'cer') {
    passeSimple = ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'].map((e) => dropLast(stem, 1) + 'ç' + e)
  } else if (ortho === 'ger') {
    passeSimple = ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'].map((e) => stem + 'e' + e)
  } else {
    passeSimple = ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'].map((e) => stem + e)
  }
  const futureStem = inf
  const future = FUTURE_ENDINGS.map((e) => futureStem + e)
  return verbParadigm({
    inf,
    present,
    imparfait: IMPARFAIT_ENDINGS.map((e) => imparfaitStem + e),
    passeSimple,
    future,
    conditionnel: CONDITIONNEL_ENDINGS.map((e) => futureStem + e),
    subjPresent: subjonctif(stem3pl, imparfaitStem),
    imperative: [present[0], present[3], present[4]],
    participlePresent: imparfaitStem + 'ant',
    participlePasse: stem + 'é',
    auxiliary: auxiliaryOf(inf)
  })
}

/** Regular 2nd-group -ir verbs (finir -> finissons). */
function irVerb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 2)
  const present = [
    stem + 'is',
    stem + 'is',
    stem + 'it',
    stem + 'issons',
    stem + 'issez',
    stem + 'issent'
  ]
  const imparfaitStem = removeSuffix(present[3], 'ons')
  const stem3pl = removeSuffix(present[5], 'ent')
  const passeSimple = ['is', 'is', 'it', 'îmes', 'îtes', 'irent'].map((e) => stem + e)
  const future = FUTURE_ENDINGS.map((e) => inf + e)
  return verbParadigm({
    inf,
    present,
    imparfait: IMPARFAIT_ENDINGS.map((e) => imparfaitStem + e),
    passeSimple,
    future,
    conditionnel: CONDITIONNEL_ENDINGS.map((e) => inf + e),
    subjPresent: subjonctif(stem3pl, imparfaitStem),
    imperative: [present[0], present[3], present[4]],
    participlePresent: imparfaitStem + 'ant',
    participlePasse: stem + 'i',
    auxiliary: auxiliaryOf(inf)
  })
}

/** Regular -re verbs (vendre -> vendons). */
function reVerb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 2)
  const present = [stem + 's', stem + 's', stem, stem + 'ons', stem + 'ez', stem + 'ent']
  const imparfaitStem = removeSuffix(present[3], 'ons')
  const stem3pl = removeSuffix(present[5], 'ent')
  const passeSimple = ['is', 'is', 'it', 'îmes', 'îtes', 'irent'].map((e) => stem + e)
  // Future stem drops the final -e of the infinitive (vendre -> vendr-).
  const futureStem = dropLast(inf, 1)
  const future = FUTURE_ENDINGS.map((e) => futureStem + e)
  return verbParadigm({
    inf,
    present,
    imparfait: IMPARFAIT_ENDINGS.map((e) => imparfaitStem + e),
    passeSimple,
    future,
    conditionnel: CONDITIONNEL_ENDINGS.map((e) => futureStem + e),
    subjPresent: subjonctif(stem3pl, imparfaitStem),
    imperative: [present[0], present[3], present[4]],
    participlePresent: imparfaitStem + 'ant',
    participlePasse: stem + 'u',
    auxiliary: auxiliaryOf(inf)
  })
}

/** Subjonctif présent: je/tu/il/ils from the 3pl stem, nous/vous from the
 *  imparfait stem (parle, parlions; finisse, finissions; vende, vendions). */
function subjonctif(stem3pl: string, imparfaitStem: string): string[] {
  return [
    stem3pl + 'e',
    stem3pl + 'es',
    stem3pl + 'e',
    imparfaitStem + 'ions',
    imparfaitStem + 'iez',
    stem3pl + 'ent'
  ]
}

function auxiliaryOf(inf: string): string {
  return ETRE_VERBS.has(inf) ? 'être' : 'avoir'
}

/** Orthographic class of an -er verb stem. */
function orthoEr(stem: string): OrthoEr {
  if (stem.endsWith('c')) return 'cer'
  if (stem.endsWith('g')) return 'ger'
  if (stem.endsWith('y')) return 'yer'
  if (stem.endsWith('el') || stem.endsWith('et')) return 'eler_eter'
  if (stem.includes('é')) return 'e_accent'
  return 'plain'
}

function presentEr(stem: string, ortho: OrthoEr): string[] {
  let stressed: string
  switch (ortho) {
    case 'yer':
      stressed = dropLast(stem, 1) + 'i' // payer -> pai- (je paie)
      break
    // appeler doubles the l; acheter-style verbs turn -el/-et into -èl/-èt
    case 'eler_eter':
      stressed = ELER_DOUBLE.has(stem) ? stem + 'l' : dropLast(stem, 2) + 'è' + stem[stem.length - 1]
      break
    case 'e_accent':
      stressed = replaceLastAccent(stem) // espérer -> espèr-
      break
    default:
      stressed = stem
      break
  }
  let nous: string
  if (ortho === 'cer') {
    nous = dropLast(stem, 1) + 'çons' // commencer -> commençons
  } else if (ortho === 'ger') {
    nous = stem + 'eons' // manger -> mangeons
  } else {
    nous = stem + 'ons'
  }
  return [stressed + 'e', stressed + 'es', stressed + 'e', nous, stem + 'ez', stressed + 'ent']
}

function replaceLastAccent(stem: string): string {
  const i = stem.lastIndexOf('é')
  return i >= 0 ? stem.slice(0, i) + 'è' + stem.slice(i + 1) : stem
}

function irregularVerbParadigm(inf: string, v: IrregularVerb): InflectionParadigm {
  const imparfait =
    v.imparfait ?? IMPARFAIT_ENDINGS.map((e) => removeSuffix(v.present[3], 'ons') + e)
  const future = FUTURE_ENDINGS.map((e) => v.futureStem + e)
  const imperative = v.imperative ?? []
  const note = v.impersonal
    ? "Verbe impersonnel : ne s'emploie qu'à la 3e personne du singulier (il ...)."
    : `Le passé composé et le plus-que-parfait se conjuguent avec ${v.auxiliary ?? 'avoir'}.`
  return {
    lemma: inf,
    lang: 'fr',
    kind: 'conjugation',
    note,
    tables: verbTables({
      inf,
      present: v.present,
      imparfait,
      passeSimple: v.passeSimple,
      future,
      conditionnel: CONDITIONNEL_ENDINGS.map((e) => v.futureStem + e),
      subjPresent: v.subjPresent,
      imperative,
      participlePresent: v.participlePresent ?? null,
      participlePasse: v.participlePasse,
      auxiliary: v.auxiliary ?? 'avoir'
    })
  }
}

interface VerbParadigmInput {
  inf: string
  present: string[]
  imparfait: string[]
  passeSimple: string[]
  future: string[]
  conditionnel: string[]
  subjPresent: string[]
  imperative: string[]
  participlePresent: string
  participlePasse: string
  auxiliary: string
}

function verbParadigm(p: VerbParadigmInput): InflectionParadigm {
  return {
    lemma: p.inf,
    lang: 'fr',
    kind: 'conjugation',
    note: `Le passé composé et le plus-que-parfait se conjuguent avec ${p.auxiliary}.`,
    tables: verbTables(p)
  }
}

interface VerbTablesInput {
  inf: string
  present: string[]
  imparfait: string[]
  passeSimple: string[]
  future: string[]
  conditionnel: string[]
  subjPresent: string[]
  imperative: string[]
  participlePresent: string | null
  participlePasse: string
  auxiliary: string
}

function verbTables(p: VerbTablesInput): ParadigmTable[] {
  const auxPresent = p.auxiliary === 'être' ? ETRE_PRESENT : AVOIR_PRESENT
  const auxImparfait = p.auxiliary === 'être' ? ETRE_IMPARFAIT : AVOIR_IMPARFAIT
  const tables: ParadigmTable[] = []
  tables.push({
    title: 'Présent',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({ label: person, cells: [p.present[i]] }))
  })
  tables.push({
    title: 'Imparfait',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({ label: person, cells: [p.imparfait[i]] }))
  })
  tables.push({
    title: 'Passé simple',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({ label: person, cells: [p.passeSimple[i]] }))
  })
  tables.push({
    title: 'Futur simple',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({ label: person, cells: [p.future[i]] }))
  })
  tables.push({
    title: 'Conditionnel présent',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({ label: person, cells: [p.conditionnel[i]] }))
  })
  tables.push({
    title: 'Présent du subjonctif',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({ label: person, cells: [p.subjPresent[i]] }))
  })
  if (p.imperative.length > 0) {
    tables.push({
      title: 'Impératif',
      columns: ['Forme'],
      rows: IMPERATIVE_LABELS.map((label, i) => ({ label, cells: [p.imperative[i]] }))
    })
  }
  tables.push({
    title: 'Passé composé',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({
      label: person,
      cells: [`${auxPresent[i]} ${p.participlePasse}`]
    }))
  })
  tables.push({
    title: 'Plus-que-parfait',
    columns: ['Forme'],
    rows: PERSONS.map((person, i) => ({
      label: person,
      cells: [`${auxImparfait[i]} ${p.participlePasse}`]
    }))
  })
  const ppRows: ParadigmTable['rows'] = []
  ppRows.push({ label: 'Infinitif', cells: [p.inf] })
  if (p.participlePresent != null) {
    ppRows.push({ label: 'Participe présent', cells: [p.participlePresent] })
  }
  ppRows.push({ label: 'Participe passé', cells: [p.participlePasse] })
  tables.push({ title: 'Formes non personnelles', columns: ['Forme'], rows: ppRows })
  return tables
}

function nounParadigm(word: string): InflectionParadigm {
  const plural = pluralOf(word)
  return {
    lemma: word,
    lang: 'fr',
    kind: 'declension',
    note: 'Les noms français ne se déclinent pas ; seul le nombre varie.',
    tables: [
      {
        title: 'Nombre',
        columns: ['Singulier', 'Pluriel'],
        rows: [{ label: 'Forme', cells: [word, plural] }]
      }
    ]
  }
}

/** French plural: -eau/-au/-eu -> -x, -al -> -aux (exceptions take -s),
 *  -ou -> -x for the seven -oux words, -ail -> -aux for travail & co. */
function pluralOf(word: string): string {
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z')) return word
  if (word.endsWith('eau') || word.endsWith('au') || word.endsWith('eu')) return word + 'x'
  if (word.endsWith('al')) {
    return AL_EXCEPTIONS.has(word) ? word + 's' : dropLast(word, 2) + 'aux'
  }
  if (word.endsWith('ou')) return OU_X.has(word) ? word + 'x' : word + 's'
  if (word.endsWith('ail')) {
    return AIL_AUX.has(word) ? dropLast(word, 3) + 'aux' : word + 's'
  }
  return word + 's'
}

function adjectiveParadigm(word: string): InflectionParadigm {
  const feminine = feminineOf(word)
  return {
    lemma: word,
    lang: 'fr',
    kind: 'declension',
    note: "L'adjectif s'accorde en genre et en nombre avec le nom.",
    tables: [
      {
        title: 'Genre et nombre',
        columns: ['Singulier', 'Pluriel'],
        rows: [
          { label: 'Masculin', cells: [word, pluralOf(word)] },
          { label: 'Féminin', cells: [feminine, pluralOf(feminine)] }
        ]
      }
    ]
  }
}

function feminineOf(word: string): string {
  if (word.endsWith('e')) return word
  const irregular = FEMININE_IRREGULAR[word]
  if (irregular != null) return irregular
  if (word.endsWith('er')) return dropLast(word, 2) + 'ère'
  if (word.endsWith('el') || word.endsWith('eil')) return word + 'le'
  if (word.endsWith('en') || word.endsWith('on') || word.endsWith('an')) return word + 'ne'
  if (word.endsWith('et')) return ET_ETE.has(word) ? dropLast(word, 2) + 'ète' : word + 'te'
  if (word.endsWith('x')) return dropLast(word, 1) + 'se'
  if (word.endsWith('f')) return dropLast(word, 1) + 've'
  if (word.endsWith('c')) return dropLast(word, 1) + 'che'
  if (word.endsWith('s')) return S_SSE.has(word) ? word + 'se' : word + 'e'
  if (word.endsWith('eur')) return EUR_E.has(word) ? word + 'e' : dropLast(word, 3) + 'euse'
  if (word.endsWith('il')) return word + 'le'
  return word + 'e'
}

function dropLast(value: string, count: number): string {
  return value.slice(0, value.length - count)
}

function removeSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value.slice(0, value.length - suffix.length) : value
}

const PERSONS = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles']
const IMPERATIVE_LABELS = ['tu', 'nous', 'vous']

const FUTURE_ENDINGS = ['ai', 'as', 'a', 'ons', 'ez', 'ont']
const IMPARFAIT_ENDINGS = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient']
const CONDITIONNEL_ENDINGS = IMPARFAIT_ENDINGS

const AVOIR_PRESENT = ['ai', 'as', 'a', 'avons', 'avez', 'ont']
const AVOIR_IMPARFAIT = ['avais', 'avais', 'avait', 'avions', 'aviez', 'avaient']
const ETRE_PRESENT = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont']
const ETRE_IMPARFAIT = ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient']

/** Verbs conjugated with être in compound tenses. */
const ETRE_VERBS: Set<string> = new Set([
  'aller',
  'venir',
  'partir',
  'sortir',
  'arriver',
  'entrer',
  'rester',
  'retourner',
  'tomber',
  'monter',
  'descendre',
  'rentrer',
  'naître',
  'mourir',
  'devenir',
  'revenir',
  'passer'
])

type OrthoEr = 'plain' | 'cer' | 'ger' | 'yer' | 'eler_eter' | 'e_accent'

/** -eler/-eter verbs that double the consonant (appeler, jeter); all others
 *  of the class take an accent (acheter, peler, geler, ...). */
const ELER_DOUBLE: Set<string> = new Set([
  'appel',
  'rappel',
  'épel',
  'attel',
  'jet',
  'rejet',
  'renouvel',
  'étincel',
  'niv'
])

interface IrregularVerb {
  present: string[]
  futureStem: string
  subjPresent: string[]
  passeSimple: string[]
  imperative?: string[]
  participlePresent?: string
  participlePasse: string
  auxiliary?: string
  imparfait?: string[]
  impersonal?: boolean
}

/** Common irregular verbs. Imparfait derives from the nous form unless
 *  curated (être, impersonals). */
const IRREGULAR_VERBS: Record<string, IrregularVerb> = {
  être: {
    present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    futureStem: 'ser',
    subjPresent: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'],
    passeSimple: ['fus', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'],
    imperative: ['sois', 'soyons', 'soyez'],
    participlePresent: 'étant',
    participlePasse: 'été',
    auxiliary: 'être',
    imparfait: ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient']
  },
  avoir: {
    present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    futureStem: 'aur',
    subjPresent: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'],
    passeSimple: ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent'],
    imperative: ['aie', 'ayons', 'ayez'],
    participlePresent: 'ayant',
    participlePasse: 'eu'
  },
  aller: {
    present: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
    futureStem: 'ir',
    subjPresent: ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent'],
    passeSimple: ['allai', 'allas', 'alla', 'allâmes', 'allâtes', 'allèrent'],
    imperative: ['va', 'allons', 'allez'],
    participlePresent: 'allant',
    participlePasse: 'allé',
    auxiliary: 'être'
  },
  faire: {
    present: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
    futureStem: 'fer',
    subjPresent: ['fasse', 'fasses', 'fasse', 'fassions', 'fassiez', 'fassent'],
    passeSimple: ['fis', 'fis', 'fit', 'fîmes', 'fîtes', 'firent'],
    imperative: ['fais', 'faisons', 'faites'],
    participlePresent: 'faisant',
    participlePasse: 'fait'
  },
  dire: {
    present: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
    futureStem: 'dir',
    subjPresent: ['dise', 'dises', 'dise', 'disions', 'disiez', 'disent'],
    passeSimple: ['dis', 'dis', 'dit', 'dîmes', 'dîtes', 'dirent'],
    imperative: ['dis', 'disons', 'dites'],
    participlePresent: 'disant',
    participlePasse: 'dit'
  },
  voir: {
    present: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'],
    futureStem: 'verr',
    subjPresent: ['voie', 'voies', 'voie', 'voyions', 'voyiez', 'voient'],
    passeSimple: ['vis', 'vis', 'vit', 'vîmes', 'vîtes', 'virent'],
    imperative: ['vois', 'voyons', 'voyez'],
    participlePresent: 'voyant',
    participlePasse: 'vu'
  },
  venir: {
    present: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'],
    futureStem: 'viendr',
    subjPresent: ['vienne', 'viennes', 'vienne', 'venions', 'veniez', 'viennent'],
    passeSimple: ['vins', 'vins', 'vint', 'vînmes', 'vîntes', 'vinrent'],
    imperative: ['viens', 'venons', 'venez'],
    participlePresent: 'venant',
    participlePasse: 'venu',
    auxiliary: 'être'
  },
  pouvoir: {
    present: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'],
    futureStem: 'pourr',
    subjPresent: ['puisse', 'puisses', 'puisse', 'puissions', 'puissiez', 'puissent'],
    passeSimple: ['pus', 'pus', 'put', 'pûmes', 'pûtes', 'purent'],
    participlePresent: 'pouvant',
    participlePasse: 'pu'
  },
  vouloir: {
    present: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'],
    futureStem: 'voudr',
    subjPresent: ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent'],
    passeSimple: ['voulus', 'voulus', 'voulut', 'voulûmes', 'voulûtes', 'voulurent'],
    imperative: ['veuille', 'veuillons', 'veuillez'],
    participlePresent: 'voulant',
    participlePasse: 'voulu'
  },
  devoir: {
    present: ['dois', 'dois', 'doit', 'devons', 'devez', 'doivent'],
    futureStem: 'devr',
    subjPresent: ['doive', 'doives', 'doive', 'devions', 'deviez', 'doivent'],
    passeSimple: ['dus', 'dus', 'dut', 'dûmes', 'dûtes', 'durent'],
    participlePresent: 'devant',
    participlePasse: 'dû'
  },
  savoir: {
    present: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'],
    futureStem: 'saur',
    subjPresent: ['sache', 'saches', 'sache', 'sachions', 'sachiez', 'sachent'],
    passeSimple: ['sus', 'sus', 'sut', 'sûmes', 'sûtes', 'surent'],
    imperative: ['sache', 'sachons', 'sachez'],
    participlePresent: 'sachant',
    participlePasse: 'su'
  },
  prendre: {
    present: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
    futureStem: 'prendr',
    subjPresent: ['prenne', 'prennes', 'prenne', 'prenions', 'preniez', 'prennent'],
    passeSimple: ['pris', 'pris', 'prit', 'prîmes', 'prîtes', 'prirent'],
    imperative: ['prends', 'prenons', 'prenez'],
    participlePresent: 'prenant',
    participlePasse: 'pris'
  },
  mettre: {
    present: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'],
    futureStem: 'mettr',
    subjPresent: ['mette', 'mettes', 'mette', 'mettions', 'mettiez', 'mettent'],
    passeSimple: ['mis', 'mis', 'mit', 'mîmes', 'mîtes', 'mirent'],
    imperative: ['mets', 'mettons', 'mettez'],
    participlePresent: 'mettant',
    participlePasse: 'mis'
  },
  boire: {
    present: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'],
    futureStem: 'boir',
    subjPresent: ['boive', 'boives', 'boive', 'buvions', 'buviez', 'boivent'],
    passeSimple: ['bus', 'bus', 'but', 'bûmes', 'bûtes', 'burent'],
    imperative: ['bois', 'buvons', 'buvez'],
    participlePresent: 'buvant',
    participlePasse: 'bu'
  },
  croire: {
    present: ['crois', 'crois', 'croit', 'croyons', 'croyez', 'croient'],
    futureStem: 'croir',
    subjPresent: ['croie', 'croies', 'croie', 'croyions', 'croyiez', 'croient'],
    passeSimple: ['crus', 'crus', 'crut', 'crûmes', 'crûtes', 'crurent'],
    imperative: ['crois', 'croyons', 'croyez'],
    participlePresent: 'croyant',
    participlePasse: 'cru'
  },
  partir: {
    present: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'],
    futureStem: 'partir',
    subjPresent: ['parte', 'partes', 'parte', 'partions', 'partiez', 'partent'],
    passeSimple: ['partis', 'partis', 'partit', 'partîmes', 'partîtes', 'partirent'],
    imperative: ['pars', 'partons', 'partez'],
    participlePresent: 'partant',
    participlePasse: 'parti',
    auxiliary: 'être'
  },
  sortir: {
    present: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'],
    futureStem: 'sortir',
    subjPresent: ['sorte', 'sortes', 'sorte', 'sortions', 'sortiez', 'sortent'],
    passeSimple: ['sortis', 'sortis', 'sortit', 'sortîmes', 'sortîtes', 'sortirent'],
    imperative: ['sors', 'sortons', 'sortez'],
    participlePresent: 'sortant',
    participlePasse: 'sorti',
    auxiliary: 'être'
  },
  dormir: {
    present: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'],
    futureStem: 'dormir',
    subjPresent: ['dorme', 'dormes', 'dorme', 'dormions', 'dormiez', 'dorment'],
    passeSimple: ['dormis', 'dormis', 'dormit', 'dormîmes', 'dormîtes', 'dormirent'],
    imperative: ['dors', 'dormons', 'dormez'],
    participlePresent: 'dormant',
    participlePasse: 'dormi'
  },
  servir: {
    present: ['sers', 'sers', 'sert', 'servons', 'servez', 'servent'],
    futureStem: 'servir',
    subjPresent: ['serve', 'serves', 'serve', 'servions', 'serviez', 'servent'],
    passeSimple: ['servis', 'servis', 'servit', 'servîmes', 'servîtes', 'servirent'],
    imperative: ['sers', 'servons', 'servez'],
    participlePresent: 'servant',
    participlePasse: 'servi'
  },
  suivre: {
    present: ['suis', 'suis', 'suit', 'suivons', 'suivez', 'suivent'],
    futureStem: 'suivr',
    subjPresent: ['suive', 'suives', 'suive', 'suivions', 'suiviez', 'suivent'],
    passeSimple: ['suivis', 'suivis', 'suivit', 'suivîmes', 'suivîtes', 'suivirent'],
    imperative: ['suis', 'suivons', 'suivez'],
    participlePresent: 'suivant',
    participlePasse: 'suivi'
  },
  vivre: {
    present: ['vis', 'vis', 'vit', 'vivons', 'vivez', 'vivent'],
    futureStem: 'vivr',
    subjPresent: ['vive', 'vives', 'vive', 'vivions', 'viviez', 'vivent'],
    passeSimple: ['vécus', 'vécus', 'vécut', 'vécûmes', 'vécûtes', 'vécurent'],
    imperative: ['vis', 'vivons', 'vivez'],
    participlePresent: 'vivant',
    participlePasse: 'vécu'
  },
  écrire: {
    present: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'],
    futureStem: 'écrir',
    subjPresent: ['écrive', 'écrives', 'écrive', 'écrivions', 'écriviez', 'écrivent'],
    passeSimple: ['écrivis', 'écrivis', 'écrivit', 'écrivîmes', 'écrivîtes', 'écrivirent'],
    imperative: ['écris', 'écrivons', 'écrivez'],
    participlePresent: 'écrivant',
    participlePasse: 'écrit'
  },
  lire: {
    present: ['lis', 'lis', 'lit', 'lisons', 'lisez', 'lisent'],
    futureStem: 'lir',
    subjPresent: ['lise', 'lises', 'lise', 'lisions', 'lisiez', 'lisent'],
    passeSimple: ['lus', 'lus', 'lut', 'lûmes', 'lûtes', 'lurent'],
    imperative: ['lis', 'lisons', 'lisez'],
    participlePresent: 'lisant',
    participlePasse: 'lu'
  },
  conduire: {
    present: ['conduis', 'conduis', 'conduit', 'conduisons', 'conduisez', 'conduisent'],
    futureStem: 'conduir',
    subjPresent: [
      'conduise',
      'conduises',
      'conduise',
      'conduisions',
      'conduisiez',
      'conduisent'
    ],
    passeSimple: [
      'conduisis',
      'conduisis',
      'conduisit',
      'conduisîmes',
      'conduisîtes',
      'conduisirent'
    ],
    imperative: ['conduis', 'conduisons', 'conduisez'],
    participlePresent: 'conduisant',
    participlePasse: 'conduit'
  },
  connaître: {
    present: ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent'],
    futureStem: 'connaîtr',
    subjPresent: [
      'connaisse',
      'connaisses',
      'connaisse',
      'connaissions',
      'connaissiez',
      'connaissent'
    ],
    passeSimple: ['connus', 'connus', 'connut', 'connûmes', 'connûtes', 'connurent'],
    imperative: ['connais', 'connaissons', 'connaissez'],
    participlePresent: 'connaissant',
    participlePasse: 'connu'
  },
  naître: {
    present: ['nais', 'nais', 'naît', 'naissons', 'naissez', 'naissent'],
    futureStem: 'naîtr',
    subjPresent: ['naisse', 'naisses', 'naisse', 'naissions', 'naissiez', 'naissent'],
    passeSimple: ['naquis', 'naquis', 'naquit', 'naquîmes', 'naquîtes', 'naquirent'],
    imperative: ['nais', 'naissons', 'naissez'],
    participlePresent: 'naissant',
    participlePasse: 'né',
    auxiliary: 'être'
  },
  recevoir: {
    present: ['reçois', 'reçois', 'reçoit', 'recevons', 'recevez', 'reçoivent'],
    futureStem: 'recevr',
    subjPresent: ['reçoive', 'reçoives', 'reçoive', 'recevions', 'receviez', 'reçoivent'],
    passeSimple: ['reçus', 'reçus', 'reçut', 'reçûmes', 'reçûtes', 'reçurent'],
    imperative: ['reçois', 'recevons', 'recevez'],
    participlePresent: 'recevant',
    participlePasse: 'reçu'
  },
  ouvrir: {
    present: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'],
    futureStem: 'ouvrir',
    subjPresent: ['ouvre', 'ouvres', 'ouvre', 'ouvrions', 'ouvriez', 'ouvrent'],
    passeSimple: ['ouvris', 'ouvris', 'ouvrit', 'ouvrîmes', 'ouvrîtes', 'ouvrirent'],
    imperative: ['ouvre', 'ouvrons', 'ouvrez'],
    participlePresent: 'ouvrant',
    participlePasse: 'ouvert'
  },
  offrir: {
    present: ['offre', 'offres', 'offre', 'offrons', 'offrez', 'offrent'],
    futureStem: 'offrir',
    subjPresent: ['offre', 'offres', 'offre', 'offrions', 'offriez', 'offrent'],
    passeSimple: ['offris', 'offris', 'offrit', 'offrîmes', 'offrîtes', 'offrirent'],
    imperative: ['offre', 'offrons', 'offrez'],
    participlePresent: 'offrant',
    participlePasse: 'offert'
  },
  courir: {
    present: ['cours', 'cours', 'court', 'courons', 'courez', 'courent'],
    futureStem: 'courr',
    subjPresent: ['coure', 'coures', 'coure', 'courions', 'couriez', 'courent'],
    passeSimple: ['courus', 'courus', 'courut', 'courûmes', 'courûtes', 'coururent'],
    imperative: ['cours', 'courons', 'courez'],
    participlePresent: 'courant',
    participlePasse: 'couru'
  },
  mourir: {
    present: ['meurs', 'meurs', 'meurt', 'mourons', 'mourez', 'meurent'],
    futureStem: 'mourr',
    subjPresent: ['meure', 'meures', 'meure', 'mourions', 'mouriez', 'meurent'],
    passeSimple: ['mourus', 'mourus', 'mourut', 'mourûmes', 'mourûtes', 'moururent'],
    imperative: ['meurs', 'mourons', 'mourez'],
    participlePresent: 'mourant',
    participlePasse: 'mort',
    auxiliary: 'être'
  },
  rire: {
    present: ['ris', 'ris', 'rit', 'rions', 'riez', 'rient'],
    futureStem: 'rir',
    subjPresent: ['rie', 'ries', 'rie', 'riions', 'riiez', 'rient'],
    passeSimple: ['ris', 'ris', 'rit', 'rîmes', 'rîtes', 'rirent'],
    imperative: ['ris', 'rions', 'riez'],
    participlePresent: 'riant',
    participlePasse: 'ri'
  },
  craindre: {
    present: ['crains', 'crains', 'craint', 'craignons', 'craignez', 'craignent'],
    futureStem: 'craindr',
    subjPresent: ['craigne', 'craignes', 'craigne', 'craignions', 'craigniez', 'craignent'],
    passeSimple: [
      'craignis',
      'craignis',
      'craignit',
      'craignîmes',
      'craignîtes',
      'craignirent'
    ],
    imperative: ['crains', 'craignons', 'craignez'],
    participlePresent: 'craignant',
    participlePasse: 'craint'
  },
  peindre: {
    present: ['peins', 'peins', 'peint', 'peignons', 'peignez', 'peignent'],
    futureStem: 'peindr',
    subjPresent: ['peigne', 'peignes', 'peigne', 'peignions', 'peigniez', 'peignent'],
    passeSimple: ['peignis', 'peignis', 'peignit', 'peignîmes', 'peignîtes', 'peignirent'],
    imperative: ['peins', 'peignons', 'peignez'],
    participlePresent: 'peignant',
    participlePasse: 'peint'
  },
  tenir: {
    present: ['tiens', 'tiens', 'tient', 'tenons', 'tenez', 'tiennent'],
    futureStem: 'tiendr',
    subjPresent: ['tienne', 'tiennes', 'tienne', 'tenions', 'teniez', 'tiennent'],
    passeSimple: ['tins', 'tins', 'tint', 'tînmes', 'tîntes', 'tinrent'],
    imperative: ['tiens', 'tenons', 'tenez'],
    participlePresent: 'tenant',
    participlePasse: 'tenu'
  },
  plaire: {
    present: ['plais', 'plais', 'plaît', 'plaisons', 'plaisez', 'plaisent'],
    futureStem: 'plair',
    subjPresent: ['plaise', 'plaises', 'plaise', 'plaisions', 'plaisiez', 'plaisent'],
    passeSimple: ['plus', 'plus', 'plut', 'plûmes', 'plûtes', 'plurent'],
    participlePresent: 'plaisant',
    participlePasse: 'plu'
  },
  valoir: {
    present: ['vaux', 'vaux', 'vaut', 'valons', 'valez', 'valent'],
    futureStem: 'vaudr',
    subjPresent: ['vaille', 'vailles', 'vaille', 'valions', 'valiez', 'vaillent'],
    passeSimple: ['valus', 'valus', 'valut', 'valûmes', 'valûtes', 'valurent'],
    participlePresent: 'valant',
    participlePasse: 'valu'
  },
  falloir: {
    present: ['faut', 'faut', 'faut', 'faut', 'faut', 'faut'],
    futureStem: 'faudr',
    subjPresent: ['faille', 'faille', 'faille', 'faille', 'faille', 'faille'],
    passeSimple: ['fallut', 'fallut', 'fallut', 'fallut', 'fallut', 'fallut'],
    participlePasse: 'fallu',
    imparfait: ['fallait', 'fallait', 'fallait', 'fallait', 'fallait', 'fallait'],
    impersonal: true
  }
}

/** -al nouns/adjectives that take -s in the plural (not -aux). */
const AL_EXCEPTIONS: Set<string> = new Set([
  'bal',
  'carnaval',
  'chacal',
  'festival',
  'récital',
  'régal',
  'aval',
  'cal',
  'serval'
])

/** The seven -ou nouns that take -x. */
const OU_X: Set<string> = new Set([
  'bijou',
  'caillou',
  'chou',
  'genou',
  'hibou',
  'joujou',
  'pou'
])

/** -ail nouns taking -aux. */
const AIL_AUX: Set<string> = new Set([
  'travail',
  'vitrail',
  'corail',
  'bail',
  'émail',
  'soupirail',
  'vantail',
  'ventail'
])

/** -s adjectives doubling the s (gros, bas, ...); others take a plain -e. */
const S_SSE: Set<string> = new Set([
  'gros',
  'bas',
  'gras',
  'las',
  'épais',
  'exprès',
  'métis',
  'matis'
])

/** -et adjectives taking -ète (complet, discret); others double the t. */
const ET_ETE: Set<string> = new Set([
  'complet',
  'discret',
  'concret',
  'inquiet',
  'replet',
  'secret'
])

/** -eur adjectives taking a plain -e (meilleur, supérieur, ...). */
const EUR_E: Set<string> = new Set([
  'meilleur',
  'supérieur',
  'inférieur',
  'antérieur',
  'extérieur',
  'intérieur',
  'majeur',
  'mineur',
  'postérieur',
  'ultérieur',
  'prieur'
])

/** Curated feminine forms (beau, vieux, gros, sec, ...). */
const FEMININE_IRREGULAR: Record<string, string> = {
  beau: 'belle',
  nouveau: 'nouvelle',
  jumeau: 'jumelle',
  vieux: 'vieille',
  fou: 'folle',
  mou: 'molle',
  frais: 'fraîche',
  sec: 'sèche',
  doux: 'douce',
  faux: 'fausse',
  roux: 'rousse',
  long: 'longue',
  favori: 'favorite',
  grec: 'grecque',
  public: 'publique',
  turc: 'turque',
  gentil: 'gentille',
  sot: 'sotte',
  idiot: 'idiote',
  fier: 'fière',
  cher: 'chère',
  amer: 'amère'
}
