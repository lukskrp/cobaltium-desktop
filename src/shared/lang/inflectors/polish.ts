import type {
  InflectionEngine,
  InflectionParadigm,
  ParadigmKind,
  ParadigmRow,
  ParadigmTable
} from '../inflection'

/**
 * Bundled Polish (pl) inflector: deterministic, offline LangDex paradigms.
 *
 * Verbs:
 * - Conjugation classes by infinitive ending: -ować/-ywać/-iwać (pracuję),
 *   -awać (daję), -ać (am/asz default: czytam; the -ę/-esz set: piszę),
 *   -ić/-yć/-eć (robię/chodzę/proszę with 1sg+3pl consonant mutation),
 *   -nąć (ciągnę), plus curated irregulars (być, mieć, iść, jeść, móc,
 *   chcieć, wiedzieć, umieć, rozumieć, wziąć, dać, brać, jechać, ...).
 * - Tenses: present (6 persons), past (gender-marked on/ona/ono/oni/one),
 *   future (analytic będę + infinitive for imperfective; perfective verbs use
 *   the present forms), imperative (ty/wy), and non-finite forms
 *   (infinitive, active participle -ący, adverbial gerund -ąc, passive
 *   participle -any/-ony/-ny/-ty).
 * - 1sg/3pl consonant mutation: s→sz (prosić→proszę), z→ż (wozić→wożę),
 *   st→szcz (puścić→puszczę), śc→szcz (czyścić→czyszczę), źdź→żdż
 *   (jeździć→jeżdżę).
 *
 * Nouns: seven-case declension (Mianownik, Dopełniacz, Celownik, Biernik,
 * Narzędnik, Miejscownik, Wołacz) x singular/plural across the standard
 * patterns: feminine -a (hard/soft/-ia/-ja), feminine consonant stems
 * (-ość/-ść, noc, twarz, myśl), masculine hard/soft, masculine -a
 * (mężczyzna), neuter -o/-e/-ę/-um. Curated sets cover mobile-vowel
 * genitive plurals (sióstr, rąk, książek), -u genitives (domu, stołu),
 * virile plurals (panowie, studenci) and suppletive plurals (człowiek→ludzie,
 * rok→lata). The accusative is given for inanimate nouns; the note points out
 * that animate masculine nouns take the genitive.
 *
 * Adjectives: hard (-y / -i after k/g: nowy, drogi) and soft (-i: tani)
 * declension by case x (Masculine, Feminine, Neuter, Plural m-osobowy,
 * Plural nieosobowy), with the virile plural mutation (wysoki→wysocy,
 * drogi→drodzy, dobry→dobrzy, młody→młodzi).
 *
 * Unhandled words return null so the caller falls back to the LLM tier.
 */
export const PolishInflector: InflectionEngine = {
  engine: 'pl-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'pl') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const kind = classify(pos)
    if (kind === 'conjugation') return conjugate(word)
    if (kind === 'declension') return decline(word, pos)

    if (pos == null || pos.trim() === '') {
      if (looksLikeVerb(word)) return conjugate(word) ?? decline(word, null)
      return decline(word, null)
    }
    return {
      lemma,
      lang: 'pl',
      kind: null,
      note: 'Przysłówki i wyrażenia nieodmienne nie zmieniają się w języku polskim.',
      tables: []
    }
  }
}

function classify(pos: string | null): ParadigmKind | null {
  switch (pos?.toLowerCase()) {
    case 'verb':
      return 'conjugation'
    case 'noun':
    case 'adjective':
    case 'numeral':
      return 'declension'
    case 'adverb':
    case 'preposition':
    case 'conjunction':
    case 'interjection':
    case 'particle':
      return null
    // Pronouns/determiners decline in Polish but the rule engine cannot
    // guess them safely (ja, ten, mój...) — [decline] returns null for the
    // curated exclusion set, sending those to the LLM tier.
    case 'pronoun':
    case 'determiner':
      return 'declension'
    default:
      return null
  }
}

function looksLikeVerb(word: string): boolean {
  return word.endsWith('ć') || word.endsWith('c')
}

function removeSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value.slice(0, value.length - suffix.length) : value
}

function dropLast(value: string, count: number): string {
  return value.slice(0, value.length - count)
}

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(word: string): InflectionParadigm | null {
  const irregular = IRREGULAR_VERBS.get(word)
  if (irregular) return irregularVerbParadigm(word, irregular)
  if (word.endsWith('ować') || word.endsWith('ywać') || word.endsWith('iwać')) return owacVerb(word)
  if (word.endsWith('awać')) return awacVerb(word)
  if (ESZ_AC.has(word)) return eszAcVerb(word)
  if (word.endsWith('ić') || word.endsWith('yć') || word.endsWith('eć')) return icVerb(word)
  if (word.endsWith('ąć')) return nacVerb(word)
  if (word.endsWith('ać')) return amVerb(word)
  return null
}

/** -ować/-ywać/-iwać verbs (pracuję, kupuję, wykonuję). */
function owacVerb(inf: string): InflectionParadigm {
  const presStem = removeSuffix(removeSuffix(removeSuffix(inf, 'ować'), 'ywać'), 'iwać') + 'uj'
  const present = PRES_ESZ.map((e) => presStem + e)
  const past = pastTense(inf)
  const imperative = [presStem, presStem + 'cie']
  return regularVerbTables(
    inf,
    present,
    past,
    imperative,
    participle(present),
    gerund(present),
    passiveParticiple(inf)
  )
}

/** -awać verbs (daję, staję). */
function awacVerb(inf: string): InflectionParadigm {
  const presStem = removeSuffix(inf, 'awać') + 'aj'
  const present = PRES_ESZ.map((e) => presStem + e)
  const past = pastTense(inf)
  const imperative = [presStem, presStem + 'cie']
  return regularVerbTables(
    inf,
    present,
    past,
    imperative,
    participle(present),
    gerund(present),
    passiveParticiple(inf)
  )
}

/** -ać verbs of the -am/-asz class (czytam, kocham, szukam). */
function amVerb(inf: string): InflectionParadigm {
  const stem = removeSuffix(inf, 'ać')
  const present = [
    stem + 'am',
    stem + 'asz',
    stem + 'a',
    stem + 'amy',
    stem + 'acie',
    stem + 'ają'
  ]
  const past = pastTense(inf)
  const imperative = [stem + 'aj', stem + 'ajcie']
  return regularVerbTables(
    inf,
    present,
    past,
    imperative,
    participle(present),
    gerund(present),
    passiveParticiple(inf)
  )
}

/** -ać verbs of the -ę/-esz class (piszę, każę, płaczę). */
function eszAcVerb(inf: string): InflectionParadigm {
  const presStem = ESZ_AC.get(inf)!
  const present = PRES_ESZ.map((e) => presStem + e)
  const past = pastTense(inf)
  const imperative = [presStem, presStem + 'cie']
  return regularVerbTables(
    inf,
    present,
    past,
    imperative,
    participle(present),
    gerund(present),
    passiveParticiple(inf)
  )
}

/** -ić/-yć/-eć verbs (robię, chodzę, proszę, myślę). */
function icVerb(inf: string): InflectionParadigm {
  const cons = dropLast(inf, 2)
  const stem13 = icStem13(inf, cons)
  const [e2, e3, p1, p2] = icEndings(cons)
  const present = [stem13 + 'ę', cons + e2, cons + e3, cons + p1, cons + p2, stem13 + 'ą']
  const past = pastTense(inf)
  const imperative = icImperative(inf, cons)
  return regularVerbTables(
    inf,
    present,
    past,
    imperative,
    participle(present),
    gerund(present),
    passiveParticiple(inf)
  )
}

