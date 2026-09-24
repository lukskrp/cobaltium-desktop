import type { InflectionParadigm, ParadigmRow, ParadigmTable } from '../../inflection'
import {
  isBack,
  weakStem,
  strongStem,
  partitive,
  vat,
  koon,
  kaa,
  kaamme,
  koot
} from './phonology'

const PERSONS = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']
const IMP_PERSONS = ['2sg', '3sg', '1pl', '2pl', '3pl']
const NEG = ['en', 'et', 'ei', 'emme', 'ette', 'eivät']
const NEG_IMP = ['älä', 'älköön', 'älkäämme', 'älkää', 'älkööt']
const VOWELS = 'aeiouyäö'

// The olla auxiliary: builds the analytic (compound) tenses of every verb.
const OLLA_PRESENT = ['olen', 'olet', 'on', 'olemme', 'olette', 'ovat']
const OLLA_PAST = ['olin', 'olit', 'oli', 'olimme', 'olitte', 'olivat']
const OLLA_COND = ['olisin', 'olisit', 'olisi', 'olisimme', 'olisitte', 'olisivat']
const OLLA_POT = ['lienen', 'lienet', 'lienee', 'lienemme', 'lienette', 'lienevät']

/** All the per-type stems needed to assemble the full paradigm. */
interface VerbStems {
  present: string[]
  past: string[]
  conditional: string[]
  potential: string[]
  imperative: string[]
  connegative: string
  pastPartSg: string
  passiveStem: string
  passivePresStem: string
  passiveConnegStem: string
  maStem: string
  vaStem: string
  secondInf: string
  secondInfIness: string
}

export const FinnishConjugator = {
  conjugate(infinitive: string): InflectionParadigm | null {
    const word = infinitive.trim().toLowerCase()
    const exception = EXCEPTIONS.get(word)
    if (exception) return exception
    return regular(word)
  }
}

function regular(inf: string): InflectionParadigm | null {
  let type: number
  if (inf.endsWith('ita') || inf.endsWith('itä')) type = 5
  else if (inf.endsWith('eta') || inf.endsWith('etä')) type = 6
  else if (
    inf.endsWith('la') ||
    inf.endsWith('lä') ||
    inf.endsWith('na') ||
    inf.endsWith('nä') ||
    inf.endsWith('ra') ||
    inf.endsWith('rä')
  )
    type = 3
  else if (inf.endsWith('ta') || inf.endsWith('tä')) type = 4
  else if (inf.endsWith('da') || inf.endsWith('dä')) type = 2
  else if (inf.endsWith('a') || inf.endsWith('ä')) type = 1
  else return null
  if (type === 2) return null

  const back = isBack(inf)
  let stems: VerbStems
  if (type === 1) stems = type1(inf, back)
  else if (type === 3) stems = type3(inf, back)
  else if (type === 4) stems = type4(inf, back)
  else if (type === 5 || type === 6) stems = type56(inf, type, back)
  else return null
  return buildParadigm(inf, stems, back)
}

function type1(inf: string, back: boolean): VerbStems {
  const strong = inf.slice(0, -1)
  const weak = weakStem(strong)
  const dropA = (s: string): string =>
    s.length > 0 && (s.charAt(s.length - 1) === 'a' || s.charAt(s.length - 1) === 'ä')
      ? s.slice(0, -1)
      : s
  const weakDrop = dropA(weak)
  const strongDrop = dropA(strong)
  return {
    present: [
      weak + 'n',
      weak + 't',
      strong + strong.charAt(strong.length - 1),
      weak + 'mme',
      weak + 'tte',
      strong + vat(back)
    ],
    past: [
      weakDrop + 'in',
      weakDrop + 'it',
      strongDrop + 'i',
      weakDrop + 'imme',
      weakDrop + 'itte',
      strongDrop + 'i' + vat(back)
    ],
    conditional: [
      strong + 'isin',
      strong + 'isit',
      strong + 'isi',
      strong + 'isimme',
      strong + 'isitte',
      strong + 'isi' + vat(back)
    ],
    potential: potentialForms(strong + 'ne', back),
    imperative: [weak, strong + koon(back), strong + kaamme(back), strong + kaa(back), strong + koot(back)],
    connegative: weak,
    pastPartSg: strong + (back ? 'nut' : 'nyt'),
    passiveStem: passiveStemType1(weak),
    passivePresStem: passiveStemType1(weak),
    passiveConnegStem: passiveStemType1(weak),
    maStem: strong + (back ? 'ma' : 'mä'),
    vaStem: strong + (back ? 'va' : 'vä'),
    secondInf: strong + 'en',
    secondInfIness: strong + (back ? 'essa' : 'essä')
  }
}

