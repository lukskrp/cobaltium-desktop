import type {
  InflectionEngine,
  InflectionParadigm,
  ParadigmRow,
  ParadigmTable
} from '../inflection'

/**
 * Bundled Spanish (es) inflector: deterministic, offline LangDex paradigms.
 *
 * Verbs:
 * - Regular -ar/-er/-ir full conjugation (10 tables) with:
 *   - orthographic spelling rules that preserve pronunciation (-car/-gar/-zar
 *     in preterite 1sg and subjunctive, -ger/-gir -> -jo/-ja, -guir/-quir ->
 *     -go/-co, -cer/-cir -> -zco/-zo, -uir y-insertion),
 *   - stem changes (e->ie, o->ue, e->i, u->ue) via a curated map, including
 *     the -ir preterite 3rd-person and gerund changes (pidió, durmió,
 *     prefirió/prefiriendo) and subjunctive nosotros/vosotros behavior,
 *   - irregular participles (vuelto, muerto, abierto, ...).
 * - Curated full-table irregulars: ser, estar, ir, haber, tener, hacer, poder,
 *   decir, venir, ver, dar, saber, querer, poner, salir, traer, oír, caer,
 *   andar, caber, valer, reír.
 *
 * Nouns/adjectives: Spanish has no nominal case system, so "declension" is
 * number (plural rules, incl. -z -> -ces and -ión -> -iones) and, for
 * adjectives, gender agreement rows.
 *
 * Unhandled words return null so the caller falls back to the LLM tier.
 */
export const SpanishInflector: InflectionEngine = {
  engine: 'es-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'es') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(word)
      case 'declension':
        return decline(word, pos)
      default: {
        if ((pos == null || pos.trim() === '') && looksLikeVerb(word)) {
          return conjugate(word) ?? decline(word, null)
        }
        if (pos == null || pos.trim() === '') return decline(word, null)
        return {
          lemma,
          lang: 'es',
          kind: null,
          note: 'Adverbs and function words do not inflect in Spanish.',
          tables: []
        }
      }
    }
  }
}

function classify(pos: string | null): 'conjugation' | 'declension' | null {
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
    case 'conjunction':
    case 'interjection':
    case 'particle':
      return null
    default:
      return null
  }
}

// ── Verbs ───────────────────────────────────────────────────────────────

function looksLikeVerb(word: string): boolean {
  return word.length >= 2 && (word.endsWith('ar') || word.endsWith('er') || word.endsWith('ir'))
}

function conjugate(word: string): InflectionParadigm | null {
  const irregular = IRREGULARS[word]
  if (irregular) return irregularParadigm(word, irregular)
  if (!looksLikeVerb(word)) return null
  return regularParadigm(word)
}

function regularParadigm(inf: string): InflectionParadigm {
  const stem = inf.slice(0, -2)
  const ending = inf.slice(-2)
  const e = ENDINGS[ending]
  const change = STEM_CHANGES[inf]
  const ortho = orthoClass(inf)
  const participle = participleOf(stem, ending, inf)
  return paradigm({
    infinitive: inf,
    present: presentForms(stem, ending, e, change, ortho),
    preterite: preteriteForms(stem, ending, e, change, ortho),
    imperfect: e.imperfect.map((it) => stem + it),
    future: FUTURE_ENDINGS.map((it) => inf + it),
    conditional: CONDITIONAL_ENDINGS.map((it) => inf + it),
    perfect: PERFECT_AUX.map((it) => `${it} ${participle}`),
    pluperfect: HABIA_AUX.map((it) => `${it} ${participle}`),
    subjPresent: subjPresentForms(stem, ending, e, change, ortho),
    subjImperfect: e.subjImperfect.map((it) => stem + it),
    imperative: imperativeForms(stem, ending, e, change, ortho),
    gerund: gerundOf(stem, ending, change, ortho),
    participle
  })
}

/** Present indicative: stressed slots (1sg/2sg/3sg/3pl) take the changed
 *  stem; nosotros/vosotros always keep the original stem. */
function presentForms(
  stem: string,
  _ending: string,
  e: Endings,
  change: StemChange | undefined,
  ortho: Ortho
): string[] {
  const forms = e.present.map((it) => stem + it)
  if (ortho === 'UIR') {
    // -uir inserts y before every ending except nosotros/vosotros.
    forms[0] = stem + 'yo'
    forms[1] = stem + 'yes'
    forms[2] = stem + 'ye'
    forms[3] = stem + 'imos'
    forms[4] = stem + 'ís'
    forms[5] = stem + 'yen'
    return forms
  }
  const changed = change?.stem ?? stem
  // 1sg: pronunciation-preserving changes apply (cojo, conozco, sigo);
  // -car/-gar/-zar keep the plain stem in the present (busco, almuerzo).
  forms[0] = orthoChangesPresent(ortho) ? orthoTransform(changed, ortho) + 'o' : changed + 'o'
  if (change != null) {
    forms[1] = change.stem + e.present[1]
    forms[2] = change.stem + e.present[2]
    forms[5] = change.stem + e.present[5]
  }
  return forms
}