/** -ąć verbs (ciągnę, pchnę, stanę). */
function nacVerb(inf: string): InflectionParadigm {
  const presStem = removeSuffix(inf, 'nąć') + 'n'
  const present = [
    presStem + 'ę',
    presStem + 'iesz',
    presStem + 'ie',
    presStem + 'iemy',
    presStem + 'iecie',
    presStem + 'ą'
  ]
  const past = pastTense(inf)
  const imperative = nacImperative(presStem)
  return regularVerbTables(
    inf,
    present,
    past,
    imperative,
    participle(present),
    gerund(present),
    passiveParticiple(inf)
  )
}

/**
 * 1sg/3pl stem for -ić/-yć/-eć verbs. Hard final consonants (b, r, m, j, ...)
 * keep the thematic vowel (robię, lubię, mówię); palatalizing ones lose it
 * (prosić→proszę, płacić→płacę, czyścić→czyszczę, jeździć→jeżdżę).
 */
function icStem13(inf: string, cons: string): string {
  if (cons.endsWith('śc')) return dropLast(cons, 2) + 'szcz' // czyścić → czyszcz-
  if (cons.endsWith('źdź')) return dropLast(cons, 2) + 'żdż' // jeździć → jeżdż-
  if (
    cons.endsWith('cz') ||
    cons.endsWith('sz') ||
    cons.endsWith('rz') ||
    cons.endsWith('dz') ||
    cons.endsWith('dź') ||
    cons.endsWith('ż') ||
    cons.endsWith('ś') ||
    cons.endsWith('ć') ||
    cons.endsWith('ń') ||
    cons.endsWith('ź') ||
    cons.endsWith('j') ||
    cons.endsWith('l') ||
    cons.endsWith('c')
  ) {
    return cons
  }
  if (cons.endsWith('s')) return dropLast(cons, 1) + 'sz'
  if (cons.endsWith('z')) return dropLast(cons, 1) + 'ż'
  return dropLast(inf, 1) // robi-, lubi-, mówi-
}

/** 2sg/3sg/1pl/2pl endings; -y after the orthographically hard sibilants. */
function icEndings(stem: string): [string, string, string, string] {
  if (stem.endsWith('cz') || stem.endsWith('sz') || stem.endsWith('rz') || stem.endsWith('ż')) {
    return ['ysz', 'y', 'ymy', 'ycie']
  }
  return ['isz', 'i', 'imy', 'icie']
}

function icImperative(inf: string, stem: string): string[] {
  const irregular = IMPERATIVE_IRREGULAR.get(inf)
  if (irregular) return irregular
  let t: string
  if (stem.endsWith('cz') || stem.endsWith('sz') || stem.endsWith('rz') || stem.endsWith('ż')) {
    t = stem
  } else if (stem.endsWith('dz')) {
    t = dropLast(stem, 2) + 'dź'
  } else if (stem.endsWith('c')) {
    t = dropLast(stem, 1) + 'ć'
  } else if (stem.endsWith('s')) {
    t = dropLast(stem, 1) + 'ś'
  } else if (stem.endsWith('z')) {
    t = dropLast(stem, 1) + 'ź'
  } else if (stem.endsWith('t')) {
    t = dropLast(stem, 1) + 'ć'
  } else if (stem.endsWith('d')) {
    t = dropLast(stem, 1) + 'dź'
  } else if (stem.endsWith('n')) {
    t = dropLast(stem, 1) + 'ń'
  } else {
    t = stem
  }
  return [t, t + 'cie']
}

function nacImperative(presStem: string): string[] {
  let t: string
  if (presStem.endsWith('j')) {
    t = presStem
  } else if (
    presStem.length >= 2 &&
    CONSONANTS.includes(presStem[presStem.length - 1]) &&
    CONSONANTS.includes(presStem[presStem.length - 2])
  ) {
    t = presStem + 'ij'
  } else {
    t = dropLast(presStem, 1) + 'ń'
  }
  return [t, t + 'cie']
}

/** Past: on/ona/ono/oni/one. */
function pastTense(word: string): string[] {
  const irregular = PAST_IRREGULAR.get(word)
  if (irregular) return irregular
  if (word.endsWith('ąć')) {
    const stem = removeSuffix(word, 'ąć')
    return [stem + 'ął', stem + 'ęła', stem + 'ęło', stem + 'ęli', stem + 'ęły']
  }
  let base: string
  if (word.endsWith('ić') || word.endsWith('yć')) {
    base = removeSuffix(removeSuffix(word, 'ić'), 'yć') + 'i'
  } else {
    base = removeSuffix(removeSuffix(word, 'ać'), 'eć') + 'a'
  }
  return [base + 'ł', base + 'ła', base + 'ło', base + 'li', base + 'ły']
}

function participle(present: string[]): string {
  return present[5] + 'cy'
}

function gerund(present: string[]): string {
  return present[5] + 'c'
}

function passiveParticiple(word: string): string | null {
  const irregular = PASSIVE_IRREGULAR.get(word)
  if (irregular !== undefined) return irregular
  if (word.endsWith('ować') || word.endsWith('ywać') || word.endsWith('iwać')) {
    return removeSuffix(removeSuffix(removeSuffix(word, 'ować'), 'ywać'), 'iwać') + 'owany'
  }
  if (word.endsWith('ić') || word.endsWith('yć')) return icStem13(word, dropLast(word, 2)) + 'ony'
  if (word.endsWith('eć')) return removeSuffix(word, 'eć') + 'any'
  if (word.endsWith('ąć')) return removeSuffix(word, 'ąć') + 'nięty'
  if (word.endsWith('ać')) return removeSuffix(word, 'ać') + 'any'
  return null
}

function regularVerbTables(
  inf: string,
  present: string[],
  past: string[],
  imperative: string[],
  participle: string | null,
  gerund: string | null,
  passive: string | null
): InflectionParadigm {
  return verbParadigm({
    inf,
    present,
    past,
    imperative,
    participle,
    gerund,
    passive
  })
}

function irregularVerbParadigm(inf: string, v: IrregularVerb): InflectionParadigm {
  return verbParadigm({
    inf,
    present: v.present,
    past: v.past,
    imperative: v.imperative ?? [],
    participle: v.participle ?? null,
    gerund: v.gerund ?? null,
    passive: v.passive ?? null,
    presentIsFuture: v.presentIsFuture ?? false,
    future: v.future ?? null
  })
}

