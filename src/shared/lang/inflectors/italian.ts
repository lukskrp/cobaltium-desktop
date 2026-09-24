import type { InflectionEngine, InflectionParadigm, ParadigmRow, ParadigmTable } from '../inflection'

function dropLast(s: string, n: number): string {
  return s.slice(0, s.length - n)
}

function removeSuffix(s: string, suffix: string): string {
  return s.endsWith(suffix) ? s.slice(0, s.length - suffix.length) : s
}

/**
 * Bundled Italian (it) inflector: deterministic, offline LangDex paradigms.
 *
 * Verbs:
 * - Regular conjugations -are (parlare), -ere (credere) and -ire with the
 *   -isc- subclass (finire) plus the plain subclass (dormire, partire, ...),
 *   with the -are orthographic rules (-care -> cerchi, -iare -> mangi).
 *   Tenses: Presente, Imperfetto, Passato remoto, Futuro semplice,
 *   Condizionale presente, Congiuntivo presente, Congiuntivo imperfetto,
 *   Imperativo (tu/Lei/noi/voi/loro), Passato prossimo, Trapassato prossimo,
 *   plus Infinito/Participio presente/Participio passato/Gerundio.
 * - Passato prossimo uses avere, or essere for the curated motion/change verbs
 *   (andare, venire, nascere, morire, uscire, ...).
 * - Curated irregulars (~35): essere, avere, andare, venire, fare, dire,
 *   potere, volere, dovere, sapere, stare, dare, vedere, bere, prendere,
 *   mettere, leggere, scrivere, aprire, offrire, soffrire, morire, correre,
 *   scegliere, perdere, vincere, piacere, vivere, nascere, crescere, uscire,
 *   salire, scendere, rimanere, conoscere, tradurre, tenere, cadere.
 *
 * Nouns: no cases — only number. Plural rules cover -o -> -i, -a -> -e,
 * -e -> -i, -ca/-ga -> -che/-ghe, -co/-go -> -chi/-ghi (with curated -ci/-gi),
 * -cia/-gia -> -ce/-ge, and invariable words (accented vowels, consonants).
 *
 * Adjectives: agreement in gender and number (bello/bella/belli/belle).
 *
 * Unhandled words return null so the caller falls back to the LLM tier.
 */
export const ItalianInflector: InflectionEngine = {
  engine: 'it-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'it') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const p = pos?.toLowerCase()
    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(word)
      case 'declension':
        return p === 'adjective' ? adjectiveParadigm(word) : nounParadigm(word)
      default:
        if (p !== undefined && PRONOUN_LIKE.has(p)) return null
        if (isNullOrBlank(pos) && looksLikeVerb(word)) return conjugate(word) ?? nounParadigm(word)
        if (isNullOrBlank(pos)) return nounParadigm(word)
        return {
          lemma,
          lang: 'it',
          kind: null,
          note: 'Gli avverbi e le parole invariabili non si coniugano in italiano.',
          tables: []
        }
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
  return word.endsWith('are') || word.endsWith('ere') || word.endsWith('ire')
}

function isNullOrBlank(pos: string | null): boolean {
  return pos === null || pos.trim() === ''
}

/** Pronouns/determiners/numeral decline in Italian but the rule engine cannot
 *  guess them (io, questo, mio) — send them to the LLM tier. */
const PRONOUN_LIKE = new Set(['pronoun', 'determiner', 'numeral'])

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(word: string): InflectionParadigm | null {
  const irregular = IRREGULAR_VERBS.get(word)
  if (irregular) return irregularVerbParadigm(word, irregular)
  if (word.endsWith('are')) return areVerb(word)
  if (word.endsWith('ere')) return ereVerb(word)
  if (word.endsWith('ire')) return ireVerb(word)
  return null
}

/** Regular -are verbs (parlare), with -care/-gare/-iare spelling rules. */
function areVerb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 3)
  const present = presentAre(stem)
  const remote = ['ai', 'asti', 'ò', 'ammo', 'aste', 'arono'].map((it) => stem + it)
  const futureStem = stem + 'er'
  return regularTables(
    inf,
    present,
    remote,
    futureStem,
    congAre(stem),
    imperativeAre(stem),
    stem + 'ato',
    stem + 'ante',
    stem + 'ando',
    'are'
  )
}

/** Regular -ere verbs (credere). */
function ereVerb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 3)
  const present = [stem + 'o', stem + 'i', stem + 'e', stem + 'iamo', stem + 'ete', stem + 'ono']
  const remote = ['ei', 'esti', 'é', 'emmo', 'este', 'erono'].map((it) => stem + it)
  const futureStem = stem + 'er'
  return regularTables(
    inf,
    present,
    remote,
    futureStem,
    [stem + 'a', stem + 'a', stem + 'a', stem + 'iamo', stem + 'iate', stem + 'ano'],
    [stem + 'i', stem + 'a', stem + 'iamo', stem + 'ete', stem + 'ano'],
    stem + 'uto',
    stem + 'ente',
    stem + 'endo',
    'ere'
  )
}

/** Regular -ire verbs: -isc- subclass (finisco) or plain (dormo). */
function ireVerb(inf: string): InflectionParadigm {
  const stem = dropLast(inf, 3)
  const isc = !NO_ISC.has(inf)
  const present = isc
    ? [stem + 'isco', stem + 'isci', stem + 'isce', stem + 'iamo', stem + 'ite', stem + 'iscono']
    : [stem + 'o', stem + 'i', stem + 'e', stem + 'iamo', stem + 'ite', stem + 'ono']
  const remote = ['ii', 'isti', 'ì', 'immo', 'iste', 'irono'].map((it) => stem + it)
  const futureStem = stem + 'ir'
  const cong = isc
    ? [stem + 'isca', stem + 'isca', stem + 'isca', stem + 'iamo', stem + 'iate', stem + 'iscano']
    : [stem + 'a', stem + 'a', stem + 'a', stem + 'iamo', stem + 'iate', stem + 'ano']
  const imperative = isc
    ? [stem + 'isci', stem + 'isca', stem + 'iamo', stem + 'ite', stem + 'iscano']
    : [stem + 'i', stem + 'a', stem + 'iamo', stem + 'ite', stem + 'ano']
  return regularTables(
    inf,
    present,
    remote,
    futureStem,
    cong,
    imperative,
    stem + 'ito',
    stem + 'ente',
    stem + 'endo',
    'ire'
  )
}