/** Present subjunctive. -ir stem changers shift to the strong stem in ALL
 *  persons (pidamos, durmamos, prefiramos); -ar/-er changers revert to the
 *  original stem for nosotros/vosotros (pensemos, volvamos), with any
 *  orthographic change still applied (empecemos, roguemos). */
function subjPresentForms(
  stem: string,
  ending: string,
  e: Endings,
  change: StemChange | undefined,
  ortho: Ortho
): string[] {
  const changed = change?.stem ?? stem
  const allBase = orthoTransform(changed, ortho)
  const nosotrosBase =
    change != null && ending === 'ir'
      ? orthoTransform(change.preteriteStem ?? change.stem, ortho)
      : orthoTransform(stem, ortho)
  return e.subjPresent.map((suffix, i) => {
    if (i === 3 || i === 4) return nosotrosBase + suffix
    return allBase + suffix
  })
}

/** Preterite: 1sg spelling changes (-car/-gar/-zar), -uir y-insertion in
 *  3rd person, and the -ir stem change in 3rd person (pidió, durmió). */
function preteriteForms(
  stem: string,
  _ending: string,
  e: Endings,
  change: StemChange | undefined,
  ortho: Ortho
): string[] {
  const forms = e.preterite.map((it) => stem + it)
  switch (ortho) {
    case 'CAR':
    case 'GAR':
    case 'ZAR':
      forms[0] = orthoTransform(stem, ortho) + 'é'
      break
    case 'UIR':
      forms[2] = stem + 'yó'
      forms[5] = stem + 'yeron'
      break
    default:
      break
  }
  if (change?.preteriteStem != null) {
    const ps = change.preteriteStem
    forms[2] = ps + e.preterite[2]
    forms[5] = ps + e.preterite[5]
  }
  return forms
}

/** Imperative: tú = 3sg present, usted/nosotros/ustedes = subjunctive
 *  persons, vosotros = original stem + -ad/-ed/-id (pensad, pedid). */
function imperativeForms(
  stem: string,
  ending: string,
  e: Endings,
  change: StemChange | undefined,
  ortho: Ortho
): string[] {
  const present = presentForms(stem, ending, e, change, ortho)
  const subj = subjPresentForms(stem, ending, e, change, ortho)
  return [
    present[2],
    subj[2],
    subj[3],
    stem + VOSOTROS_IMPERATIVE[ending],
    subj[5]
  ]
}

function gerundOf(stem: string, ending: string, change: StemChange | undefined, ortho: Ortho): string {
  if (ortho === 'UIR') return stem + 'yendo'
  if (change?.preteriteStem != null) return change.preteriteStem + 'iendo'
  return stem + GERUNDS[ending]
}

function participleOf(stem: string, ending: string, inf: string): string {
  return IRREGULAR_PARTICIPLES[inf] ?? stem + PARTICIPLES[ending]
}

/** Spelling changes that apply to every person of the tenses where they appear. */
function orthoTransform(stem: string, ortho: Ortho): string {
  switch (ortho) {
    case 'CAR':
      return stem.slice(0, -1) + 'qu'
    case 'GAR':
      return stem.slice(0, -1) + 'gu'
    case 'ZAR':
      return stem.slice(0, -1) + 'c'
    case 'GER':
    case 'GIR':
      return stem.slice(0, -1) + 'j'
    case 'GUIR':
      return stem.slice(0, -1) // seguir -> sig- (drop u before o/a: sigo, siga)
    case 'QUIR':
      return stem.slice(0, -2) + 'c' // delinquir -> delinc- (drop u, q -> c)
    case 'CER_CIR': {
      const core = stem.slice(0, -1)
      const last = core.charAt(core.length - 1)
      return last !== '' && VOWELS.includes(last) ? core + 'zc' : core + 'z'
    }
    case 'UIR':
      return stem + 'y'
    case 'NONE':
      return stem
  }
}

function orthoClass(inf: string): Ortho {
  if (inf.endsWith('car')) return 'CAR'
  if (inf.endsWith('gar')) return 'GAR'
  if (inf.endsWith('zar')) return 'ZAR'
  if (inf.endsWith('ger')) return 'GER'
  if (inf.endsWith('gir')) return 'GIR'
  if (inf.endsWith('guir')) return 'GUIR'
  if (inf.endsWith('quir')) return 'QUIR'
  if (inf.endsWith('cer') || inf.endsWith('cir')) return 'CER_CIR'
  if (inf.endsWith('uir')) return 'UIR'
  return 'NONE'
}