function verbParadigm(args: {
  inf: string
  present: string[]
  past: string[]
  imperative: string[]
  participle: string | null
  gerund: string | null
  passive: string | null
  presentIsFuture?: boolean
  future?: string[] | null
}): InflectionParadigm {
  const { inf, present, past, imperative, participle, gerund, passive } = args
  const presentIsFuture = args.presentIsFuture ?? false
  const future = args.future ?? null

  const tables: ParadigmTable[] = []
  tables.push({
    title: presentIsFuture ? 'Czas przyszły (teraźniejszo-przyszły)' : 'Czas teraźniejszy',
    columns: ['Forma'],
    rows: PRESENT_LABELS.map((label, i) => ({ label, cells: [present[i]] }))
  })
  tables.push({
    title: 'Czas przeszły',
    columns: ['Forma'],
    rows: PAST_LABELS.map((label, i) => ({ label, cells: [past[i]] }))
  })
  if (!presentIsFuture) {
    tables.push({
      title: 'Czas przyszły',
      columns: ['Forma'],
      rows: PRESENT_LABELS.map((label, i) => ({
        label,
        cells: [future?.[i] ?? `${FUTURE_AUX[i]} ${inf}`]
      }))
    })
  }
  if (imperative.length > 0) {
    tables.push({
      title: 'Tryb rozkazujący',
      columns: ['Forma'],
      rows: IMPERATIVE_LABELS.map((label, i) => ({ label, cells: [imperative[i]] }))
    })
  }
  const nonFiniteRows: ParadigmRow[] = []
  nonFiniteRows.push({ label: 'Bezokolicznik', cells: [inf] })
  if (participle !== null) {
    nonFiniteRows.push({ label: 'Imiesłów przymiotnikowy czynny', cells: [participle] })
  }
  if (gerund !== null) {
    nonFiniteRows.push({ label: 'Imiesłów przysłówkowy współczesny', cells: [gerund] })
  }
  if (passive !== null) {
    nonFiniteRows.push({ label: 'Imiesłów bierny', cells: [passive] })
  }
  tables.push({ title: 'Formy nieosobowe', columns: ['Forma'], rows: nonFiniteRows })
  return {
    lemma: inf,
    lang: 'pl',
    kind: 'conjugation',
    note:
      'Czasowniki dokonane tworzą czas przyszły formami czasu teraźniejszego ' +
      '(np. przeczytam); czasowniki niedokonane — formą złożoną będę + bezokolicznik.',
    tables
  }
}

// ── Nouns & adjectives ──────────────────────────────────────────────────

function decline(word: string, pos: string | null): InflectionParadigm | null {
  if (NOUN_RULE_EXCLUDED.has(word)) return null
  if (pos?.toLowerCase() === 'adjective') return adjectiveParadigm(word)
  const irregular = IRREGULAR_NOUNS.get(word)
  if (irregular) return nounParadigm(word, irregular)
  const stem = dropLast(word, 1)
  if (stem === '') return null
  switch (nounGender(word)) {
    case 'FEMININE_A':
      return nounParadigm(word, feminineA(word))
    case 'FEMININE_CONS':
      return nounParadigm(word, feminineCons(word))
    case 'MASCULINE':
      return nounParadigm(word, masculine(word))
    case 'MASCULINE_A':
      return nounParadigm(word, masculineA(word), true)
    case 'NEUTER_O':
      return nounParadigm(word, neuterO(word))
    case 'NEUTER_E':
      return nounParadigm(word, neuterE(word))
    case 'NEUTER_UM':
      return nounParadigm(word, neuterUm(word))
    case 'NEUTER_ETA':
      return nounParadigm(word, neuterEta(word))
  }
}

function nounParadigm(word: string, forms: string[], virile = false): InflectionParadigm {
  const rows = CASES.map((label, i) => ({ label, cells: [forms[i], forms[i + 7]] }))
  return {
    lemma: word,
    lang: 'pl',
    kind: 'declension',
    note: virile
      ? 'Rzeczownik rodzaju męskoosobowego: liczba mnoga ma końcówki osobowe ' +
        '(-owie, -i, -y). Biernik podano dla rzeczowników żywotnych (równy dopełniaczowi).'
      : 'Biernik podano dla rzeczowników nieżywotnych (u żywotnych rodzaju męskiego ' +
        'jest równy dopełniaczowi). Rzeczowniki męskoosobowe mają w liczbie mnogiej ' +
        'końcówki osobowe (-owie, -i, -y).',
    tables: [{ title: 'Odmiana', columns: ['Singular', 'Plural'], rows }]
  }
}

function nounGender(word: string): Gender {
  if (MASC_A.has(word)) return 'MASCULINE_A'
  if (word.endsWith('um')) return 'NEUTER_UM'
  if (word.endsWith('ę')) return 'NEUTER_ETA'
  if (word.endsWith('o')) return 'NEUTER_O'
  if (word.endsWith('e')) return 'NEUTER_E'
  if (word.endsWith('a')) return 'FEMININE_A'
  if (word.endsWith('ość') || word.endsWith('ść') || FEM_CONS.has(word)) return 'FEMININE_CONS'
  return 'MASCULINE'
}

/** Feminine -a (kobieta, książka, ulica, ziemia, stacja). */
function feminineA(word: string): string[] {
  const stem = dropLast(word, 1)
  const genSg = femGenSg(word, stem)
  const datLoc = femDatLoc(word, stem)
  const accSg =
    word.endsWith('ia') && !word.endsWith('ja') && !stem.endsWith('i')
      ? stem + 'ię'
      : stem + 'ę'
  const nomPl = femNomPl(stem)
  return [
    word,
    genSg,
    datLoc,
    accSg,
    stem + 'ą',
    datLoc,
    stem + 'o',
    nomPl,
    femGenPl(word, stem),
    stem + 'om',
    nomPl,
    stem + 'ami',
    stem + 'ach',
    nomPl
  ]
}

function femGenSg(word: string, stem: string): string {
  if (word.endsWith('ia') && !word.endsWith('ja') && FEM_IA_SINGLE_I.has(word)) return stem
  if (word.endsWith('ia') && !word.endsWith('ja')) return stem + 'i'
  if (stem.endsWith('j')) return stem + 'i'
  if (stem.endsWith('k') || stem.endsWith('g')) return stem + 'i'
  if (
    stem.endsWith('c') ||
    stem.endsWith('cz') ||
    stem.endsWith('sz') ||
    stem.endsWith('rz') ||
    stem.endsWith('ż') ||
    stem.endsWith('dz')
  ) {
    return stem + 'y'
  }
  if (
    stem.endsWith('l') ||
    stem.endsWith('ś') ||
    stem.endsWith('ć') ||
    stem.endsWith('ń') ||
    stem.endsWith('ź')
  ) {
    return stem + 'i'
  }
  return stem + 'y'
}

function femDatLoc(word: string, stem: string): string {
  if (word.endsWith('ia') && !word.endsWith('ja') && FEM_IA_SINGLE_I.has(word)) return stem
  if (word.endsWith('ia') && !word.endsWith('ja')) return stem + 'i'
  if (stem.endsWith('k')) return dropLast(stem, 1) + 'ce'
  if (stem.endsWith('g')) return dropLast(stem, 1) + 'dze'
  if (stem.endsWith('ch') || stem.endsWith('h')) return dropLast(stem, 2) + 'sze'
  if (
    stem.endsWith('c') ||
    stem.endsWith('cz') ||
    stem.endsWith('sz') ||
    stem.endsWith('rz') ||
    stem.endsWith('ż') ||
    stem.endsWith('dz')
  ) {
    return stem + 'y'
  }
  if (stem.endsWith('j')) return stem + 'i'
  if (
    stem.endsWith('l') ||
    stem.endsWith('ś') ||
    stem.endsWith('ć') ||
    stem.endsWith('ń') ||
    stem.endsWith('ź')
  ) {
    return stem + 'i'
  }
  return palatalizeForE(stem) + 'e'
}

function femNomPl(stem: string): string {
  if (stem.endsWith('k') || stem.endsWith('g')) return stem + 'i'
  if (stem.endsWith('i')) return stem + 'e'
  if (
    stem.endsWith('j') ||
    stem.endsWith('l') ||
    stem.endsWith('ś') ||
    stem.endsWith('ć') ||
    stem.endsWith('ń') ||
    stem.endsWith('ź')
  ) {
    return stem + 'e'
  }
  if (
    stem.endsWith('c') ||
    stem.endsWith('cz') ||
    stem.endsWith('sz') ||
    stem.endsWith('rz') ||
    stem.endsWith('ż') ||
    stem.endsWith('dz')
  ) {
    return stem + 'e'
  }
  return stem + 'y'
}