function presentAre(stem: string): string[] {
  const tu = stem.endsWith('c') || stem.endsWith('g') ? stem + 'hi' : stem.endsWith('i') ? stem : stem + 'i'
  const noi =
    stem.endsWith('c') || stem.endsWith('g')
      ? stem + 'hiamo'
      : stem.endsWith('i')
        ? stem + 'amo'
        : stem + 'iamo'
  return [stem + 'o', tu, stem + 'a', noi, stem + 'ate', stem + 'ano']
}

/** Congiuntivo presente of -are verbs: tu-form based (parli, cerchi, mangi). */
function congAre(stem: string): string[] {
  const tu = stem.endsWith('c') || stem.endsWith('g') ? stem + 'hi' : stem.endsWith('i') ? stem : stem + 'i'
  const noi =
    stem.endsWith('c') || stem.endsWith('g')
      ? stem + 'hiamo'
      : stem.endsWith('i')
        ? stem + 'amo'
        : stem + 'iamo'
  const voi =
    stem.endsWith('c') || stem.endsWith('g')
      ? stem + 'hiate'
      : stem.endsWith('i')
        ? stem + 'ate'
        : stem + 'iate'
  return [tu, tu, tu, noi, voi, tu + 'no']
}

function imperativeAre(stem: string): string[] {
  const tu = stem.endsWith('c') || stem.endsWith('g') ? stem + 'hi' : stem.endsWith('i') ? stem : stem + 'i'
  const noi =
    stem.endsWith('c') || stem.endsWith('g')
      ? stem + 'hiamo'
      : stem.endsWith('i')
        ? stem + 'amo'
        : stem + 'iamo'
  return [stem + 'a', tu, noi, stem + 'ate', tu + 'no']
}

/** Shared table builder for regular verbs; cong. imperfetto derives from the
 *  passato remoto 1sg (parlai -> parlassi), imperfetto from the 1pl stem. */
function regularTables(
  inf: string,
  present: string[],
  remote: string[],
  futureStem: string,
  congPresent: string[],
  imperative: string[],
  participlePasse: string,
  participlePresent: string,
  gerund: string,
  imperfectClass: string
): InflectionParadigm {
  const congImperfetto = IMPERFETTO_CONG_ENDINGS.map((it) => removeSuffix(remote[0], 'i') + it)
  const imperfetto = IMPERFETTO_ENDINGS[imperfectClass].map(
    (it) => removeSuffix(present[3], 'iamo') + it
  )
  const future = FUTURE_ENDINGS.map((it) => futureStem + it)
  return verbTables(
    inf,
    present,
    imperfetto,
    remote,
    future,
    CONDIZIONALE_ENDINGS.map((it) => futureStem + it),
    congPresent,
    congImperfetto,
    imperative,
    participlePasse,
    participlePresent,
    gerund,
    auxiliaryOf(inf)
  )
}

function irregularVerbParadigm(inf: string, v: IrregularVerb): InflectionParadigm {
  const imperfetto =
    v.imperfetto ??
    IMPERFETTO_ENDINGS[v.imperfectClass].map((it) => removeSuffix(v.present[3], 'iamo') + it)
  const future = FUTURE_ENDINGS.map((it) => v.futureStem + it)
  return verbTables(
    inf,
    v.present,
    imperfetto,
    v.remote,
    future,
    CONDIZIONALE_ENDINGS.map((it) => v.futureStem + it),
    v.congPresent,
    v.congImperfetto,
    v.imperative ?? [],
    v.participlePasse,
    v.participlePresent ?? null,
    v.gerund ?? defaultGerund(inf),
    v.auxiliary ?? 'avere'
  )
}

function defaultGerund(inf: string): string {
  return inf.endsWith('are') ? dropLast(inf, 3) + 'ando' : dropLast(inf, 3) + 'endo'
}

function auxiliaryOf(inf: string): string {
  return ESSERE_VERBS.has(inf) ? 'essere' : 'avere'
}