function type3(inf: string, back: boolean): VerbStems {
  const stem = inf.slice(0, -2) + 'e'
  const cs = stem.slice(0, -1)
  const gem = cs + cs.charAt(cs.length - 1)
  return {
    present: [stem + 'n', stem + 't', stem + 'e', stem + 'mme', stem + 'tte', stem + vat(back)],
    past: [cs + 'in', cs + 'it', cs + 'i', cs + 'imme', cs + 'itte', cs + 'i' + vat(back)],
    conditional: [cs + 'isin', cs + 'isit', cs + 'isi', cs + 'isimme', cs + 'isitte', cs + 'isi' + vat(back)],
    potential: potentialForms(gem + 'e', back),
    imperative: [stem, cs + koon(back), cs + kaamme(back), cs + kaa(back), cs + koot(back)],
    connegative: stem,
    pastPartSg: gem + (back ? 'ut' : 'yt'),
    passiveStem: cs + 't',
    passivePresStem: gem,
    passiveConnegStem: cs + 't',
    maStem: stem + (back ? 'ma' : 'mä'),
    vaStem: stem + (back ? 'va' : 'vä'),
    secondInf: gem + 'en',
    secondInfIness: gem + (back ? 'essa' : 'essä')
  }
}

function type4(inf: string, back: boolean): VerbStems {
  const weak = inf.slice(0, -2)
  const strong = strongStem(weak)
  const vowel = partitive(back)
  const presentStem = strong + vowel
  const s3 =
    strong.charAt(strong.length - 1) === vowel.charAt(0) ? strong + vowel : strong + vowel + vowel
  const gradating = strong !== weak
  const condStem = strong + (gradating ? '' : vowel)
  const impBase = inf.slice(0, -1)
  const partBase = VOWELS.includes(weak.charAt(weak.length - 1)) ? weak : weak + vowel
  const pastPartSg = partBase + (back ? 'nnut' : 'nnyt')
  return {
    present: [
      presentStem + 'n',
      presentStem + 't',
      s3,
      presentStem + 'mme',
      presentStem + 'tte',
      strong + (back ? 'avat' : 'ävät')
    ],
    past: [
      strong + 'sin',
      strong + 'sit',
      strong + 'si',
      strong + 'simme',
      strong + 'sitte',
      strong + 'si' + vat(back)
    ],
    conditional: [
      condStem + 'isin',
      condStem + 'isit',
      condStem + 'isi',
      condStem + 'isimme',
      condStem + 'isitte',
      condStem + 'isi' + vat(back)
    ],
    potential: potentialForms(pastPartSg.slice(0, -2) + 'e', back),
    imperative: [
      presentStem,
      impBase + koon(back),
      impBase + kaamme(back),
      impBase + kaa(back),
      impBase + koot(back)
    ],
    connegative: presentStem,
    pastPartSg,
    passiveStem: impBase,
    passivePresStem: impBase,
    passiveConnegStem: impBase,
    maStem: presentStem + (back ? 'ma' : 'mä'),
    vaStem: presentStem + (back ? 'va' : 'vä'),
    secondInf: impBase + 'en',
    secondInfIness: impBase + (back ? 'essa' : 'essä')
  }
}