function femGenPl(word: string, stem: string): string {
  const irregular = FEM_GEN_PL.get(word)
  if (irregular !== undefined) return irregular
  if (stem.endsWith('k')) return dropLast(stem, 1) + 'ek'
  if (word.endsWith('ja')) return stem + 'i'
  return stem
}

/** Feminine consonant stems (noc, miłość, twarz, myśl). */
function feminineCons(word: string): string[] {
  const caseForm = femConsCase(word)
  const nomPl = femConsNomPl(word)
  return [
    word,
    caseForm,
    caseForm,
    word,
    word + 'ą',
    caseForm,
    caseForm,
    nomPl,
    caseForm,
    word + 'om',
    nomPl,
    INST_PL.get(word) ?? word + 'ami',
    word + 'ach',
    nomPl
  ]
}

function femConsCase(word: string): string {
  if (word.endsWith('ość') || word.endsWith('ść')) return dropLast(word, 2) + 'i'
  if (
    word.endsWith('c') ||
    word.endsWith('cz') ||
    word.endsWith('sz') ||
    word.endsWith('rz') ||
    word.endsWith('ż')
  ) {
    return word + 'y'
  }
  return word + 'i'
}

function femConsNomPl(word: string): string {
  const irregular = FEM_CONS_NOM_PL.get(word)
  if (irregular !== undefined) return irregular
  if (word.endsWith('ość') || word.endsWith('ść')) return femConsCase(word)
  if (word.endsWith('cz') || word.endsWith('sz')) return word + 'y'
  if (word.endsWith('c') || word.endsWith('rz')) return word + 'e'
  if (
    word.endsWith('l') ||
    word.endsWith('ś') ||
    word.endsWith('ć') ||
    word.endsWith('ń') ||
    word.endsWith('ź')
  ) {
    return word + 'i'
  }
  return word + 'e'
}

/** Masculine hard/soft (kot, stół, dom, koń, kraj). */
function masculine(word: string): string[] {
  const genSg = MAS_GEN_U.get(word) ?? word + 'a'
  const datSg = MAS_DAT_U.get(word) ?? word + 'owi'
  const instSg = word + 'em'
  const locSg = MAS_LOC_U.get(word) ?? mascLoc(word)
  const vocSg = MAS_VOC.get(word) ?? locSg
  const nomPl = VIRILE_NOM.get(word) ?? mascNomPl(word)
  const genPl = MAS_GEN_PL.get(word) ?? word + 'ów'
  const instPl = INST_PL.get(word) ?? word + 'ami'
  return [
    word,
    genSg,
    datSg,
    word,
    instSg,
    locSg,
    vocSg,
    nomPl,
    genPl,
    word + 'om',
    nomPl,
    instPl,
    word + 'ach',
    nomPl
  ]
}

function mascLoc(word: string): string {
  if (isSoftConsonant(word)) return word + 'u'
  if (word.endsWith('k') || word.endsWith('g') || word.endsWith('ch') || word.endsWith('h')) {
    return word + 'u'
  }
  return palatalizeForE(word) + 'e'
}

function mascNomPl(word: string): string {
  if (isSoftConsonant(word)) return word + 'e'
  if (word.endsWith('k') || word.endsWith('g')) return word + 'i'
  return word + 'y'
}

/** Masculine -a (mężczyzna, poeta): feminine -a singular, virile plural. */
function masculineA(word: string): string[] {
  const stem = dropLast(word, 1)
  const genSg = femGenSg(word, stem)
  const datLoc = femDatLoc(word, stem)
  const nomPl = VIRILE_NOM.get(word) ?? stem + 'owie'
  const genPl = MAS_GEN_PL.get(word) ?? stem + 'ów'
  return [
    word,
    genSg,
    datLoc,
    stem + 'ę',
    stem + 'ą',
    datLoc,
    stem + 'o',
    nomPl,
    genPl,
    stem + 'om',
    genPl,
    stem + 'ami',
    stem + 'ach',
    nomPl
  ]
}

/** Neuter -o (okno, drzewo, biurko). */
function neuterO(word: string): string[] {
  const stem = dropLast(word, 1)
  const locSg =
    stem.endsWith('k') || stem.endsWith('g')
      ? stem + 'u'
      : (NEUTER_LOC.get(word) ?? palatalizeForE(stem) + 'e')
  const nomPl = stem + 'a'
  return [
    word,
    stem + 'a',
    stem + 'u',
    word,
    stem + 'em',
    locSg,
    word,
    nomPl,
    NEUTER_GEN_PL.get(word) ?? stem,
    stem + 'om',
    nomPl,
    stem + 'ami',
    stem + 'ach',
    nomPl
  ]
}

/** Neuter -e (morze, pole, serce). */
function neuterE(word: string): string[] {
  const stem = dropLast(word, 1)
  const nomPl = stem + 'a'
  return [
    word,
    stem + 'a',
    stem + 'u',
    word,
    stem + 'em',
    stem + 'u',
    word,
    nomPl,
    NEUTER_GEN_PL.get(word) ?? stem,
    stem + 'om',
    nomPl,
    stem + 'ami',
    stem + 'ach',
    nomPl
  ]
}

/** Neuter -um (muzeum): indeclinable singular. */
function neuterUm(word: string): string[] {
  const stem = dropLast(word, 2)
  const nomPl = stem + 'a'
  return [
    word,
    word,
    word,
    word,
    word,
    word,
    word,
    nomPl,
    stem + 'ów',
    stem + 'om',
    nomPl,
    stem + 'ami',
    stem + 'ach',
    nomPl
  ]
}

/** Neuter -ę (zwierzę, cielę); the -mię group is curated. */
function neuterEta(word: string): string[] {
  const stem = dropLast(word, 1)
  const nomPl = stem + 'ęta'
  return [
    word,
    stem + 'ęcia',
    stem + 'ęciu',
    word,
    stem + 'ęciem',
    stem + 'ęciu',
    word,
    nomPl,
    stem + 'ąt',
    stem + 'ętom',
    nomPl,
    stem + 'ętami',
    stem + 'ętach',
    nomPl
  ]
}