function verbTables(
  inf: string,
  present: string[],
  imperfetto: string[],
  remote: string[],
  future: string[],
  condizionale: string[],
  congPresent: string[],
  congImperfetto: string[],
  imperative: string[],
  participlePasse: string,
  participlePresent: string | null,
  gerund: string,
  auxiliary: string
): InflectionParadigm {
  const auxPresent = auxiliary === 'essere' ? ESSERE_PRESENT : AVERE_PRESENT
  const auxImperfetto = auxiliary === 'essere' ? ESSERE_IMPERFETTO : AVERE_IMPERFETTO
  const tables: ParadigmTable[] = []
  tables.push(
    { title: 'Presente', columns: ['Forma'], rows: PERSONS.map((p, i) => ({ label: p, cells: [present[i]] })) }
  )
  tables.push(
    { title: 'Imperfetto', columns: ['Forma'], rows: PERSONS.map((p, i) => ({ label: p, cells: [imperfetto[i]] })) }
  )
  tables.push(
    {
      title: 'Passato remoto',
      columns: ['Forma'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [remote[i]] }))
    }
  )
  tables.push(
    {
      title: 'Futuro semplice',
      columns: ['Forma'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [future[i]] }))
    }
  )
  tables.push(
    {
      title: 'Condizionale presente',
      columns: ['Forma'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [condizionale[i]] }))
    }
  )
  tables.push(
    {
      title: 'Congiuntivo presente',
      columns: ['Forma'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [congPresent[i]] }))
    }
  )
  tables.push(
    {
      title: 'Congiuntivo imperfetto',
      columns: ['Forma'],
      rows: PERSONS.map((p, i) => ({ label: p, cells: [congImperfetto[i]] }))
    }
  )
  if (imperative.length > 0) {
    tables.push({
      title: 'Imperativo',
      columns: ['Forma'],
      rows: IMPERATIVE_LABELS.map((l, i) => ({ label: l, cells: [imperative[i]] }))
    })
  }
  tables.push({
    title: 'Passato prossimo',
    columns: ['Forma'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [`${auxPresent[i]} ${participlePasse}`] }))
  })
  tables.push({
    title: 'Trapassato prossimo',
    columns: ['Forma'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [`${auxImperfetto[i]} ${participlePasse}`] }))
  })
  const ppRows: ParadigmRow[] = []
  ppRows.push({ label: 'Infinito', cells: [inf] })
  if (participlePresent !== null) ppRows.push({ label: 'Participio presente', cells: [participlePresent] })
  ppRows.push({ label: 'Participio passato', cells: [participlePasse] })
  ppRows.push({ label: 'Gerundio', cells: [gerund] })
  tables.push({ title: 'Forme non finite', columns: ['Forma'], rows: ppRows })
  return {
    lemma: inf,
    lang: 'it',
    kind: 'conjugation',
    note: `Il passato prossimo e il trapassato prossimo si coniugano con ${auxiliary}.`,
    tables
  }
}

// ── Nouns & adjectives ──────────────────────────────────────────────────

function nounParadigm(word: string): InflectionParadigm {
  const pluralForm = plural(word)
  return {
    lemma: word,
    lang: 'it',
    kind: 'declension',
    note: 'I nomi italiani non si declinano ; varia solo il numero.',
    tables: [
      {
        title: 'Numero',
        columns: ['Singolare', 'Plurale'],
        rows: [{ label: 'Forma', cells: [word, pluralForm] }]
      }
    ]
  }
}

/** Italian plural: -o -> -i, -a -> -e, -e -> -i with the -ca/-ga/-co/-go/-cia
 *  spelling rules; accented and consonant-final words are invariable. */
function plural(word: string): string {
  const last = word.charAt(word.length - 1)
  const irregular = PLURAL_IRREGULAR.get(word)
  if (irregular !== undefined) return irregular
  if ('àèìòù'.includes(last) || !VOWELS.includes(last)) return word
  if (word.endsWith('cia')) return dropLast(word, 3) + 'ce'
  if (word.endsWith('gia')) return dropLast(word, 3) + 'ge'
  if (word.endsWith('ca')) return dropLast(word, 2) + 'che'
  if (word.endsWith('ga')) return dropLast(word, 2) + 'ghe'
  if (word.endsWith('co')) return dropLast(word, 1) + (CO_CI.has(dropLast(word, 1)) ? 'i' : 'hi')
  if (word.endsWith('go')) return dropLast(word, 1) + (GO_GI.has(dropLast(word, 1)) ? 'i' : 'hi')
  if (word.endsWith('o')) return dropLast(word, 1) + 'i'
  if (word.endsWith('a')) return dropLast(word, 1) + 'e'
  return dropLast(word, 1) + 'i'
}

function adjectiveParadigm(word: string): InflectionParadigm {
  const feminine = word.endsWith('o') ? dropLast(word, 1) + 'a' : word
  return {
    lemma: word,
    lang: 'it',
    kind: 'declension',
    note: "L'aggettivo si accorda in genere e numero con il nome.",
    tables: [
      {
        title: 'Genere e numero',
        columns: ['Singolare', 'Plurale'],
        rows: [
          { label: 'Maschile', cells: [word, plural(word)] },
          { label: 'Femminile', cells: [feminine, plural(feminine)] }
        ]
      }
    ]
  }
}

// ── Data ────────────────────────────────────────────────────────────────

const PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro']
const IMPERATIVE_LABELS = ['tu', 'Lei', 'noi', 'voi', 'loro']
const VOWELS = 'aeiou'

const FUTURE_ENDINGS = ['ò', 'ai', 'à', 'emo', 'ete', 'anno']
const CONDIZIONALE_ENDINGS = ['ei', 'esti', 'ebbe', 'emmo', 'este', 'ebbero']
const IMPERFETTO_ENDINGS: Record<string, string[]> = {
  are: ['avo', 'avi', 'ava', 'avamo', 'avate', 'avano'],
  ere: ['evo', 'evi', 'eva', 'evamo', 'evate', 'evano'],
  ire: ['ivo', 'ivi', 'iva', 'ivamo', 'ivate', 'ivano']
}
const IMPERFETTO_CONG_ENDINGS = ['ssi', 'ssi', 'sse', 'ssimo', 'ste', 'ssero']

const AVERE_PRESENT = ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno']
const AVERE_IMPERFETTO = ['avevo', 'avevi', 'aveva', 'avevamo', 'avevate', 'avevano']
const ESSERE_PRESENT = ['sono', 'sei', 'è', 'siamo', 'siete', 'sono']
const ESSERE_IMPERFETTO = ['ero', 'eri', 'era', 'eravamo', 'eravate', 'erano']

/** Verbs conjugated with essere in compound tenses. */
const ESSERE_VERBS = new Set([
  'essere', 'andare', 'venire', 'arrivare', 'partire', 'entrare', 'uscire',
  'tornare', 'restare', 'rimanere', 'nascere', 'morire', 'salire', 'scendere',
  'diventare', 'stare', 'cadere', 'apparire', 'crescere', 'piacere',
  'succedere', 'riuscire', 'fuggire'
])