function irregularParadigm(inf: string, v: Irregular): InflectionParadigm {
  return paradigm({
    infinitive: inf,
    present: v.present,
    preterite: v.preterite,
    imperfect: v.imperfect,
    future: FUTURE_ENDINGS.map((it) => v.futureStem + it),
    conditional: CONDITIONAL_ENDINGS.map((it) => v.futureStem + it),
    perfect: PERFECT_AUX.map((it) => `${it} ${v.participle}`),
    pluperfect: HABIA_AUX.map((it) => `${it} ${v.participle}`),
    subjPresent: v.subjPresent,
    subjImperfect: v.subjImperfect,
    imperative: v.imperative,
    gerund: v.gerund,
    participle: v.participle
  })
}

interface ConjugationTables {
  infinitive: string
  present: string[]
  preterite: string[]
  imperfect: string[]
  future: string[]
  conditional: string[]
  perfect: string[]
  pluperfect: string[]
  subjPresent: string[]
  subjImperfect: string[]
  imperative: string[]
  gerund: string
  participle: string
}

/** Assembles the standard 11-table Spanish conjugation layout. */
function paradigm(t: ConjugationTables): InflectionParadigm {
  return {
    lemma: t.infinitive,
    lang: 'es',
    kind: 'conjugation',
    note: '',
    tables: [
      finite('Presente', t.present),
      finite('Pretérito perfecto simple', t.preterite),
      finite('Pretérito imperfecto', t.imperfect),
      finite('Futuro simple', t.future),
      finite('Condicional simple', t.conditional),
      finite('Pretérito perfecto compuesto', t.perfect),
      finite('Pluscuamperfecto', t.pluperfect),
      finite('Presente de subjuntivo', t.subjPresent),
      finite('Pretérito imperfecto de subjuntivo', t.subjImperfect),
      {
        title: 'Imperativo',
        columns: ['Forma'],
        rows: IMPERATIVE_LABELS.map((label, i) => ({ label, cells: [t.imperative[i]] }))
      },
      {
        title: 'Formas no personales',
        columns: ['Forma'],
        rows: [
          { label: 'Infinitivo', cells: [t.infinitive] },
          { label: 'Gerundio', cells: [t.gerund] },
          { label: 'Participio', cells: [t.participle] }
        ]
      }
    ]
  }
}

function finite(title: string, forms: string[]): ParadigmTable {
  return {
    title,
    columns: ['Forma'],
    rows: PERSONS.map((person, i): ParadigmRow => ({ label: person, cells: [forms[i]] }))
  }
}

// ── Nouns & adjectives ──────────────────────────────────────────────────

function decline(word: string, pos: string | null): InflectionParadigm {
  if (pos?.toLowerCase() === 'adjective') {
    const feminine = word.endsWith('o') ? word.slice(0, -1) + 'a' : word
    const note =
      feminine === word
        ? 'Invariable in gender (same form for masculine and feminine).'
        : ''
    return {
      lemma: word,
      lang: 'es',
      kind: 'declension',
      note,
      tables: [
        {
          title: 'Número y género',
          columns: ['Singular', 'Plural'],
          rows: [
            { label: 'Masculino', cells: [word, pluralize(word)] },
            { label: 'Femenino', cells: [feminine, pluralize(feminine)] }
          ]
        }
      ]
    }
  }
  return {
    lemma: word,
    lang: 'es',
    kind: 'declension',
    note: 'Spanish nouns do not decline for case; number is marked by the plural.',
    tables: [
      {
        title: 'Número',
        columns: ['Singular', 'Plural'],
        rows: [{ label: 'Forma', cells: [word, pluralize(word)] }]
      }
    ]
  }
}

/** Learner-grade Spanish plural: gato/s, ciudad/es, lápiz->lápices, canción->canciones,
 *  café->cafés, lunes unchanged, país->países, autobús->autobuses. */
function pluralize(word: string): string {
  const last = word.charAt(word.length - 1)
  if (word.endsWith('z')) return word.slice(0, -1) + 'ces'
  if (word.endsWith('ión')) return word.slice(0, -3) + 'iones'
  if (last === 's') {
    if (word.length > 1 && 'áéíóú'.includes(word.charAt(word.length - 2))) {
      return word.slice(0, -1) + 'es' // país, inglés
    }
    if (word.length > 1 && 'aeiou'.includes(word.charAt(word.length - 2))) return word // lunes, martes
    return word + 'es' // autobús, compás
  }
  if (last === 'x') return word
  if (last === 'á' || last === 'é' || last === 'ó') return word + 's' // café
  if (last === 'í' || last === 'ú') return word + 'es' // rubí, tabú
  if ('aeiou'.includes(last)) return word + 's'
  return word + 'es'
}