/** Adjective declension: hard (nowy, drogi) and soft (tani). */
function adjectiveParadigm(word: string): InflectionParadigm | null {
  let stem: string
  let hard: boolean
  if (word.endsWith('y')) {
    stem = dropLast(word, 1)
    hard = true
  } else if (word.endsWith('gi') || word.endsWith('ki') || word.endsWith('hi')) {
    stem = dropLast(word, 1)
    hard = true
  } else if (word.endsWith('i')) {
    stem = dropLast(word, 1)
    hard = false
  } else {
    return null
  }
  let forms: string[][]
  if (hard) {
    const virile = virilePl(stem)
    const nonVir = stem + 'e'
    forms = [
      [word, stem + 'a', stem + 'e', virile, nonVir],
      [stem + 'ego', stem + 'ej', stem + 'ego', stem + 'ych', stem + 'ych'],
      [stem + 'emu', stem + 'ej', stem + 'emu', stem + 'ym', stem + 'ym'],
      [word, stem + 'ą', stem + 'e', stem + 'ych', stem + 'e'],
      [stem + 'ym', stem + 'ą', stem + 'ym', stem + 'ymi', stem + 'ymi'],
      [stem + 'ym', stem + 'ej', stem + 'ym', stem + 'ych', stem + 'ych']
    ]
  } else {
    const nonVir =
      stem.endsWith('c') ||
      stem.endsWith('cz') ||
      stem.endsWith('sz') ||
      stem.endsWith('rz') ||
      stem.endsWith('ż') ||
      stem.endsWith('dz')
        ? stem + 'e'
        : stem + 'ie'
    forms = [
      [word, stem + 'ia', stem + 'ie', stem + 'i', nonVir],
      [stem + 'iego', stem + 'iej', stem + 'iego', stem + 'ich', stem + 'ich'],
      [stem + 'iemu', stem + 'iej', stem + 'iemu', stem + 'im', stem + 'im'],
      [word, stem + 'ią', stem + 'ie', stem + 'ich', stem + 'ie'],
      [stem + 'im', stem + 'ią', stem + 'im', stem + 'imi', stem + 'imi'],
      [stem + 'im', stem + 'iej', stem + 'im', stem + 'ich', stem + 'ich']
    ]
  }
  const rows = CASES.map((label, idx) => ({ label, cells: forms[idx] ?? forms[0] }))
  return {
    lemma: word,
    lang: 'pl',
    kind: 'declension',
    note:
      'Biernik podano dla rzeczowników nieżywotnych. Liczba mnoga rozróżnia ' +
      'rodzaj męskoosobowy (nowi, drodzy) od niemęskoosobowego (nowe, drogie).',
    tables: [
      {
        title: 'Odmiana przymiotnika',
        columns: ADJECTIVE_COLUMNS,
        rows
      }
    ]
  }
}

function virilePl(stem: string): string {
  if (stem.endsWith('k')) return dropLast(stem, 1) + 'cy'
  if (stem.endsWith('g')) return dropLast(stem, 1) + 'dzy'
  if (stem.endsWith('st')) return dropLast(stem, 2) + 'ści'
  if (stem.endsWith('r')) return dropLast(stem, 1) + 'rzy'
  if (stem.endsWith('d')) return dropLast(stem, 1) + 'dzi'
  if (stem.endsWith('t')) return dropLast(stem, 1) + 'ci'
  if (stem.endsWith('ł')) return dropLast(stem, 1) + 'li'
  return stem + 'i'
}

function palatalizeForE(stem: string): string {
  if (stem.endsWith('st')) return dropLast(stem, 2) + 'ści'
  switch (stem[stem.length - 1]) {
    case 't':
      return dropLast(stem, 1) + 'ci'
    case 'd':
      return dropLast(stem, 1) + 'dzi'
    case 'b':
      return dropLast(stem, 1) + 'bi'
    case 'p':
      return dropLast(stem, 1) + 'pi'
    case 'w':
      return dropLast(stem, 1) + 'wi'
    case 'm':
      return dropLast(stem, 1) + 'mi'
    case 'n':
      return dropLast(stem, 1) + 'ni'
    case 's':
      return dropLast(stem, 1) + 'si'
    case 'z':
      return dropLast(stem, 1) + 'zi'
    case 'r':
      return dropLast(stem, 1) + 'rz'
    case 'ł':
      return dropLast(stem, 1) + 'l'
    case 'f':
      return dropLast(stem, 1) + 'fi'
    default:
      return stem
  }
}

function isSoftConsonant(word: string): boolean {
  return (
    word.endsWith('j') ||
    word.endsWith('c') ||
    word.endsWith('cz') ||
    word.endsWith('sz') ||
    word.endsWith('rz') ||
    word.endsWith('ż') ||
    word.endsWith('ś') ||
    word.endsWith('ć') ||
    word.endsWith('ń') ||
    word.endsWith('ź') ||
    word.endsWith('l')
  )
}

// ── Data ────────────────────────────────────────────────────────────────

type Gender =
  | 'FEMININE_A'
  | 'FEMININE_CONS'
  | 'MASCULINE'
  | 'MASCULINE_A'
  | 'NEUTER_O'
  | 'NEUTER_E'
  | 'NEUTER_UM'
  | 'NEUTER_ETA'

const CONSONANTS = 'bcćdfgghjklłmnńprsśtwzźż'

const PRESENT_LABELS = ['ja', 'ty', 'on/ona/ono', 'my', 'wy', 'oni/one']
const PAST_LABELS = ['on', 'ona', 'ono', 'oni', 'one']
const IMPERATIVE_LABELS = ['ty', 'wy']
const FUTURE_AUX = ['będę', 'będziesz', 'będzie', 'będziemy', 'będziecie', 'będą']
const PRES_ESZ = ['ę', 'esz', 'e', 'emy', 'ecie', 'ą']

const CASES = [
  'Mianownik',
  'Dopełniacz',
  'Celownik',
  'Biernik',
  'Narzędnik',
  'Miejscownik',
  'Wołacz'
]

const ADJECTIVE_COLUMNS = [
  'Masculine',
  'Feminine',
  'Neuter',
  'Plural m-osobowy',
  'Plural nieosobowy'
]

/** -ać verbs conjugated with -ę/-esz (not -am): word → mutated present stem. */
const ESZ_AC = new Map<string, string>([
  ['pisać', 'pisz'],
  ['kazać', 'każ'],
  ['wiązać', 'wiąż'],
  ['mazać', 'maż'],
  ['płakać', 'płacz'],
  ['skakać', 'skacz'],
  ['wysłać', 'wyśl'],
  ['słać', 'śl'],
  ['rwać', 'rw'],
  ['zwać', 'zw'],
  ['deptać', 'depcz'],
  ['sypać', 'syp'],
  ['kąpać', 'kąp'],
  ['chlapać', 'chlap'],
  ['tupać', 'tup'],
  ['plakać', 'placz']
])

interface IrregularVerb {
  present: string[]
  past: string[]
  imperative?: string[]
  participle?: string | null
  gerund?: string | null
  passive?: string | null
  future?: string[] | null
  presentIsFuture?: boolean
}

/** Common irregular verbs; presentIsFuture marks perfective verbs whose
 *  present-tense forms are used as the future. */