function type56(inf: string, type: number, back: boolean): VerbStems {
  const stem = type === 5 ? inf.slice(0, -2) + 'tse' : inf.slice(0, -2) + 'ne'
  const pastStem = stem.slice(0, -1)
  const impBase = inf.slice(0, -1)
  const base = inf.slice(0, -2)
  const pastPartSg = base + (back ? 'nnut' : 'nnyt')
  return {
    present: [stem + 'n', stem + 't', stem + 'e', stem + 'mme', stem + 'tte', stem + vat(back)],
    past: [
      pastStem + 'in',
      pastStem + 'it',
      pastStem + 'i',
      pastStem + 'imme',
      pastStem + 'itte',
      pastStem + 'i' + vat(back)
    ],
    conditional: [
      stem + 'isin',
      stem + 'isit',
      stem + 'isi',
      stem + 'isimme',
      stem + 'isitte',
      stem + 'isi' + vat(back)
    ],
    potential: potentialForms(pastPartSg.slice(0, -2) + 'e', back),
    imperative: [
      stem,
      impBase + koon(back),
      impBase + kaamme(back),
      impBase + kaa(back),
      impBase + koot(back)
    ],
    connegative: stem,
    pastPartSg,
    passiveStem: impBase,
    passivePresStem: impBase,
    passiveConnegStem: impBase,
    maStem: stem + (back ? 'ma' : 'mä'),
    vaStem: stem + (back ? 'va' : 'vä'),
    secondInf: impBase + 'en',
    secondInfIness: impBase + (back ? 'essa' : 'essä')
  }
}

/** Type-1 passive stem: jättää -> jätet, puhua -> puhut, antaa -> annet. */
function passiveStemType1(weak: string): string {
  const last = weak.charAt(weak.length - 1)
  const base = last === 'a' || last === 'ä' ? weak.slice(0, -1) + 'e' : weak
  return base + 't'
}

function potentialForms(stem: string, back: boolean): string[] {
  return [stem + 'n', stem + 't', stem + 'e', stem + 'mme', stem + 'tte', stem + (back ? 'vat' : 'vät')]
}

/** Assembles the full paradigm from the per-type stems. */
function buildParadigm(lemma: string, s: VerbStems, back: boolean): InflectionParadigm {
  const partPl = s.pastPartSg.slice(0, -2) + 'eet'
  const potConneg = s.potential[2].slice(0, -1)
  const negImpBase = s.imperative[1].slice(0, -2)
  return {
    lemma,
    lang: 'fi',
    kind: 'conjugation',
    note: '',
    tables: [
      table('Present', s.present, PERSONS),
      table('Present negative', neg(s.connegative), PERSONS),
      table('Past', s.past, PERSONS),
      table('Past negative', negPerNumber(s.pastPartSg, partPl), PERSONS),
      table('Perfect', aux(OLLA_PRESENT, s.pastPartSg, partPl), PERSONS),
      table('Perfect negative', auxNeg('ole', s.pastPartSg, partPl), PERSONS),
      table('Pluperfect', aux(OLLA_PAST, s.pastPartSg, partPl), PERSONS),
      table('Pluperfect negative', auxNegPerNumber('ollut', 'olleet', s.pastPartSg, partPl), PERSONS),
      table('Conditional', s.conditional, PERSONS),
      table('Conditional negative', neg(s.conditional[2]), PERSONS),
      table('Conditional perfect', aux(OLLA_COND, s.pastPartSg, partPl), PERSONS),
      table('Conditional perfect negative', auxNeg('olisi', s.pastPartSg, partPl), PERSONS),
      table('Potential', s.potential, PERSONS),
      table('Potential negative', neg(potConneg), PERSONS),
      table('Potential perfect', aux(OLLA_POT, s.pastPartSg, partPl), PERSONS),
      table('Potential perfect negative', auxNeg('liene', s.pastPartSg, partPl), PERSONS),
      table('Imperative', s.imperative, IMP_PERSONS),
      table('Imperative negative', negImp(s.connegative, negImpBase), IMP_PERSONS),
      infinitiveTable(lemma, s, back),
      participleTable(s, back),
      passiveTable(s, back)
    ]
  }
}

function table(title: string, forms: string[], persons: string[]): ParadigmTable {
  return {
    title,
    columns: ['Form'],
    rows: forms.map((form, i) => ({ label: persons[i], cells: [form] }))
  }
}

function neg(form: string): string[] {
  return NEG.map((it) => `${it} ${form}`)
}