// ── Data ────────────────────────────────────────────────────────────────

const PERSONS = [
  'yo',
  'tú',
  'él/ella/usted',
  'nosotros/as',
  'vosotros/as',
  'ellos/ellas/ustedes'
]

const IMPERATIVE_LABELS = ['tú', 'usted', 'nosotros/as', 'vosotros/as', 'ustedes']

const VOWELS = 'aeiouáéíóú'

const FUTURE_ENDINGS = ['é', 'ás', 'á', 'emos', 'éis', 'án']
const CONDITIONAL_ENDINGS = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían']
const PERFECT_AUX = ['he', 'has', 'ha', 'hemos', 'habéis', 'han']
const HABIA_AUX = ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían']

const PARTICIPLES: Record<string, string> = { ar: 'ado', er: 'ido', ir: 'ido' }
const GERUNDS: Record<string, string> = { ar: 'ando', er: 'iendo', ir: 'iendo' }
const VOSOTROS_IMPERATIVE: Record<string, string> = { ar: 'ad', er: 'ed', ir: 'id' }

interface Endings {
  present: string[]
  preterite: string[]
  imperfect: string[]
  subjPresent: string[]
  subjImperfect: string[]
  imperative: string[]
}

const ENDINGS: Record<string, Endings> = {
  ar: {
    present: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    preterite: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
    imperfect: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
    subjPresent: ['e', 'es', 'e', 'emos', 'éis', 'en'],
    subjImperfect: ['ara', 'aras', 'ara', 'áramos', 'arais', 'aran'],
    imperative: ['a', 'e', 'emos', 'ad', 'en']
  },
  er: {
    present: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    preterite: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    imperfect: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    subjPresent: ['a', 'as', 'a', 'amos', 'áis', 'an'],
    subjImperfect: ['iera', 'ieras', 'iera', 'iéramos', 'ierais', 'ieran'],
    imperative: ['e', 'a', 'amos', 'ed', 'an']
  },
  ir: {
    present: ['o', 'es', 'e', 'imos', 'ís', 'en'],
    preterite: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    imperfect: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    subjPresent: ['a', 'as', 'a', 'amos', 'áis', 'an'],
    subjImperfect: ['iera', 'ieras', 'iera', 'iéramos', 'ierais', 'ieran'],
    imperative: ['e', 'a', 'amos', 'id', 'an']
  }
}

/** Orthographic (spelling-preserving) verb classes. `changesPresent` marks
 *  classes whose 1sg present also changes (cojo, conozco) — -car/-gar/-zar
 *  only change preterite 1sg and the subjunctive (busco but busqué/busque). */
type Ortho = 'NONE' | 'CAR' | 'GAR' | 'ZAR' | 'GER' | 'GIR' | 'GUIR' | 'QUIR' | 'CER_CIR' | 'UIR'

const ORTHO_CHANGES_PRESENT: Record<Ortho, boolean> = {
  NONE: false,
  CAR: false,
  GAR: false,
  ZAR: false,
  GER: true,
  GIR: true,
  GUIR: true,
  QUIR: true,
  CER_CIR: true,
  UIR: true
}

function orthoChangesPresent(ortho: Ortho): boolean {
  return ORTHO_CHANGES_PRESENT[ortho]
}

/** A stem-changing verb. `stem` is the changed stem for the stressed present
 *  slots, the whole subjunctive (except -ar/-er nosotros/vosotros), and the
 *  tú/usted/ustedes imperative. `preteriteStem` is the strong stem used by
 *  -ir verbs in preterite 3rd person and the gerund (pidió, pidiendo). */
interface StemChange {
  stem: string
  preteriteStem: string | null
}

function sc(stem: string, preteriteStem: string | null = null): StemChange {
  return { stem, preteriteStem }
}

/** Common stem-changing verbs. Excludes verbs already in {@link IRREGULARS}
 *  (poder, querer) and verbs whose nosotros subjunctive spelling would need
 *  extra rules (rare -car/-gar stem changers like trocar). */