const IRREGULAR_VERBS = new Map<string, IrregularVerb>([
  [
    'być',
    {
      present: ['jestem', 'jesteś', 'jest', 'jesteśmy', 'jesteście', 'są'],
      past: ['był', 'była', 'było', 'byli', 'były'],
      imperative: ['bądź', 'bądźcie'],
      participle: 'będący',
      gerund: 'będąc',
      future: ['będę', 'będziesz', 'będzie', 'będziemy', 'będziecie', 'będą']
    }
  ],
  [
    'mieć',
    {
      present: ['mam', 'masz', 'ma', 'mamy', 'macie', 'mają'],
      past: ['miał', 'miała', 'miało', 'mieli', 'miały'],
      imperative: ['miej', 'miejcie'],
      participle: 'mający',
      gerund: 'mając',
      passive: 'miany'
    }
  ],
  [
    'iść',
    {
      present: ['idę', 'idziesz', 'idzie', 'idziemy', 'idziecie', 'idą'],
      past: ['szedł', 'szła', 'szło', 'szli', 'szły'],
      imperative: ['idź', 'idźcie'],
      participle: 'idący',
      gerund: 'idąc',
      future: ['pójdę', 'pójdziesz', 'pójdzie', 'pójdziemy', 'pójdziecie', 'pójdą']
    }
  ],
  [
    'jeść',
    {
      present: ['jem', 'jesz', 'je', 'jemy', 'jecie', 'jedzą'],
      past: ['jadł', 'jadła', 'jadło', 'jedli', 'jadły'],
      imperative: ['jedz', 'jedzcie'],
      participle: 'jedzący',
      gerund: 'jedząc',
      passive: 'jedzony'
    }
  ],
  [
    'móc',
    {
      present: ['mogę', 'możesz', 'może', 'możemy', 'możecie', 'mogą'],
      past: ['mógł', 'mogła', 'mogło', 'mogli', 'mogły'],
      participle: 'mogący',
      gerund: 'mogąc'
    }
  ],
  [
    'chcieć',
    {
      present: ['chcę', 'chcesz', 'chce', 'chcemy', 'chcecie', 'chcą'],
      past: ['chciał', 'chciała', 'chciało', 'chcieli', 'chciały'],
      participle: 'chcący',
      gerund: 'chcąc'
    }
  ],
  [
    'wiedzieć',
    {
      present: ['wiem', 'wiesz', 'wie', 'wiemy', 'wiecie', 'wiedzą'],
      past: ['wiedział', 'wiedziała', 'wiedziało', 'wiedzieli', 'wiedziały'],
      participle: 'wiedzący',
      gerund: 'wiedząc'
    }
  ],
  [
    'umieć',
    {
      present: ['umiem', 'umiesz', 'umie', 'umiemy', 'umiecie', 'umieją'],
      past: ['umiał', 'umiała', 'umiało', 'umieli', 'umiały'],
      imperative: ['umiej', 'umiejcie'],
      participle: 'umiejący',
      gerund: 'umiejąc'
    }
  ],
  [
    'rozumieć',
    {
      present: ['rozumiem', 'rozumiesz', 'rozumie', 'rozumiemy', 'rozumiecie', 'rozumieją'],
      past: ['rozumiał', 'rozumiała', 'rozumiało', 'rozumieli', 'rozumiały'],
      imperative: ['rozumiej', 'rozumiejcie'],
      participle: 'rozumiejący',
      gerund: 'rozumiejąc'
    }
  ],
  [
    'wziąć',
    {
      present: ['wezmę', 'weźmiesz', 'weźmie', 'weźmiemy', 'weźmiecie', 'wezmą'],
      past: ['wziął', 'wzięła', 'wzięło', 'wzięli', 'wzięły'],
      imperative: ['weź', 'weźcie'],
      passive: 'wzięty',
      presentIsFuture: true
    }
  ],
  [
    'dać',
    {
      present: ['dam', 'dasz', 'da', 'damy', 'dacie', 'dadzą'],
      past: ['dał', 'dała', 'dało', 'dali', 'dały'],
      imperative: ['daj', 'dajcie'],
      participle: 'dający',
      gerund: 'dając',
      passive: 'dany',
      presentIsFuture: true
    }
  ],
  [
    'brać',
    {
      present: ['biorę', 'bierzesz', 'bierze', 'bierzemy', 'bierzecie', 'biorą'],
      past: ['brał', 'brała', 'brało', 'brali', 'brały'],
      imperative: ['bierz', 'bierzcie'],
      participle: 'biorący',
      gerund: 'biorąc',
      passive: 'brany'
    }
  ],
  [
    'jechać',
    {
      present: ['jadę', 'jedziesz', 'jedzie', 'jedziemy', 'jedziecie', 'jadą'],
      past: ['jechał', 'jechała', 'jechało', 'jechali', 'jechały'],
      imperative: ['jedź', 'jedźcie'],
      participle: 'jadący',
      gerund: 'jadąc',
      future: ['pojadę', 'pojedziesz', 'pojedzie', 'pojedziemy', 'pojedziecie', 'pojadą']
    }
  ],
  [
    'musieć',
    {
      present: ['muszę', 'musisz', 'musi', 'musimy', 'musicie', 'muszą'],
      past: ['musiał', 'musiała', 'musiało', 'musieli', 'musiały'],
      participle: 'muszący',
      gerund: 'musząc'
    }
  ],
  [
    'spać',
    {
      present: ['śpię', 'śpisz', 'śpi', 'śpimy', 'śpicie', 'śpią'],
      past: ['spał', 'spała', 'spało', 'spali', 'spały'],
      imperative: ['śpij', 'śpijcie'],
      participle: 'śpiący',
      gerund: 'śpiąc'
    }
  ],
  [
    'biec',
    {
      present: ['biegnę', 'biegniesz', 'biegnie', 'biegniemy', 'biegniecie', 'biegną'],
      past: ['biegł', 'biegła', 'biegło', 'biegli', 'biegły'],
      imperative: ['biegnij', 'biegnijcie'],
      participle: 'biegnący',
      gerund: 'biegnąc'
    }
  ],
  [
    'piec',
    {
      present: ['piekę', 'pieczesz', 'piecze', 'pieczemy', 'pieczecie', 'pieką'],
      past: ['piekł', 'piekła', 'piekło', 'piekli', 'piekły'],
      participle: 'piekący',
      gerund: 'piekąc',
      passive: 'pieczony'
    }
  ],
  [
    'nieść',
    {
      present: ['niosę', 'niesiesz', 'niesie', 'niesiemy', 'niesiecie', 'niosą'],
      past: ['niósł', 'niosła', 'niosło', 'nieśli', 'niosły'],
      participle: 'niosący',
      gerund: 'niosąc',
      passive: 'niesiony'
    }
  ],
  [
    'pić',
    {
      present: ['piję', 'pijesz', 'pije', 'pijemy', 'pijecie', 'piją'],
      past: ['pił', 'piła', 'piło', 'pili', 'piły'],
      imperative: ['pij', 'pijcie'],
      passive: 'pity'
    }
  ],
  [
    'myć',
    {
      present: ['myję', 'myjesz', 'myje', 'myjemy', 'myjecie', 'myją'],
      past: ['mył', 'myła', 'myło', 'myli', 'myły'],
      imperative: ['myj', 'myjcie'],
      passive: 'myty'
    }
  ],
  [
    'szyć',
    {
      present: ['szyję', 'szyjesz', 'szyje', 'szyjemy', 'szyjecie', 'szyją'],
      past: ['szył', 'szyła', 'szyło', 'szyli', 'szyły'],
      imperative: ['szyj', 'szyjcie'],
      passive: 'szyty'
    }
  ],
  [
    'bić',
    {
      present: ['biję', 'bijesz', 'bije', 'bijemy', 'bijecie', 'biją'],
      past: ['bił', 'biła', 'biło', 'bili', 'biły'],
      imperative: ['bij', 'bijcie'],
      passive: 'bity'
    }
  ],
  [
    'powiedzieć',
    {
      present: ['powiem', 'powiesz', 'powie', 'powiemy', 'powiecie', 'powiedzą'],
      past: ['powiedział', 'powiedziała', 'powiedziało', 'powiedzieli', 'powiedziały'],
      imperative: ['powiedz', 'powiedzcie'],
      passive: 'powiedziany',
      presentIsFuture: true
    }
  ],
  [
    'zostać',
    {
      present: ['zostanę', 'zostaniesz', 'zostanie', 'zostaniemy', 'zostaniecie', 'zostaną'],
      past: ['został', 'została', 'zostało', 'zostali', 'zostały'],
      imperative: ['zostań', 'zostańcie'],
      presentIsFuture: true
    }
  ],
  [
    'stać',
    {
      present: ['stoję', 'stoisz', 'stoi', 'stoimy', 'stojicie', 'stoją'],
      past: ['stał', 'stała', 'stało', 'stali', 'stały'],
      imperative: ['stój', 'stójcie'],
      participle: 'stojący',
      gerund: 'stojąc'
    }
  ]
])