function negPerNumber(sg: string, pl: string): string[] {
  return NEG.map((n, i) => `${n} ${i < 3 ? sg : pl}`)
}

function aux(auxiliaries: string[], sg: string, pl: string): string[] {
  return auxiliaries.map((a, i) => `${a} ${i < 3 ? sg : pl}`)
}

function auxNeg(auxConneg: string, sg: string, pl: string): string[] {
  return NEG.map((n, i) => `${n} ${auxConneg} ${i < 3 ? sg : pl}`)
}

function auxNegPerNumber(sgAux: string, plAux: string, sg: string, pl: string): string[] {
  return NEG.map((n, i) => (i < 3 ? `${n} ${sgAux} ${sg}` : `${n} ${plAux} ${pl}`))
}

function negImp(connegative: string, base: string): string[] {
  return [`älä ${connegative}`, ...NEG_IMP.slice(1).map((it) => `${it} ${base}`)]
}

function infinitiveTable(lemma: string, s: VerbStems, back: boolean): ParadigmTable {
  const ma = s.maStem
  const rows: ParadigmRow[] = [
    { label: '1st infinitive', cells: [lemma] },
    { label: '2nd infinitive (instructive)', cells: [s.secondInf] },
    { label: '2nd infinitive (inessive)', cells: [s.secondInfIness] },
    { label: '3rd infinitive (inessive)', cells: [ma + (back ? 'ssa' : 'ssä')] },
    { label: '3rd infinitive (elative)', cells: [ma + (back ? 'sta' : 'stä')] },
    { label: '3rd infinitive (illative)', cells: [ma.slice(0, -1) + (back ? 'aan' : 'ään')] },
    { label: '3rd infinitive (adessive)', cells: [ma + (back ? 'lla' : 'llä')] },
    { label: '3rd infinitive (abessive)', cells: [ma + (back ? 'tta' : 'ttä')] },
    { label: '3rd infinitive (instructive)', cells: [ma + 'n'] },
    { label: '4th infinitive (verbal noun)', cells: [ma.slice(0, -1) + 'inen'] }
  ]
  return { title: 'Infinitives', columns: ['Form'], rows }
}

function participleTable(s: VerbStems, back: boolean): ParadigmTable {
  const passPres = passivePresPart(s.passiveStem, back)
  const passPast = passivePart(s.passiveStem, back)
  const rows: ParadigmRow[] = [
    { label: 'Present active', cells: [s.vaStem, s.vaStem + 't'] },
    { label: 'Past active', cells: [s.pastPartSg, s.pastPartSg.slice(0, -2) + 'eet'] },
    { label: 'Present passive', cells: [passPres, passPres + 't'] },
    { label: 'Past passive', cells: [passPast, s.passiveConnegStem + (back ? 'ut' : 'yt')] },
    { label: 'Agent', cells: [s.maStem, s.maStem + 't'] },
    {
      label: 'Negative',
      cells: [s.maStem + (back ? 'ton' : 'tön'), s.maStem + (back ? 'ttomat' : 'ttömät')]
    }
  ]
  return { title: 'Participles', columns: ['Singular', 'Plural'], rows }
}

function passiveTable(s: VerbStems, back: boolean): ParadigmTable {
  const rows: ParadigmRow[] = [
    { label: 'Present', cells: [s.passivePresStem + (back ? 'aan' : 'ään')] },
    { label: 'Present negative', cells: ['ei ' + (s.passiveConnegStem + (back ? 'a' : 'ä'))] },
    { label: 'Past', cells: [passivePast(s.passiveStem, back)] },
    { label: 'Past negative', cells: ['ei ' + passivePart(s.passiveStem, back)] }
  ]
  return { title: 'Passive', columns: ['Form'], rows }
}

/**
 * True when the passive t-stem ends in a single short vowel + t (e.g. jätet,
 * halut): the passive suffixes keep their t (-tiin, -tu, -tava). When the final
 * t follows another consonant (tult, näht) or a diphthong (syöt, juot), the
 * suffix drops its t (-iin, -u, -ava).
 */