const STEM_CHANGES: Record<string, StemChange> = {
  // e -> ie, -ar/-er: no preterite/gerund change
  pensar: sc('piens'),
  empezar: sc('empiez'),
  comenzar: sc('comienz'),
  cerrar: sc('cierr'),
  despertar: sc('despiert'),
  sentar: sc('sient'),
  merendar: sc('meriend'),
  nevar: sc('niev'),
  tropezar: sc('tropiez'),
  recomendar: sc('recomiend'),
  calentar: sc('calient'),
  perder: sc('pierd'),
  entender: sc('entiend'),
  encender: sc('enciend'),
  defender: sc('defiend'),
  atender: sc('atiend'),
  // o -> ue, -ar/-er: no preterite/gerund change (jugar: u -> ue, same pattern)
  volver: sc('vuelv'),
  devolver: sc('devuelv'),
  resolver: sc('resuelv'),
  encontrar: sc('encuentr'),
  contar: sc('cuent'),
  costar: sc('cuest'),
  mostrar: sc('muestr'),
  recordar: sc('recuerd'),
  probar: sc('prueb'),
  rogar: sc('rueg'),
  volar: sc('vuel'),
  morder: sc('muerd'),
  mover: sc('muev'),
  doler: sc('duel'),
  llover: sc('lluev'),
  soñar: sc('sueñ'),
  colgar: sc('cuelg'),
  soltar: sc('suelt'),
  almorzar: sc('almuerz'),
  jugar: sc('jueg'),
  acordar: sc('acuerd'),
  aprobar: sc('aprueb'),
  demostrar: sc('demuestr'),
  renovar: sc('renuev'),
  // e -> i, -ir: preterite 3rd + gerund change (pidió, pidiendo)
  pedir: sc('pid', 'pid'),
  servir: sc('sirv', 'sirv'),
  repetir: sc('repit', 'repit'),
  vestir: sc('vist', 'vist'),
  despedir: sc('despid', 'despid'),
  medir: sc('mid', 'mid'),
  impedir: sc('impid', 'impid'),
  seguir: sc('sigu', 'sigu'),
  conseguir: sc('consigu', 'consigu'),
  perseguir: sc('persigu', 'persigu'),
  proseguir: sc('prosigu', 'prosigu'),
  corregir: sc('corrig', 'corrig'),
  elegir: sc('elig', 'elig'),
  // e -> ie, -ir: preterite 3rd e->i + gerund change (prefirió, prefiriendo)
  sentir: sc('sient', 'sint'),
  mentir: sc('mient', 'mint'),
  preferir: sc('prefier', 'prefir'),
  divertir: sc('diviert', 'divirt'),
  hervir: sc('hierv', 'hirv'),
  consentir: sc('consient', 'consint'),
  presentir: sc('presient', 'presint'),
  sugerir: sc('sugier', 'sugir'),
  convertir: sc('conviert', 'convirt'),
  invertir: sc('inviert', 'invirt'),
  advertir: sc('adviert', 'advirt'),
  // o -> ue, -ir: present keeps the diphthong (duermo), preterite 3rd and
  // the gerund shift to plain o->u (durmió, durmiendo)
  dormir: sc('duerm', 'durm'),
  morir: sc('muer', 'mur')
}

/** Irregular past participles (regular stem + -ado/-ido would be wrong). */
const IRREGULAR_PARTICIPLES: Record<string, string> = {
  volver: 'vuelto',
  devolver: 'devuelto',
  resolver: 'resuelto',
  absolver: 'absuelto',
  disolver: 'disuelto',
  morir: 'muerto',
  abrir: 'abierto',
  cubrir: 'cubierto',
  descubrir: 'descubierto',
  escribir: 'escrito',
  describir: 'descrito',
  romper: 'roto'
}

interface Irregular {
  present: string[]
  preterite: string[]
  imperfect: string[]
  futureStem: string
  subjPresent: string[]
  subjImperfect: string[]
  imperative: string[]
  gerund: string
  participle: string
}

/** Irregular verbs: present, preterite, imperfect, future stem, present
 *  subjunctive, past subjunctive, imperative (tú/usted/nosotros/vosotros/
 *  ustedes), gerund, participle. */