/** -ire verbs conjugated without the -isc- infix (dormo, parto, sento, ...). */
const NO_ISC = new Set([
  'dormire', 'partire', 'sentire', 'servire', 'vestire', 'mentire',
  'seguire', 'fuggire', 'divertire', 'avvertire', 'cucire', 'assalire',
  'riempire', 'udire', 'coprire', 'bollire', 'aprire', 'offrire', 'soffrire'
])

/** -co/-go noun stems whose plural is -ci/-gi rather than -chi/-ghi. */
const CO_CI = new Set(['amic', 'medic', 'monac', 'chimic', 'diplomatic', 'grec'])
const GO_GI = new Set(['psicolog', 'asparag'])

/** Curated irregular plurals (dio -> dèi, uomo -> uomini, ...). */
const PLURAL_IRREGULAR = new Map<string, string>([
  ['uomo', 'uomini'], ['dio', 'dei'], ['mano', 'mani'], ['uovo', 'uova'],
  ['città', 'città'], ['bue', 'buoi'], ['caffè', 'caffè']
])

interface IrregularVerb {
  present: string[]
  remote: string[]
  futureStem: string
  congPresent: string[]
  congImperfetto: string[]
  imperative?: string[]
  participlePresent?: string | null
  participlePasse: string
  auxiliary?: string
  imperfetto?: string[] | null
  gerund?: string | null
  imperfectClass: string
}

/** Common irregular verbs. Imperfetto derives from the 1pl stem unless
 *  curated (essere, avere, fare, dire, sapere, potere, volere, dovere). */