function simpleT(stem: string): boolean {
  if (!stem.endsWith('t')) return true
  const pre = stem.length >= 2 ? stem.charAt(stem.length - 2) : null
  const pre2 = stem.length >= 3 ? stem.charAt(stem.length - 3) : null
  return pre !== null && VOWELS.includes(pre) && (pre2 === null || !VOWELS.includes(pre2))
}

function passivePast(stem: string, _back: boolean): string {
  return stem + (simpleT(stem) ? 'tiin' : 'iin')
}

function passivePart(stem: string, back: boolean): string {
  return stem + (simpleT(stem) ? (back ? 'tu' : 'ty') : back ? 'u' : 'y')
}

function passivePresPart(stem: string, back: boolean): string {
  return stem + (simpleT(stem) ? (back ? 'tava' : 'tävä') : back ? 'ava' : 'ävä')
}

const OLLA_STEMS: VerbStems = {
  present: OLLA_PRESENT,
  past: OLLA_PAST,
  conditional: OLLA_COND,
  potential: OLLA_POT,
  imperative: ['ole', 'olkoon', 'olkaamme', 'olkaa', 'olkoot'],
  connegative: 'ole',
  pastPartSg: 'ollut',
  passiveStem: 'olt',
  passivePresStem: 'oll',
  passiveConnegStem: 'olt',
  maStem: 'olema',
  vaStem: 'oleva',
  secondInf: 'ollen',
  secondInfIness: 'ollessa'
}