const IRREGULARS: Record<string, Irregular> = {
  ser: {
    present: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperfect: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    futureStem: 'ser',
    subjPresent: ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean'],
    subjImperfect: ['fuera', 'fueras', 'fuera', 'fuéramos', 'fuerais', 'fueran'],
    imperative: ['sé', 'sea', 'seamos', 'sed', 'sean'],
    gerund: 'siendo',
    participle: 'sido'
  },
  estar: {
    present: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    preterite: ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvisteis', 'estuvieron'],
    imperfect: ['estaba', 'estabas', 'estaba', 'estábamos', 'estabais', 'estaban'],
    futureStem: 'estar',
    subjPresent: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'],
    subjImperfect: ['estuviera', 'estuvieras', 'estuviera', 'estuviéramos', 'estuvierais', 'estuvieran'],
    imperative: ['está', 'esté', 'estemos', 'estad', 'estén'],
    gerund: 'estando',
    participle: 'estado'
  },
  ir: {
    present: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    imperfect: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    futureStem: 'ir',
    subjPresent: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan'],
    subjImperfect: ['fuera', 'fueras', 'fuera', 'fuéramos', 'fuerais', 'fueran'],
    imperative: ['ve', 'vaya', 'vayamos', 'id', 'vayan'],
    gerund: 'yendo',
    participle: 'ido'
  },
  haber: {
    present: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
    preterite: ['hube', 'hubiste', 'hubo', 'hubimos', 'hubisteis', 'hubieron'],
    imperfect: ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían'],
    futureStem: 'habr',
    subjPresent: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
    subjImperfect: ['hubiera', 'hubieras', 'hubiera', 'hubiéramos', 'hubierais', 'hubieran'],
    imperative: ['he', 'haya', 'hayamos', 'habed', 'hayan'],
    gerund: 'habiendo',
    participle: 'habido'
  },
  tener: {
    present: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
    preterite: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron'],
    imperfect: ['tenía', 'tenías', 'tenía', 'teníamos', 'teníais', 'tenían'],
    futureStem: 'tendr',
    subjPresent: ['tenga', 'tengas', 'tenga', 'tengamos', 'tengáis', 'tengan'],
    subjImperfect: ['tuviera', 'tuvieras', 'tuviera', 'tuviéramos', 'tuvierais', 'tuvieran'],
    imperative: ['ten', 'tenga', 'tengamos', 'tened', 'tengan'],
    gerund: 'teniendo',
    participle: 'tenido'
  },
  hacer: {
    present: ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
    preterite: ['hice', 'hiciste', 'hizo', 'hicimos', 'hicisteis', 'hicieron'],
    imperfect: ['hacía', 'hacías', 'hacía', 'hacíamos', 'hacíais', 'hacían'],
    futureStem: 'har',
    subjPresent: ['haga', 'hagas', 'haga', 'hagamos', 'hagáis', 'hagan'],
    subjImperfect: ['hiciera', 'hicieras', 'hiciera', 'hiciéramos', 'hicierais', 'hicieran'],
    imperative: ['haz', 'haga', 'hagamos', 'haced', 'hagan'],
    gerund: 'haciendo',
    participle: 'hecho'
  },
  poder: {
    present: ['puedo', 'puedes', 'puede', 'podemos', 'podéis', 'pueden'],
    preterite: ['pude', 'pudiste', 'pudo', 'pudimos', 'pudisteis', 'pudieron'],
    imperfect: ['podía', 'podías', 'podía', 'podíamos', 'podíais', 'podían'],
    futureStem: 'podr',
    subjPresent: ['pueda', 'puedas', 'pueda', 'podamos', 'podáis', 'puedan'],
    subjImperfect: ['pudiera', 'pudieras', 'pudiera', 'pudiéramos', 'pudierais', 'pudieran'],
    imperative: ['puede', 'pueda', 'podamos', 'poded', 'puedan'],
    gerund: 'pudiendo',
    participle: 'podido'
  },
  decir: {
    present: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
    preterite: ['dije', 'dijiste', 'dijo', 'dijimos', 'dijisteis', 'dijeron'],
    imperfect: ['decía', 'decías', 'decía', 'decíamos', 'decíais', 'decían'],
    futureStem: 'dir',
    subjPresent: ['diga', 'digas', 'diga', 'digamos', 'digáis', 'digan'],
    subjImperfect: ['dijera', 'dijeras', 'dijera', 'dijéramos', 'dijerais', 'dijeran'],
    imperative: ['di', 'diga', 'digamos', 'decid', 'digan'],
    gerund: 'diciendo',
    participle: 'dicho'
  },
  venir: {
    present: ['vengo', 'vienes', 'viene', 'venimos', 'venís', 'vienen'],
    preterite: ['vine', 'viniste', 'vino', 'vinimos', 'vinisteis', 'vinieron'],
    imperfect: ['venía', 'venías', 'venía', 'veníamos', 'veníais', 'venían'],
    futureStem: 'vendr',
    subjPresent: ['venga', 'vengas', 'venga', 'vengamos', 'vengáis', 'vengan'],
    subjImperfect: ['viniera', 'vinieras', 'viniera', 'viniéramos', 'vinierais', 'vinieran'],
    imperative: ['ven', 'venga', 'vengamos', 'venid', 'vengan'],
    gerund: 'viniendo',
    participle: 'venido'
  },
  ver: {
    present: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
    preterite: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'],
    imperfect: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
    futureStem: 'ver',
    subjPresent: ['vea', 'veas', 'vea', 'veamos', 'veáis', 'vean'],
    subjImperfect: ['viera', 'vieras', 'viera', 'viéramos', 'vierais', 'vieran'],
    imperative: ['ve', 'vea', 'veamos', 'ved', 'vean'],
    gerund: 'viendo',
    participle: 'visto'
  },
  dar: {
    present: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
    preterite: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
    imperfect: ['daba', 'dabas', 'daba', 'dábamos', 'dabais', 'daban'],
    futureStem: 'dar',
    subjPresent: ['dé', 'des', 'dé', 'demos', 'deis', 'den'],
    subjImperfect: ['diera', 'dieras', 'diera', 'diéramos', 'dierais', 'dieran'],
    imperative: ['da', 'dé', 'demos', 'dad', 'den'],
    gerund: 'dando',
    participle: 'dado'
  },
  saber: {
    present: ['sé', 'sabes', 'sabe', 'sabemos', 'sabéis', 'saben'],
    preterite: ['supe', 'supiste', 'supo', 'supimos', 'supisteis', 'supieron'],
    imperfect: ['sabía', 'sabías', 'sabía', 'sabíamos', 'sabíais', 'sabían'],
    futureStem: 'sabr',
    subjPresent: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan'],
    subjImperfect: ['supiera', 'supieras', 'supiera', 'supiéramos', 'supierais', 'supieran'],
    imperative: ['sabe', 'sepa', 'sepamos', 'sabed', 'sepan'],
    gerund: 'sabiendo',
    participle: 'sabido'
  },
  querer: {
    present: ['quiero', 'quieres', 'quiere', 'queremos', 'queréis', 'quieren'],
    preterite: ['quise', 'quisiste', 'quiso', 'quisimos', 'quisisteis', 'quisieron'],
    imperfect: ['quería', 'querías', 'quería', 'queríamos', 'queríais', 'querían'],
    futureStem: 'querr',
    subjPresent: ['quiera', 'quieras', 'quiera', 'queramos', 'queráis', 'quieran'],
    subjImperfect: ['quisiera', 'quisieras', 'quisiera', 'quisiéramos', 'quisierais', 'quisieran'],
    imperative: ['quiere', 'quiera', 'queramos', 'quered', 'quieran'],
    gerund: 'queriendo',
    participle: 'querido'
  },
  poner: {
    present: ['pongo', 'pones', 'pone', 'ponemos', 'ponéis', 'ponen'],
    preterite: ['puse', 'pusiste', 'puso', 'pusimos', 'pusisteis', 'pusieron'],
    imperfect: ['ponía', 'ponías', 'ponía', 'poníamos', 'poníais', 'ponían'],
    futureStem: 'pondr',
    subjPresent: ['ponga', 'pongas', 'ponga', 'pongamos', 'pongáis', 'pongan'],
    subjImperfect: ['pusiera', 'pusieras', 'pusiera', 'pusiéramos', 'pusierais', 'pusieran'],
    imperative: ['pon', 'ponga', 'pongamos', 'poned', 'pongan'],
    gerund: 'poniendo',
    participle: 'puesto'
  },
  salir: {
    present: ['salgo', 'sales', 'sale', 'salimos', 'salís', 'salen'],
    preterite: ['salí', 'saliste', 'salió', 'salimos', 'salisteis', 'salieron'],
    imperfect: ['salía', 'salías', 'salía', 'salíamos', 'salíais', 'salían'],
    futureStem: 'saldr',
    subjPresent: ['salga', 'salgas', 'salga', 'salgamos', 'salgáis', 'salgan'],
    subjImperfect: ['saliera', 'salieras', 'saliera', 'saliéramos', 'salierais', 'salieran'],
    imperative: ['sal', 'salga', 'salgamos', 'salid', 'salgan'],
    gerund: 'saliendo',
    participle: 'salido'
  },
  traer: {
    present: ['traigo', 'traes', 'trae', 'traemos', 'traéis', 'traen'],
    preterite: ['traje', 'trajiste', 'trajo', 'trajimos', 'trajisteis', 'trajeron'],
    imperfect: ['traía', 'traías', 'traía', 'traíamos', 'traíais', 'traían'],
    futureStem: 'traer',
    subjPresent: ['traiga', 'traigas', 'traiga', 'traigamos', 'traigáis', 'traigan'],
    subjImperfect: ['trajera', 'trajeras', 'trajera', 'trajéramos', 'trajerais', 'trajeran'],
    imperative: ['trae', 'traiga', 'traigamos', 'traed', 'traigan'],
    gerund: 'trayendo',
    participle: 'traído'
  },
  oír: {
    present: ['oigo', 'oyes', 'oye', 'oímos', 'oís', 'oyen'],
    preterite: ['oí', 'oíste', 'oyó', 'oímos', 'oísteis', 'oyeron'],
    imperfect: ['oía', 'oías', 'oía', 'oíamos', 'oíais', 'oían'],
    futureStem: 'oir',
    subjPresent: ['oiga', 'oigas', 'oiga', 'oigamos', 'oigáis', 'oigan'],
    subjImperfect: ['oyera', 'oyeras', 'oyera', 'oyéramos', 'oyerais', 'oyeran'],
    imperative: ['oye', 'oiga', 'oigamos', 'oíd', 'oigan'],
    gerund: 'oyendo',
    participle: 'oído'
  },
  caer: {
    present: ['caigo', 'caes', 'cae', 'caemos', 'caéis', 'caen'],
    preterite: ['caí', 'caíste', 'cayó', 'caímos', 'caísteis', 'cayeron'],
    imperfect: ['caía', 'caías', 'caía', 'caíamos', 'caíais', 'caían'],
    futureStem: 'caer',
    subjPresent: ['caiga', 'caigas', 'caiga', 'caigamos', 'caigáis', 'caigan'],
    subjImperfect: ['cayera', 'cayeras', 'cayera', 'cayéramos', 'cayerais', 'cayeran'],
    imperative: ['cae', 'caiga', 'caigamos', 'caed', 'caigan'],
    gerund: 'cayendo',
    participle: 'caído'
  },
  andar: {
    present: ['ando', 'andas', 'anda', 'andamos', 'andáis', 'andan'],
    preterite: ['anduve', 'anduviste', 'anduvo', 'anduvimos', 'anduvisteis', 'anduvieron'],
    imperfect: ['andaba', 'andabas', 'andaba', 'andábamos', 'andabais', 'andaban'],
    futureStem: 'andar',
    subjPresent: ['ande', 'andes', 'ande', 'andemos', 'andéis', 'anden'],
    subjImperfect: ['anduviera', 'anduvieras', 'anduviera', 'anduviéramos', 'anduvierais', 'anduvieran'],
    imperative: ['anda', 'ande', 'andemos', 'andad', 'anden'],
    gerund: 'andando',
    participle: 'andado'
  },
  caber: {
    present: ['quepo', 'cabes', 'cabe', 'cabemos', 'cabéis', 'caben'],
    preterite: ['cupe', 'cupiste', 'cupo', 'cupimos', 'cupisteis', 'cupieron'],
    imperfect: ['cabía', 'cabías', 'cabía', 'cabíamos', 'cabíais', 'cabían'],
    futureStem: 'cabr',
    subjPresent: ['quepa', 'quepas', 'quepa', 'quepamos', 'quepáis', 'quepan'],
    subjImperfect: ['cupiera', 'cupieras', 'cupiera', 'cupiéramos', 'cupierais', 'cupieran'],
    imperative: ['cabe', 'quepa', 'quepamos', 'cabed', 'quepan'],
    gerund: 'cabiendo',
    participle: 'cabido'
  },
  valer: {
    present: ['valgo', 'vales', 'vale', 'valemos', 'valéis', 'valen'],
    preterite: ['valí', 'valiste', 'valió', 'valimos', 'valisteis', 'valieron'],
    imperfect: ['valía', 'valías', 'valía', 'valíamos', 'valíais', 'valían'],
    futureStem: 'valdr',
    subjPresent: ['valga', 'valgas', 'valga', 'valgamos', 'valgáis', 'valgan'],
    subjImperfect: ['valiera', 'valieras', 'valiera', 'valiéramos', 'valierais', 'valieran'],
    imperative: ['vale', 'valga', 'valgamos', 'valed', 'valgan'],
    gerund: 'valiendo',
    participle: 'valido'
  },
  reír: {
    present: ['río', 'ríes', 'ríe', 'reímos', 'reís', 'ríen'],
    preterite: ['reí', 'reíste', 'rió', 'reímos', 'reísteis', 'rieron'],
    imperfect: ['reía', 'reías', 'reía', 'reíamos', 'reíais', 'reían'],
    futureStem: 'reir',
    subjPresent: ['ría', 'rías', 'ría', 'riamos', 'riáis', 'rían'],
    subjImperfect: ['riera', 'rieras', 'riera', 'riéramos', 'rierais', 'rieran'],
    imperative: ['ríe', 'ría', 'riamos', 'reíd', 'rían'],
    gerund: 'riendo',
    participle: 'reído'
  }
}