const IRREGULAR_VERBS = new Map<string, IrregularVerb>([
  ['essere', {
    present: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'],
    remote: ['fui', 'fosti', 'fu', 'fummo', 'foste', 'furono'],
    futureStem: 'sar',
    congPresent: ['sia', 'sia', 'sia', 'siamo', 'siate', 'siano'],
    congImperfetto: ['fossi', 'fossi', 'fosse', 'fossimo', 'foste', 'fossero'],
    imperative: ['sii', 'sia', 'siamo', 'siate', 'siano'],
    participlePasse: 'stato', auxiliary: 'essere',
    imperfetto: ['ero', 'eri', 'era', 'eravamo', 'eravate', 'erano'],
    imperfectClass: 'ere'
  }],
  ['avere', {
    present: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'],
    remote: ['ebbi', 'avesti', 'ebbe', 'avemmo', 'aveste', 'ebbero'],
    futureStem: 'avr',
    congPresent: ['abbia', 'abbia', 'abbia', 'abbiamo', 'abbiate', 'abbiano'],
    congImperfetto: ['avessi', 'avessi', 'avesse', 'avessimo', 'aveste', 'avessero'],
    imperative: ['abbi', 'abbia', 'abbiamo', 'abbiate', 'abbiano'],
    participlePresent: 'avente', participlePasse: 'avuto',
    imperfetto: ['avevo', 'avevi', 'aveva', 'avevamo', 'avevate', 'avevano'],
    imperfectClass: 'ere'
  }],
  ['andare', {
    present: ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno'],
    remote: ['andai', 'andasti', 'andò', 'andammo', 'andaste', 'andarono'],
    futureStem: 'andr',
    congPresent: ['vada', 'vada', 'vada', 'andiamo', 'andiate', 'vadano'],
    congImperfetto: ['andassi', 'andassi', 'andasse', 'andassimo', 'andaste', 'andassero'],
    imperative: ['va', 'vada', 'andiamo', 'andate', 'vadano'],
    participlePresent: 'andante', participlePasse: 'andato', auxiliary: 'essere',
    imperfectClass: 'are'
  }],
  ['venire', {
    present: ['vengo', 'vieni', 'viene', 'veniamo', 'venite', 'vengono'],
    remote: ['venni', 'venisti', 'venne', 'venimmo', 'veniste', 'vennero'],
    futureStem: 'verr',
    congPresent: ['venga', 'venga', 'venga', 'veniamo', 'veniate', 'vengano'],
    congImperfetto: ['venissi', 'venissi', 'venisse', 'venissimo', 'veniste', 'venissero'],
    imperative: ['vieni', 'venga', 'veniamo', 'venite', 'vengano'],
    participlePresent: 'veniente', participlePasse: 'venuto', auxiliary: 'essere',
    imperfectClass: 'ire'
  }],
  ['fare', {
    present: ['faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno'],
    remote: ['feci', 'facesti', 'fece', 'facemmo', 'faceste', 'fecero'],
    futureStem: 'far',
    congPresent: ['faccia', 'faccia', 'faccia', 'facciamo', 'facciate', 'facciano'],
    congImperfetto: ['facessi', 'facessi', 'facesse', 'facessimo', 'faceste', 'facessero'],
    imperative: ['fa', 'faccia', 'facciamo', 'fate', 'facciano'],
    participlePresent: 'facente', participlePasse: 'fatto',
    imperfetto: ['facevo', 'facevi', 'faceva', 'facevamo', 'facevate', 'facevano'],
    imperfectClass: 'are'
  }],
  ['dire', {
    present: ['dico', 'dici', 'dice', 'diciamo', 'dite', 'dicono'],
    remote: ['dissi', 'dicesti', 'disse', 'dicemmo', 'diceste', 'dissero'],
    futureStem: 'dir',
    congPresent: ['dica', 'dica', 'dica', 'diciamo', 'diciate', 'dicano'],
    congImperfetto: ['dicessi', 'dicessi', 'dicesse', 'dicessimo', 'diceste', 'dicessero'],
    imperative: ['di', 'dica', 'diciamo', 'dite', 'dicano'],
    participlePresent: 'dicente', participlePasse: 'detto',
    imperfetto: ['dicevo', 'dicevi', 'diceva', 'dicevamo', 'dicevate', 'dicevano'],
    imperfectClass: 'ire'
  }],
  ['potere', {
    present: ['posso', 'puoi', 'può', 'possiamo', 'potete', 'possono'],
    remote: ['potei', 'potesti', 'poté', 'potemmo', 'poteste', 'poterono'],
    futureStem: 'potr',
    congPresent: ['possa', 'possa', 'possa', 'possiamo', 'possiate', 'possano'],
    congImperfetto: ['potessi', 'potessi', 'potesse', 'potessimo', 'poteste', 'potessero'],
    participlePresent: 'potente', participlePasse: 'potuto',
    imperfetto: ['potevo', 'potevi', 'poteva', 'potevamo', 'potevate', 'potevano'],
    imperfectClass: 'ere'
  }],
  ['volere', {
    present: ['voglio', 'vuoi', 'vuole', 'vogliamo', 'volete', 'vogliono'],
    remote: ['volli', 'volesti', 'volle', 'volemmo', 'voleste', 'vollero'],
    futureStem: 'vorr',
    congPresent: ['voglia', 'voglia', 'voglia', 'vogliamo', 'vogliate', 'vogliano'],
    congImperfetto: ['volessi', 'volessi', 'volesse', 'volessimo', 'voleste', 'volessero'],
    participlePresent: 'volente', participlePasse: 'voluto',
    imperfetto: ['volevo', 'volevi', 'voleva', 'volevamo', 'volevate', 'volevano'],
    imperfectClass: 'ere'
  }],
  ['dovere', {
    present: ['devo', 'devi', 'deve', 'dobbiamo', 'dovete', 'devono'],
    remote: ['dovetti', 'dovesti', 'dovette', 'dovemmo', 'doveste', 'dovettero'],
    futureStem: 'dovr',
    congPresent: ['debba', 'debba', 'debba', 'dobbiamo', 'dobbiate', 'debbano'],
    congImperfetto: ['dovessi', 'dovessi', 'dovesse', 'dovessimo', 'doveste', 'dovessero'],
    participlePresent: 'dovente', participlePasse: 'dovuto',
    imperfetto: ['dovevo', 'dovevi', 'doveva', 'dovevamo', 'dovevate', 'dovevano'],
    imperfectClass: 'ere'
  }],
  ['sapere', {
    present: ['so', 'sai', 'sa', 'sappiamo', 'sapete', 'sanno'],
    remote: ['seppi', 'sapesti', 'seppe', 'sapemmo', 'sapeste', 'seppero'],
    futureStem: 'sapr',
    congPresent: ['sappia', 'sappia', 'sappia', 'sappiamo', 'sappiate', 'sappiano'],
    congImperfetto: ['sapessi', 'sapessi', 'sapesse', 'sapessimo', 'sapeste', 'sapessero'],
    imperative: ['sappi', 'sappia', 'sappiamo', 'sappiate', 'sappiano'],
    participlePresent: 'sapiente', participlePasse: 'saputo',
    imperfetto: ['sapevo', 'sapevi', 'sapeva', 'sapevamo', 'sapevate', 'sapevano'],
    imperfectClass: 'ere'
  }],
  ['stare', {
    present: ['sto', 'stai', 'sta', 'stiamo', 'state', 'stanno'],
    remote: ['stetti', 'stesti', 'stette', 'stemmo', 'steste', 'stettero'],
    futureStem: 'star',
    congPresent: ['stia', 'stia', 'stia', 'stiamo', 'stiate', 'stiano'],
    congImperfetto: ['stessi', 'stessi', 'stesse', 'stessimo', 'steste', 'stessero'],
    imperative: ['sta', 'stia', 'stiamo', 'state', 'stiano'],
    participlePresent: 'stante', participlePasse: 'stato', auxiliary: 'essere',
    imperfectClass: 'are'
  }],
  ['dare', {
    present: ['do', 'dai', 'dà', 'diamo', 'date', 'danno'],
    remote: ['diedi', 'desti', 'diede', 'demmo', 'deste', 'diedero'],
    futureStem: 'dar',
    congPresent: ['dia', 'dia', 'dia', 'diamo', 'diate', 'diano'],
    congImperfetto: ['dessi', 'dessi', 'desse', 'dessimo', 'deste', 'dessero'],
    imperative: ['da', 'dia', 'diamo', 'date', 'diano'],
    participlePresent: 'dante', participlePasse: 'dato',
    imperfectClass: 'are'
  }],
  ['vedere', {
    present: ['vedo', 'vedi', 'vede', 'vediamo', 'vedete', 'vedono'],
    remote: ['vidi', 'vedesti', 'vide', 'vedemmo', 'vedeste', 'videro'],
    futureStem: 'vedr',
    congPresent: ['veda', 'veda', 'veda', 'vediamo', 'vediate', 'vedano'],
    congImperfetto: ['vedessi', 'vedessi', 'vedesse', 'vedessimo', 'vedeste', 'vedessero'],
    imperative: ['vedi', 'veda', 'vediamo', 'vedete', 'vedano'],
    participlePresent: 'vedente', participlePasse: 'visto',
    imperfectClass: 'ere'
  }],
  ['bere', {
    present: ['bevo', 'bevi', 'beve', 'beviamo', 'bevete', 'bevono'],
    remote: ['bevvi', 'bevesti', 'bevve', 'bevemmo', 'beveste', 'bevvero'],
    futureStem: 'berr',
    congPresent: ['beva', 'beva', 'beva', 'beviamo', 'beviate', 'bevano'],
    congImperfetto: ['bevessi', 'bevessi', 'bevesse', 'bevessimo', 'beveste', 'bevessero'],
    imperative: ['bevi', 'beva', 'beviamo', 'bevete', 'bevano'],
    participlePasse: 'bevuto',
    imperfectClass: 'ere'
  }],
  ['prendere', {
    present: ['prendo', 'prendi', 'prende', 'prendiamo', 'prendete', 'prendono'],
    remote: ['presi', 'prendesti', 'prese', 'prendemmo', 'prendeste', 'presero'],
    futureStem: 'prender',
    congPresent: ['prenda', 'prenda', 'prenda', 'prendiamo', 'prendiate', 'prendano'],
    congImperfetto: ['prendessi', 'prendessi', 'prendesse', 'prendessimo', 'prendeste', 'prendessero'],
    imperative: ['prendi', 'prenda', 'prendiamo', 'prendete', 'prendano'],
    participlePresent: 'prendente', participlePasse: 'preso',
    imperfectClass: 'ere'
  }],
  ['mettere', {
    present: ['metto', 'metti', 'mette', 'mettiamo', 'mettete', 'mettono'],
    remote: ['misi', 'mettesti', 'mise', 'mettemmo', 'metteste', 'misero'],
    futureStem: 'metter',
    congPresent: ['metta', 'metta', 'metta', 'mettiamo', 'mettiate', 'mettano'],
    congImperfetto: ['mettessi', 'mettessi', 'mettesse', 'mettessimo', 'metteste', 'mettessero'],
    imperative: ['metti', 'metta', 'mettiamo', 'mettete', 'mettano'],
    participlePresent: 'mettente', participlePasse: 'messo',
    imperfectClass: 'ere'
  }],
  ['leggere', {
    present: ['leggo', 'leggi', 'legge', 'leggiamo', 'leggete', 'leggono'],
    remote: ['lessi', 'leggesti', 'lesse', 'leggemmo', 'leggeste', 'lessero'],
    futureStem: 'legger',
    congPresent: ['legga', 'legga', 'legga', 'leggiamo', 'leggiate', 'leggano'],
    congImperfetto: ['leggessi', 'leggessi', 'leggesse', 'leggessimo', 'leggeste', 'leggessero'],
    imperative: ['leggi', 'legga', 'leggiamo', 'leggete', 'leggano'],
    participlePresent: 'leggente', participlePasse: 'letto',
    imperfectClass: 'ere'
  }],
  ['scrivere', {
    present: ['scrivo', 'scrivi', 'scrive', 'scriviamo', 'scrivete', 'scrivono'],
    remote: ['scrissi', 'scrivesti', 'scrisse', 'scrivemmo', 'scriveste', 'scrissero'],
    futureStem: 'scriver',
    congPresent: ['scriva', 'scriva', 'scriva', 'scriviamo', 'scriviate', 'scrivano'],
    congImperfetto: ['scrivessi', 'scrivessi', 'scrivesse', 'scrivessimo', 'scriveste', 'scrivessero'],
    imperative: ['scrivi', 'scriva', 'scriviamo', 'scrivete', 'scrivano'],
    participlePresent: 'scrivente', participlePasse: 'scritto',
    imperfectClass: 'ere'
  }],
  ['aprire', {
    present: ['apro', 'apri', 'apre', 'apriamo', 'aprite', 'aprono'],
    remote: ['aprii', 'apristi', 'aprì', 'aprimmo', 'apriste', 'aprirono'],
    futureStem: 'aprir',
    congPresent: ['apra', 'apra', 'apra', 'apriamo', 'apriate', 'aprano'],
    congImperfetto: ['aprissi', 'aprissi', 'aprisse', 'apressimo', 'apriste', 'apressero'],
    imperative: ['apri', 'apra', 'apriamo', 'aprite', 'aprano'],
    participlePresent: 'aprente', participlePasse: 'aperto',
    imperfectClass: 'ire'
  }],
  ['offrire', {
    present: ['offro', 'offri', 'offre', 'offriamo', 'offrite', 'offrono'],
    remote: ['offrii', 'offristi', 'offrì', 'offrimmo', 'offriste', 'offrirono'],
    futureStem: 'offrir',
    congPresent: ['offra', 'offra', 'offra', 'offriamo', 'offriate', 'offrano'],
    congImperfetto: ['offrissi', 'offrissi', 'offrisse', 'offrissimo', 'offriste', 'offrissero'],
    imperative: ['offri', 'offra', 'offriamo', 'offrite', 'offrano'],
    participlePresent: 'offerente', participlePasse: 'offerto',
    imperfectClass: 'ire'
  }],
  ['soffrire', {
    present: ['soffro', 'soffri', 'soffre', 'soffriamo', 'soffrite', 'soffrono'],
    remote: ['soffrii', 'soffristi', 'soffrì', 'soffrimmo', 'soffriste', 'soffrirono'],
    futureStem: 'soffrir',
    congPresent: ['soffra', 'soffra', 'soffra', 'soffriamo', 'soffriate', 'soffrano'],
    congImperfetto: ['soffrissi', 'soffrissi', 'soffrisse', 'soffrissimo', 'soffriste', 'soffrissero'],
    imperative: ['soffri', 'soffra', 'soffriamo', 'soffrite', 'soffrano'],
    participlePresent: 'sofferente', participlePasse: 'sofferto',
    imperfectClass: 'ire'
  }],
  ['morire', {
    present: ['muoio', 'muori', 'muore', 'moriamo', 'morite', 'muoiono'],
    remote: ['morii', 'moristi', 'morì', 'morimmo', 'moriste', 'morirono'],
    futureStem: 'morr',
    congPresent: ['muoia', 'muoia', 'muoia', 'moriamo', 'moriate', 'muoiano'],
    congImperfetto: ['morissi', 'morissi', 'morisse', 'morissimo', 'moriste', 'morissero'],
    imperative: ['muori', 'muoia', 'moriamo', 'morite', 'muoiano'],
    participlePresent: 'moriente', participlePasse: 'morto', auxiliary: 'essere',
    imperfectClass: 'ire'
  }],
  ['correre', {
    present: ['corro', 'corri', 'corre', 'corriamo', 'correte', 'corrono'],
    remote: ['corsi', 'corresti', 'corse', 'corremmo', 'correste', 'corsero'],
    futureStem: 'correr',
    congPresent: ['corra', 'corra', 'corra', 'corriamo', 'corriate', 'corrano'],
    congImperfetto: ['corressi', 'corressi', 'corresse', 'corressimo', 'correste', 'corressero'],
    imperative: ['corri', 'corra', 'corriamo', 'correte', 'corrano'],
    participlePresent: 'corrente', participlePasse: 'corso',
    imperfectClass: 'ere'
  }],
  ['scegliere', {
    present: ['scelgo', 'scegli', 'sceglie', 'scegliamo', 'scegliete', 'scelgono'],
    remote: ['scelsi', 'scegliesti', 'scelse', 'scegliemmo', 'sceglieste', 'scelsero'],
    futureStem: 'sceglier',
    congPresent: ['scelga', 'scelga', 'scelga', 'scegliamo', 'scegliate', 'scelgano'],
    congImperfetto: [
      'scegliessi',
      'scegliessi',
      'scegliesse',
      'scegliessimo',
      'sceglieste',
      'scegliessero'
    ],
    imperative: ['scegli', 'scelga', 'scegliamo', 'scegliete', 'scelgano'],
    participlePresent: 'scegliente', participlePasse: 'scelto',
    imperfectClass: 'ere'
  }],
  ['perdere', {
    present: ['perdo', 'perdi', 'perde', 'perdiamo', 'perdete', 'perdono'],
    remote: ['persi', 'perdesti', 'perse', 'perdemmo', 'perdeste', 'persero'],
    futureStem: 'perder',
    congPresent: ['perda', 'perda', 'perda', 'perdiamo', 'perdiate', 'perdano'],
    congImperfetto: ['perdessi', 'perdessi', 'perdesse', 'perdessimo', 'perdeste', 'perdessero'],
    imperative: ['perdi', 'perda', 'perdiamo', 'perdete', 'perdano'],
    participlePresent: 'perdente', participlePasse: 'perso',
    imperfectClass: 'ere'
  }],
  ['vincere', {
    present: ['vinco', 'vinci', 'vince', 'vinciamo', 'vincete', 'vincono'],
    remote: ['vinsi', 'vincesti', 'vinse', 'vincemmo', 'vinceste', 'vinsero'],
    futureStem: 'vincer',
    congPresent: ['vinca', 'vinca', 'vinca', 'vinciamo', 'vinciate', 'vincano'],
    congImperfetto: ['vincessi', 'vincessi', 'vincesse', 'vincessimo', 'vinceste', 'vincessero'],
    imperative: ['vinci', 'vinca', 'vinciamo', 'vincete', 'vincano'],
    participlePresent: 'vincente', participlePasse: 'vinto',
    imperfectClass: 'ere'
  }],
  ['piacere', {
    present: ['piaccio', 'piaci', 'piace', 'piacciamo', 'piacete', 'piacciono'],
    remote: ['piacqui', 'piacesti', 'piacque', 'piacemmo', 'piaceste', 'piacquero'],
    futureStem: 'piacer',
    congPresent: ['piaccia', 'piaccia', 'piaccia', 'piacciamo', 'piacciate', 'piacciano'],
    congImperfetto: ['piacessi', 'piacessi', 'piacesse', 'piacessimo', 'piaceste', 'piacessero'],
    imperative: ['piaci', 'piaccia', 'piacciamo', 'piacete', 'piacciano'],
    participlePresent: 'piacente', participlePasse: 'piaciuto', auxiliary: 'essere',
    imperfectClass: 'ere'
  }],
  ['vivere', {
    present: ['vivo', 'vivi', 'vive', 'viviamo', 'vivete', 'vivono'],
    remote: ['vissi', 'vivesti', 'visse', 'vivemmo', 'viveste', 'vissero'],
    futureStem: 'vivr',
    congPresent: ['viva', 'viva', 'viva', 'viviamo', 'vivate', 'vivano'],
    congImperfetto: ['vivessi', 'vivessi', 'vivesse', 'vivessimo', 'viveste', 'vivessero'],
    imperative: ['vivi', 'viva', 'viviamo', 'vivete', 'vivano'],
    participlePresent: 'vivente', participlePasse: 'vissuto',
    imperfectClass: 'ere'
  }],
  ['nascere', {
    present: ['nasco', 'nasci', 'nasce', 'nasciamo', 'nascete', 'nascono'],
    remote: ['nacqui', 'nascesti', 'nacque', 'nascemmo', 'nasceste', 'nacquero'],
    futureStem: 'nascer',
    congPresent: ['nasca', 'nasca', 'nasca', 'nasciamo', 'nasciate', 'nascano'],
    congImperfetto: ['nascessi', 'nascessi', 'nascesse', 'nascessimo', 'nasceste', 'nascessero'],
    imperative: ['nasci', 'nasca', 'nasciamo', 'nascete', 'nascano'],
    participlePresent: 'nascente', participlePasse: 'nato', auxiliary: 'essere',
    imperfectClass: 'ere'
  }],
  ['crescere', {
    present: ['cresco', 'cresci', 'cresce', 'cresciamo', 'crescete', 'crescono'],
    remote: ['crebbi', 'crescesti', 'crebbe', 'crescemmo', 'cresceste', 'crebbero'],
    futureStem: 'crescer',
    congPresent: ['cresca', 'cresca', 'cresca', 'cresciamo', 'cresciate', 'crescano'],
    congImperfetto: ['crescessi', 'crescessi', 'crescesse', 'crescessimo', 'cresceste', 'crescessero'],
    imperative: ['cresci', 'cresca', 'cresciamo', 'crescete', 'crescano'],
    participlePresent: 'crescente', participlePasse: 'cresciuto', auxiliary: 'essere',
    imperfectClass: 'ere'
  }],
  ['uscire', {
    present: ['esco', 'esci', 'esce', 'usciamo', 'uscite', 'escono'],
    remote: ['uscii', 'uscisti', 'uscì', 'uscimmo', 'usciste', 'uscirono'],
    futureStem: 'uscir',
    congPresent: ['esca', 'esca', 'esca', 'usciamo', 'usciate', 'escano'],
    congImperfetto: ['uscissi', 'uscissi', 'uscisse', 'uscissimo', 'usciste', 'uscissero'],
    imperative: ['esci', 'esca', 'usciamo', 'uscite', 'escano'],
    participlePresent: 'uscente', participlePasse: 'uscito', auxiliary: 'essere',
    imperfectClass: 'ire'
  }],
  ['salire', {
    present: ['salgo', 'sali', 'sale', 'saliamo', 'salite', 'salgono'],
    remote: ['salii', 'salisti', 'salì', 'salimmo', 'saliste', 'salirono'],
    futureStem: 'salir',
    congPresent: ['salga', 'salga', 'salga', 'saliamo', 'saliate', 'salgano'],
    congImperfetto: ['salissi', 'salissi', 'salisse', 'salissimo', 'saliste', 'salissero'],
    imperative: ['sali', 'salga', 'saliamo', 'salite', 'salgano'],
    participlePresent: 'salente', participlePasse: 'salito', auxiliary: 'essere',
    imperfectClass: 'ire'
  }],
  ['scendere', {
    present: ['scendo', 'scendi', 'scende', 'scendiamo', 'scendete', 'scendono'],
    remote: ['scesi', 'scendesti', 'scese', 'scendemmo', 'scendeste', 'scesero'],
    futureStem: 'scender',
    congPresent: ['scenda', 'scenda', 'scenda', 'scendiamo', 'scendiate', 'scendano'],
    congImperfetto: ['scendessi', 'scendessi', 'scendesse', 'scendessimo', 'scendeste', 'scendessero'],
    imperative: ['scendi', 'scenda', 'scendiamo', 'scendete', 'scendano'],
    participlePresent: 'scendente', participlePasse: 'sceso', auxiliary: 'essere',
    imperfectClass: 'ere'
  }],
  ['rimanere', {
    present: ['rimango', 'rimani', 'rimane', 'rimaniamo', 'rimanete', 'rimangono'],
    remote: ['rimasi', 'rimanesti', 'rimase', 'rimanemmo', 'rimaneste', 'rimasero'],
    futureStem: 'rimarr',
    congPresent: ['rimanga', 'rimanga', 'rimanga', 'rimaniamo', 'rimaniate', 'rimangano'],
    congImperfetto: ['rimanessi', 'rimanessi', 'rimanesse', 'rimanessimo', 'rimaneste', 'rimanessero'],
    imperative: ['rimani', 'rimanga', 'rimaniamo', 'rimanete', 'rimangano'],
    participlePresent: 'rimanente', participlePasse: 'rimasto', auxiliary: 'essere',
    imperfectClass: 'ere'
  }],
  ['conoscere', {
    present: ['conosco', 'conosci', 'conosce', 'conosciamo', 'conoscete', 'conoscono'],
    remote: ['conobbi', 'conoscesti', 'conobbe', 'conoscemmo', 'conosceste', 'conobbero'],
    futureStem: 'conoscer',
    congPresent: ['conosca', 'conosca', 'conosca', 'conosciamo', 'conosciate', 'conoscano'],
    congImperfetto: [
      'conoscessi',
      'conoscessi',
      'conoscesse',
      'conoscessimo',
      'conosceste',
      'conoscessero'
    ],
    imperative: ['conosci', 'conosca', 'conosciamo', 'conoscete', 'conoscano'],
    participlePresent: 'conoscente', participlePasse: 'conosciuto',
    imperfectClass: 'ere'
  }],
  ['tradurre', {
    present: ['traduco', 'traduci', 'traduce', 'traduciamo', 'traducete', 'traducono'],
    remote: ['tradussi', 'traducesti', 'tradusse', 'traducemmo', 'traduceste', 'tradussero'],
    futureStem: 'tradurr',
    congPresent: ['traduca', 'traduca', 'traduca', 'traduciamo', 'traduciate', 'traducano'],
    congImperfetto: [
      'traducessi',
      'traducessi',
      'traducesse',
      'traducessimo',
      'traduceste',
      'traducessero'
    ],
    imperative: ['traduci', 'traduca', 'traduciamo', 'traducete', 'traducano'],
    participlePresent: 'traducente', participlePasse: 'tradotto',
    imperfectClass: 'ere'
  }],
  ['tenere', {
    present: ['tengo', 'tieni', 'tiene', 'teniamo', 'tenete', 'tengono'],
    remote: ['tenni', 'tenesti', 'tenne', 'tenemmo', 'teneste', 'tennero'],
    futureStem: 'terr',
    congPresent: ['tenga', 'tenga', 'tenga', 'teniamo', 'teniate', 'tengano'],
    congImperfetto: ['tenessi', 'tenessi', 'tenesse', 'tenessimo', 'teneste', 'tenessero'],
    imperative: ['tieni', 'tenga', 'teniamo', 'tenete', 'tengano'],
    participlePresent: 'tenente', participlePasse: 'tenuto',
    imperfectClass: 'ere'
  }],
  ['cadere', {
    present: ['cado', 'cadi', 'cade', 'cadiamo', 'cadete', 'cadono'],
    remote: ['caddi', 'cadesti', 'cadde', 'cademmo', 'cadeste', 'caddero'],
    futureStem: 'cadr',
    congPresent: ['cada', 'cada', 'cada', 'cadiamo', 'cadiate', 'cadano'],
    congImperfetto: ['cadessi', 'cadessi', 'cadesse', 'cadessimo', 'cadeste', 'cadessero'],
    imperative: ['cadi', 'cada', 'cadiamo', 'cadete', 'cadano'],
    participlePresent: 'cadente', participlePasse: 'caduto', auxiliary: 'essere',
    imperfectClass: 'ere'
  }]
])