const EXCEPTIONS: ReadonlyMap<string, InflectionParadigm> = new Map([
  ['olla', buildParadigm('olla', OLLA_STEMS, true)],
  [
    'antaa',
    buildParadigm(
      'antaa',
      {
        present: ['annan', 'annat', 'antaa', 'annamme', 'annatte', 'antavat'],
        past: ['annoin', 'annoit', 'antoi', 'annoimme', 'annoitte', 'antoivat'],
        conditional: ['antaisin', 'antaisit', 'antaisi', 'antaisimme', 'antaisitte', 'antaisivat'],
        potential: ['antanen', 'antanet', 'antanee', 'antanemme', 'antanette', 'antanevat'],
        imperative: ['anna', 'antakoon', 'antakaamme', 'antakaa', 'antakoot'],
        connegative: 'anna',
        pastPartSg: 'antanut',
        passiveStem: 'annet',
        passivePresStem: 'annet',
        passiveConnegStem: 'annet',
        maStem: 'antama',
        vaStem: 'antava',
        secondInf: 'antaen',
        secondInfIness: 'antaessa'
      },
      true
    )
  ],
  [
    'nähdä',
    buildParadigm(
      'nähdä',
      {
        present: ['näen', 'näet', 'näkee', 'näemme', 'näette', 'näkevät'],
        past: ['näin', 'näit', 'näki', 'näimme', 'näitte', 'näkivät'],
        conditional: ['näkisin', 'näkisit', 'näkisi', 'näkisimme', 'näkisitte', 'näkisivät'],
        potential: ['nähnen', 'nähnet', 'nähnee', 'nähnemme', 'nähnette', 'nähnevät'],
        imperative: ['näe', 'nähköön', 'nähkäämme', 'nähkää', 'nähkööt'],
        connegative: 'näe',
        pastPartSg: 'nähnyt',
        passiveStem: 'näht',
        passivePresStem: 'nähd',
        passiveConnegStem: 'nähd',
        maStem: 'näkemä',
        vaStem: 'näkevä',
        secondInf: 'nähden',
        secondInfIness: 'nähdessä'
      },
      false
    )
  ],
  [
    'tehdä',
    buildParadigm(
      'tehdä',
      {
        present: ['teen', 'teet', 'tekee', 'teemme', 'teette', 'tekevät'],
        past: ['tein', 'teit', 'teki', 'teimme', 'teitte', 'tekivät'],
        conditional: ['tekisin', 'tekisit', 'tekisi', 'tekisimme', 'tekisitte', 'tekisivät'],
        potential: ['tehnen', 'tehnet', 'tehnee', 'tehnemme', 'tehnette', 'tehnevät'],
        imperative: ['tee', 'tehköön', 'tehkäämme', 'tehkää', 'tehkööt'],
        connegative: 'tee',
        pastPartSg: 'tehnyt',
        passiveStem: 'teht',
        passivePresStem: 'tehd',
        passiveConnegStem: 'tehd',
        maStem: 'tekemä',
        vaStem: 'tekevä',
        secondInf: 'tehden',
        secondInfIness: 'tehdessä'
      },
      false
    )
  ],
  [
    'syödä',
    buildParadigm(
      'syödä',
      {
        present: ['syön', 'syöt', 'syö', 'syömme', 'syötte', 'syövät'],
        past: ['söin', 'söit', 'söi', 'söimme', 'söitte', 'söivät'],
        conditional: ['söisin', 'söisit', 'söisi', 'söisimme', 'söisitte', 'söisivät'],
        potential: ['syönen', 'syönet', 'syönee', 'syönemme', 'syönette', 'syönevät'],
        imperative: ['syö', 'syököön', 'syökäämme', 'syökää', 'syökööt'],
        connegative: 'syö',
        pastPartSg: 'syönyt',
        passiveStem: 'syöt',
        passivePresStem: 'syöd',
        passiveConnegStem: 'syöd',
        maStem: 'syömä',
        vaStem: 'syövä',
        secondInf: 'syöden',
        secondInfIness: 'syödessä'
      },
      false
    )
  ],
  [
    'juoda',
    buildParadigm(
      'juoda',
      {
        present: ['juon', 'juot', 'juo', 'juomme', 'juotte', 'juovat'],
        past: ['join', 'joit', 'joi', 'joimme', 'joitte', 'joivat'],
        conditional: ['joisin', 'joisit', 'joisi', 'joisimme', 'joisitte', 'joisivat'],
        potential: ['juonen', 'juonet', 'juonee', 'juonemme', 'juonette', 'juonevat'],
        imperative: ['juo', 'juokoon', 'juokaamme', 'juokaa', 'juokoot'],
        connegative: 'juo',
        pastPartSg: 'juonut',
        passiveStem: 'juot',
        passivePresStem: 'juod',
        passiveConnegStem: 'juod',
        maStem: 'juoma',
        vaStem: 'juova',
        secondInf: 'juoden',
        secondInfIness: 'juodessa'
      },
      true
    )
  ],
  [
    'käydä',
    buildParadigm(
      'käydä',
      {
        present: ['käyn', 'käyt', 'käy', 'käymme', 'käytte', 'käyvät'],
        past: ['kävin', 'kävit', 'kävi', 'kävimme', 'kävitte', 'kävivät'],
        conditional: ['kävisin', 'kävisit', 'kävisi', 'kävisimme', 'kävisitte', 'kävisivät'],
        potential: ['käynen', 'käynet', 'käynee', 'käynemme', 'käynette', 'käynevät'],
        imperative: ['käy', 'käyköön', 'käykäämme', 'käykää', 'käykööt'],
        connegative: 'käy',
        pastPartSg: 'käynyt',
        passiveStem: 'käyt',
        passivePresStem: 'käyd',
        passiveConnegStem: 'käyd',
        maStem: 'käymä',
        vaStem: 'käyvä',
        secondInf: 'käyden',
        secondInfIness: 'käydessä'
      },
      false
    )
  ],
  [
    'voida',
    buildParadigm(
      'voida',
      {
        present: ['voin', 'voit', 'voi', 'voimme', 'voitte', 'voivat'],
        past: ['voin', 'voit', 'voi', 'voimme', 'voitte', 'voivat'],
        conditional: ['voisin', 'voisit', 'voisi', 'voisimme', 'voisitte', 'voisivat'],
        potential: ['voinen', 'voinet', 'voinee', 'voinemme', 'voinette', 'voinevat'],
        imperative: ['voi', 'voikoon', 'voikaamme', 'voikaa', 'voikoot'],
        connegative: 'voi',
        pastPartSg: 'voinut',
        passiveStem: 'voit',
        passivePresStem: 'void',
        passiveConnegStem: 'void',
        maStem: 'voima',
        vaStem: 'voiva',
        secondInf: 'voiden',
        secondInfIness: 'voidessa'
      },
      true
    )
  ]
])