/** Imperatives that do not follow the -ić/-yć/-eć stem rule. */
const IMPERATIVE_IRREGULAR = new Map<string, string[]>([
  ['robić', ['rób', 'róbcie']],
  ['zrobić', ['zrób', 'zróbcie']],
  ['czyścić', ['czyść', 'czyśćcie']],
  ['jeździć', ['jeźdź', 'jeźdźcie']],
  ['siedzieć', ['siedź', 'siedźcie']],
  ['wracać', ['wracaj', 'wracajcie']],
  ['iść', ['idź', 'idźcie']],
  ['jechać', ['jedź', 'jedźcie']],
  ['być', ['bądź', 'bądźcie']],
  ['mieć', ['miej', 'miejcie']],
  ['dać', ['daj', 'dajcie']],
  ['jeść', ['jedz', 'jedzcie']]
])

const PAST_IRREGULAR = new Map<string, string[]>([
  ['iść', ['szedł', 'szła', 'szło', 'szli', 'szły']],
  ['jeść', ['jadł', 'jadła', 'jadło', 'jedli', 'jadły']],
  ['móc', ['mógł', 'mogła', 'mogło', 'mogli', 'mogły']],
  ['nieść', ['niósł', 'niosła', 'niosło', 'nieśli', 'niosły']],
  ['piec', ['piekł', 'piekła', 'piekło', 'piekli', 'piekły']],
  ['biec', ['biegł', 'biegła', 'biegło', 'biegli', 'biegły']],
  ['mieć', ['miał', 'miała', 'miało', 'mieli', 'miały']],
  ['wiedzieć', ['wiedział', 'wiedziała', 'wiedziało', 'wiedzieli', 'wiedziały']],
  ['wziąć', ['wziął', 'wzięła', 'wzięło', 'wzięli', 'wzięły']]
])

const PASSIVE_IRREGULAR = new Map<string, string>([
  ['wziąć', 'wzięty'],
  ['dać', 'dany'],
  ['pić', 'pity'],
  ['bić', 'bity'],
  ['myć', 'myty'],
  ['szyć', 'szyty'],
  ['jeść', 'jedzony'],
  ['mieć', 'miany'],
  ['powiedzieć', 'powiedziany'],
  ['zostać', 'zostany']
])

/** Words the rule engine must not guess at (pronouns/function words -> LLM). */
const NOUN_RULE_EXCLUDED = new Set<string>([
  'ja',
  'ty',
  'on',
  'ona',
  'ono',
  'my',
  'wy',
  'oni',
  'one',
  'kto',
  'co',
  'nikt',
  'nic',
  'wszystko',
  'ten',
  'ta',
  'to',
  'ci',
  'tamten',
  'tamta',
  'tamto',
  'tamci',
  'taki',
  'taka',
  'takie',
  'tacy',
  'jaki',
  'jaka',
  'jakie',
  'mój',
  'moja',
  'moje',
  'moi',
  'twój',
  'twoja',
  'twoje',
  'twoi',
  'nasz',
  'nasza',
  'nasze',
  'nasi',
  'wasz',
  'wasza',
  'wasze',
  'wasi',
  'swój',
  'swoja',
  'swoje',
  'swoi',
  'jego',
  'jej',
  'ich',
  'jeden',
  'jedna',
  'jedno',
  'jedni',
  'dwa',
  'dwie',
  'trzy',
  'cztery',
  'pięć',
  'sześć',
  'siedem',
  'osiem',
  'dziewięć',
  'dziesięć',
  'sto',
  'tysiąc',
  'milion',
  'kilka',
  'wiele'
])

/** Masculine -a nouns (declined like feminine -a in the singular). */
const MASC_A = new Set<string>([
  'mężczyzna',
  'poeta',
  'kolega',
  'tata',
  'kierowca',
  'sędzia',
  'artysta',
  'dentysta',
  'turysta',
  'filolog'
])

/** Feminine consonant-stem nouns not ending in -ość/-ść. */
const FEM_CONS = new Set<string>([
  'noc',
  'twarz',
  'rzecz',
  'myśl',
  'mysz',
  'kość',
  'miłość',
  'moc',
  'nić',
  'dłoń',
  'pieśń',
  'krew',
  'sól',
  'sieć',
  'wieś',
  'broń',
  'gęś',
  'oś',
  'gałąź',
  'łódź',
  'przyjaźń',
  'spowiedź'
])

/** Irregular nominative plurals for feminine consonant stems. */
const FEM_CONS_NOM_PL = new Map<string, string>([
  ['gałąź', 'gałęzie'],
  ['krew', 'krwie'],
  ['wieś', 'wsie'],
  ['dłoń', 'dłonie'],
  ['nić', 'nici']
])

/** Feminine -ia nouns whose genitive singular keeps a single -i (ziemia→ziemi; armia→armii). */
const FEM_IA_SINGLE_I = new Set<string>(['ziemia', 'kuchnia', 'sypialnia'])

/** Mobile-vowel and irregular genitive plurals for feminine -a nouns. */
const FEM_GEN_PL = new Map<string, string>([
  ['siostra', 'sióstr'],
  ['noga', 'nóg'],
  ['droga', 'dróg'],
  ['ręka', 'rąk'],
  ['woda', 'wód'],
  ['głowa', 'głów'],
  ['góra', 'gór'],
  ['żona', 'żon'],
  ['książka', 'książek'],
  ['matka', 'matek'],
  ['córka', 'córek'],
  ['lalka', 'lalek'],
  ['ziemia', 'ziem'],
  ['kuchnia', 'kuchni'],
  ['sypialnia', 'sypialni'],
  ['dusza', 'dusz'],
  ['ulica', 'ulic'],
  ['chwila', 'chwil'],
  ['godzina', 'godzin'],
  ['kobieta', 'kobiet'],
  ['mama', 'mam'],
  ['mapa', 'map']
])

/** Masculine genitive singular in -u (default -a). */
const MAS_GEN_U = new Map<string, string>([
  ['dom', 'domu'],
  ['stół', 'stołu'],
  ['cukier', 'cukru'],
  ['czas', 'czasu'],
  ['rok', 'roku'],
  ['las', 'lasu'],
  ['pokój', 'pokoju'],
  ['kraj', 'kraju'],
  ['ul', 'ulu'],
  ['list', 'listu'],
  ['miód', 'miodu'],
  ['sok', 'soku'],
  ['ryż', 'ryżu'],
  ['chleb', 'chleba']
])

/** Masculine dative singular in -u (default -owi). */
const MAS_DAT_U = new Map<string, string>([
  ['kot', 'kotu'],
  ['pies', 'psu'],
  ['pan', 'panu'],
  ['chłopiec', 'chłopcu'],
  ['ojciec', 'ojcu'],
  ['brat', 'bratu']
])

/** Masculine locative singular exceptions (default -e palatalized or -u soft). */
const MAS_LOC_U = new Map<string, string>([
  ['dom', 'domu'],
  ['syn', 'synu'],
  ['las', 'lesie'],
  ['świat', 'świecie'],
  ['wiatr', 'wietrze'],
  ['miód', 'miodzie'],
  ['list', 'liście'],
  ['czas', 'czasie'],
  ['miesiąc', 'miesiącu']
])

/** Masculine vocative singular exceptions (default = locative). */
const MAS_VOC = new Map<string, string>([
  ['pan', 'panie'],
  ['chłopiec', 'chłopcze'],
  ['ojciec', 'ojcze'],
  ['Bóg', 'Boże'],
  ['profesor', 'profesorze']
])

/** Masculine personal (virile) plural nominatives. */
const VIRILE_NOM = new Map<string, string>([
  ['pan', 'panowie'],
  ['profesor', 'profesorowie'],
  ['syn', 'synowie'],
  ['chłopiec', 'chłopcy'],
  ['ojciec', 'ojcowie'],
  ['brat', 'bracia'],
  ['mąż', 'mężowie'],
  ['student', 'studenci'],
  ['lekarz', 'lekarze'],
  ['Polak', 'Polacy'],
  ['Rosjanin', 'Rosjanie'],
  ['Niemiec', 'Niemcy'],
  ['przyjaciel', 'przyjaciele'],
  ['kolega', 'koledzy'],
  ['artysta', 'artyści'],
  ['dentysta', 'dentyści'],
  ['turysta', 'turyści'],
  ['sędzia', 'sędziowie'],
  ['poeta', 'poeci'],
  ['mężczyzna', 'mężczyźni'],
  ['tata', 'tatusiowie']
])

/** Masculine genitive plural exceptions (default -ów). */
const MAS_GEN_PL = new Map<string, string>([
  ['koń', 'koni'],
  ['gość', 'gości'],
  ['dzień', 'dni'],
  ['tydzień', 'tygodni'],
  ['miesiąc', 'miesięcy'],
  ['przyjaciel', 'przyjaciół'],
  ['nauczyciel', 'nauczycieli'],
  ['chłopiec', 'chłopców'],
  ['ul', 'uli'],
  ['rok', 'lat'],
  ['mężczyzna', 'mężczyzn']
])

/** Instrumental plural in -mi instead of -ami. */
const INST_PL = new Map<string, string>([
  ['koń', 'końmi'],
  ['gość', 'gośćmi'],
  ['brat', 'braćmi'],
  ['przyjaciel', 'przyjaciółmi'],
  ['dziecko', 'dziećmi'],
  ['ludzie', 'ludźmi'],
  ['rok', 'latami']
])

/** Neuter -o locative singular exceptions. */
const NEUTER_LOC = new Map<string, string>([['miasto', 'mieście']])

/** Neuter genitive plural exceptions (mobile vowels / -ów). */
const NEUTER_GEN_PL = new Map<string, string>([
  ['okno', 'okien'],
  ['jabłko', 'jabłek'],
  ['jajko', 'jajek'],
  ['okienko', 'okienek'],
  ['morze', 'mórz'],
  ['pole', 'pól'],
  ['zdjęcie', 'zdjęć'],
  ['pytanie', 'pytań'],
  ['lato', 'lat'],
  ['dziecko', 'dzieci'],
  ['kino', 'kin'],
  ['wino', 'win'],
  ['serce', 'serc'],
  ['słońce', 'słońc'],
  ['radio', 'radiów'],
  ['studio', 'studiów'],
  ['imię', 'imion'],
  ['zwierzę', 'zwierząt'],
  ['drzewo', 'drzew'],
  ['miasto', 'miast']
])

/** Full 14-form paradigms (sg: nom gen dat acc inst loc voc, then plural)
 *  for suppletive/irregular nouns. */
const IRREGULAR_NOUNS = new Map<string, string[]>([
  [
    'człowiek',
    [
      'człowiek',
      'człowieka',
      'człowiekowi',
      'człowieka',
      'człowiekiem',
      'człowieku',
      'człowieku',
      'ludzie',
      'ludzi',
      'ludziom',
      'ludzi',
      'ludźmi',
      'ludziach',
      'ludzie'
    ]
  ],
  [
    'rok',
    [
      'rok',
      'roku',
      'rokowi',
      'rok',
      'rokiem',
      'roku',
      'roku',
      'lata',
      'lat',
      'latom',
      'lata',
      'latami',
      'latach',
      'lata'
    ]
  ],
  [
    'dzień',
    [
      'dzień',
      'dnia',
      'dniowi',
      'dzień',
      'dniem',
      'dniu',
      'dniu',
      'dni',
      'dni',
      'dniom',
      'dni',
      'dniami',
      'dniach',
      'dni'
    ]
  ],
  [
    'tydzień',
    [
      'tydzień',
      'tygodnia',
      'tygodniowi',
      'tydzień',
      'tygodniem',
      'tygodniu',
      'tygodniu',
      'tygodnie',
      'tygodni',
      'tygodniom',
      'tygodnie',
      'tygodniami',
      'tygodniach',
      'tygodnie'
    ]
  ],
  [
    'miesiąc',
    [
      'miesiąc',
      'miesiąca',
      'miesiącowi',
      'miesiąc',
      'miesiącem',
      'miesiącu',
      'miesiącu',
      'miesiące',
      'miesięcy',
      'miesiącom',
      'miesiące',
      'miesiącami',
      'miesiącach',
      'miesiące'
    ]
  ],
  [
    'koń',
    [
      'koń',
      'konia',
      'koniowi',
      'konia',
      'koniem',
      'koniu',
      'koniu',
      'konie',
      'koni',
      'koniom',
      'konie',
      'końmi',
      'koniach',
      'konie'
    ]
  ],
  [
    'gość',
    [
      'gość',
      'gościa',
      'gościowi',
      'gościa',
      'gościem',
      'gościu',
      'gościu',
      'goście',
      'gości',
      'gościom',
      'gości',
      'gośćmi',
      'gościach',
      'goście'
    ]
  ],
  [
    'pies',
    [
      'pies',
      'psa',
      'psu',
      'psa',
      'psem',
      'psie',
      'psie',
      'psy',
      'psów',
      'psom',
      'psy',
      'psami',
      'psach',
      'psy'
    ]
  ],
  [
    'pani',
    [
      'pani',
      'pani',
      'pani',
      'panią',
      'panią',
      'pani',
      'pani',
      'panie',
      'pań',
      'paniom',
      'panie',
      'paniami',
      'paniach',
      'panie'
    ]
  ],
  [
    'imię',
    [
      'imię',
      'imienia',
      'imieniu',
      'imię',
      'imieniem',
      'imieniu',
      'imię',
      'imiona',
      'imion',
      'imionom',
      'imiona',
      'imionami',
      'imionach',
      'imiona'
    ]
  ],
  [
    'ramię',
    [
      'ramię',
      'ramienia',
      'ramieniu',
      'ramię',
      'ramieniem',
      'ramieniu',
      'ramię',
      'ramiona',
      'ramion',
      'ramionom',
      'ramiona',
      'ramionami',
      'ramionach',
      'ramiona'
    ]
  ],
  [
    'krew',
    [
      'krew',
      'krwi',
      'krwi',
      'krew',
      'krwią',
      'krwi',
      'krwi',
      'krwie',
      'krwi',
      'krwiom',
      'krwie',
      'krwiami',
      'krwiach',
      'krwie'
    ]
  ],
  [
    'gałąź',
    [
      'gałąź',
      'gałęzi',
      'gałęzi',
      'gałąź',
      'gałęzią',
      'gałęzi',
      'gałęzi',
      'gałęzie',
      'gałęzi',
      'gałęziom',
      'gałęzie',
      'gałęziami',
      'gałęziach',
      'gałęzie'
    ]
  ],
  [
    'dziecko',
    [
      'dziecko',
      'dziecka',
      'dziecku',
      'dziecko',
      'dzieckiem',
      'dziecku',
      'dziecko',
      'dzieci',
      'dzieci',
      'dzieciom',
      'dzieci',
      'dziećmi',
      'dzieciach',
      'dzieci'
    ]
  ]
])
