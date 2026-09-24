import type { InflectionEngine, InflectionParadigm, ParadigmKind, ParadigmRow, ParadigmTable } from '../inflection'

/**
 * Bundled Russian (ru) inflector: deterministic, offline LangDex paradigms.
 *
 * Verbs:
 * - Regular verbs by conjugation: 1st (-ать/-ять/-еть, -овать/-евать,
 *   -нуть) and 2nd (-ить plus the -ать/-ять/-еть exceptions) with:
 *   - 1st-person consonant mutation for 2nd conjugation (ходить -> хожу,
 *     просить -> прошу, любить -> люблю, чистить -> чищу),
 *   - whole-stem mutation for a set of 1st-conjugation -ать verbs
 *     (писать -> пишу, искать -> ищу),
 *   - imperative from the 3pl stem (читай, пиши, ходи),
 *   - present active participle (читающий, ходящий) and imperfective gerund
 *     (читая, говоря),
 *   - analytic future (буду + infinitive).
 * - Curated irregulars: быть, хотеть, бежать, дать, есть, идти, мочь, лечь,
 *   печь, беречь, жить, пить, спать, гнать, звать, брать, взять, слать,
 *   вести, нести, везти, расти, сесть, класть, красть, лезть, стричь, течь,
 *   жечь, плыть, бить, вить, шить, брить, стелить.
 *
 * Nouns: six-case declension (nominative, genitive, dative, accusative,
 * instrumental, prepositional) x singular/plural across the standard patterns:
 * feminine -а/-я (incl. -ия), masculine consonant/-й/-ь, neuter -о/-е/-ие/-мя,
 * feminine -ь. Curated irregulars cover the -мя group, mobile vowels
 * (день -> дня, отец -> отца), plural -а (дом -> дома) and suppletive plurals
 * (человек -> люди, ребёнок -> дети).
 *
 * Adjectives: hard (новый), soft (-ний: синий) and possessive (-ий: лисий)
 * declension by case x gender/number.
 *
 * The accusative is given for inanimate nouns (for animates it coincides with
 * the genitive); ё is written as е throughout. Unhandled words return null so
 * the caller falls back to the LLM tier.
 */

function dropLast(s: string, n: number): string {
  return s.slice(0, s.length - n)
}

function removeSuffix(s: string, suffix: string): string {
  return s.endsWith(suffix) ? s.slice(0, s.length - suffix.length) : s
}

function lastChar(s: string): string {
  return s.charAt(s.length - 1)
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
    // Pronouns/determiners decline in Russian but the rule engine cannot
    // guess them safely (я, этот, мой...) — [decline] returns null for the
    // curated exclusion set, sending those to the LLM tier.
    case 'pronoun':
    case 'determiner':
      return 'declension'
    default:
      return null
  }
}

function looksLikeVerb(word: string): boolean {
  return (
    word.endsWith('ть') ||
    word.endsWith('чь') ||
    word.endsWith('ти') ||
    word.endsWith('сть') ||
    word.endsWith('зть')
  )
}

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(word: string): InflectionParadigm | null {
  const irregular = IRREGULAR_VERBS.get(word)
  if (irregular) return irregularVerbParadigm(word, irregular)
  if (word.endsWith('овать') || word.endsWith('евать')) return ovaVerb(word)
  if (SECOND_CONJ_AT.has(word)) return conj2Verb(word, dropLast(word, 3))
  if (word.endsWith('ить')) return conj2Verb(word, dropLast(word, 3))
  if (word.endsWith('нуть')) return nVerb(word)
  if (word.endsWith('ать') || word.endsWith('ять') || word.endsWith('еть')) {
    return conj1Verb(word, dropLast(word, 2))
  }
  return null
}

/** 1st conjugation -ать/-ять/-еть (читаю, гуляю, болею). */
function conj1Verb(inf: string, stem: string): InflectionParadigm {
  const mutated = MUTATED_1ST.get(inf)
  const presStem = mutated ?? stem
  const hard = mutated != null || HARD_CONSONANTS.includes(lastChar(presStem))
  const endings = hard ? FIRST_HARD : FIRST_SOFT
  const present = endings.map((it) => presStem + it)
  return regularVerbTables(inf, present, stem)
}

/** -овать/-евать verbs (рисую, танцую). */
function ovaVerb(inf: string): InflectionParadigm {
  const presStem = removeSuffix(removeSuffix(inf, 'овать'), 'евать') + 'у'
  const present = FIRST_SOFT.map((it) => presStem + it)
  return regularVerbTables(inf, present, dropLast(inf, 2))
}

/** -нуть verbs (пахну, тяну): present on the stem minus -уть, always -у/-ут. */
function nVerb(inf: string): InflectionParadigm {
  const presStem = dropLast(inf, 3)
  const present = ['у', 'ешь', 'ет', 'ем', 'ете', 'ут'].map((it) => presStem + it)
  return regularVerbTables(inf, present, dropLast(inf, 2))
}

/** 2nd conjugation -ить (говорю) and -ать/-ять/-еть exceptions (держу). */
function conj2Verb(inf: string, stem: string): InflectionParadigm {
  const hard3pl = SHIPYASHCHIE.includes(lastChar(stem))
  const endings = hard3pl ? SECOND_HARD : SECOND_SOFT
  const mutated = mutateStem(stem)
  let first: string
  if (SHIPYASHCHIE.includes(lastChar(stem))) {
    first = stem + 'у'
  } else if (MUTABLE_CONSONANTS.includes(lastChar(stem))) {
    // Sibilant mutations take -у (хожу, плачу); л-mutations take -ю (люблю, ставлю).
    first = mutated + (SHIPYASHCHIE.includes(lastChar(mutated)) ? 'у' : 'ю')
  } else {
    first = stem + 'ю'
  }
  const present = [first, stem + 'ишь', stem + 'ит', stem + 'им', stem + 'ите', stem + endings[5]]
  return regularVerbTables(inf, present, dropLast(inf, 2))
}

function mutateStem(stem: string): string {
  if (stem.endsWith('ст')) return dropLast(stem, 2) + 'щ'
  switch (lastChar(stem)) {
    case 'д':
    case 'з':
      return dropLast(stem, 1) + 'ж'
    case 'с':
      return dropLast(stem, 1) + 'ш'
    case 'т':
      return dropLast(stem, 1) + 'ч'
    case 'п':
      return dropLast(stem, 1) + 'пл'
    case 'б':
      return dropLast(stem, 1) + 'бл'
    case 'в':
      return dropLast(stem, 1) + 'вл'
    case 'м':
      return dropLast(stem, 1) + 'мл'
    case 'ф':
      return dropLast(stem, 1) + 'фл'
    default:
      return stem
  }
}

/** Builds present/past/future/imperative/non-finite tables for regular verbs. */
function regularVerbTables(inf: string, present: string[], stem: string): InflectionParadigm {
  const { participle, gerund } = nonFinite(present)
  const past = pastTense(inf, stem)
  const imperative = imperativeForms(inf, present)
  return verbParadigm(inf, present, past, imperative, participle, gerund, false)
}

/** Past: stem + л/ла/ло/ли; curated consonant-stem and -нуть-without-нул verbs. */
function pastTense(inf: string, stem: string): string[] {
  const irregular = PAST_IRREGULAR.get(inf)
  if (irregular != null) return [irregular, irregular + 'ла', irregular + 'ло', irregular + 'ли']
  return [stem + 'л', stem + 'ла', stem + 'ло', stem + 'ли']
}

/** Imperative from the 3pl stem: +й after a vowel, +и after a consonant. */
function imperativeForms(inf: string, present: string[]): string[] {
  const irregular = IMPERATIVE_IRREGULAR.get(inf)
  if (irregular) return irregular
  const stem3 = removeSuffix(
    removeSuffix(removeSuffix(removeSuffix(present[5], 'ут'), 'ют'), 'ат'),
    'ят'
  )
  const endsInVowel = stem3.length > 0 && VOWELS.includes(lastChar(stem3))
  return endsInVowel ? [stem3 + 'й', stem3 + 'йте'] : [stem3 + 'и', stem3 + 'ите']
}

/** Present active participle + imperfective gerund from the 3pl form. */
function nonFinite(present: string[]): { participle: string; gerund: string } {
  const thirdPl = present[5]
  const stem3 = removeSuffix(
    removeSuffix(removeSuffix(removeSuffix(thirdPl, 'ут'), 'ют'), 'ат'),
    'ят'
  )
  let participle: string
  if (thirdPl.endsWith('ут')) participle = stem3 + 'ущий'
  else if (thirdPl.endsWith('ют')) participle = stem3 + 'ющий'
  else if (thirdPl.endsWith('ат')) participle = stem3 + 'ащий'
  else participle = stem3 + 'ящий'
  const gerund = stem3.length > 0 && SHIPYASHCHIE.includes(lastChar(stem3)) ? stem3 + 'а' : stem3 + 'я'
  return { participle, gerund }
}

function irregularVerbParadigm(inf: string, v: IrregularVerb): InflectionParadigm {
  return verbParadigm(
    inf,
    v.present,
    v.past,
    v.imperative ?? [],
    v.participle ?? null,
    v.gerund ?? null,
    v.presentIsFuture ?? false
  )
}

function verbParadigm(
  inf: string,
  present: string[],
  past: string[],
  imperative: string[],
  participle: string | null,
  gerund: string | null,
  presentIsFuture = false
): InflectionParadigm {
  const tables: ParadigmTable[] = []
  tables.push({
    title: presentIsFuture ? 'Будущее время (настоящее-будущее)' : 'Настоящее время',
    columns: ['Форма'],
    rows: PRESENT_LABELS.map((label, i) => ({ label, cells: [present[i]] }))
  })
  tables.push({
    title: 'Прошедшее время',
    columns: ['Форма'],
    rows: PAST_LABELS.map((label, i) => ({ label, cells: [past[i]] }))
  })
  if (!presentIsFuture) {
    tables.push({
      title: 'Будущее время',
      columns: ['Форма'],
      rows: PRESENT_LABELS.map((label, i) => ({ label, cells: [`${FUTURE_AUX[i]} ${inf}`] }))
    })
  }
  if (imperative.length > 0) {
    tables.push({
      title: 'Повелительное наклонение',
      columns: ['Форма'],
      rows: IMPERATIVE_LABELS.map((label, i) => ({ label, cells: [imperative[i]] }))
    })
  }
  if (participle != null || gerund != null) {
    const rows: ParadigmRow[] = []
    if (participle != null) rows.push({ label: 'Причастие настоящего времени', cells: [participle] })
    if (gerund != null) rows.push({ label: 'Деепричастие', cells: [gerund] })
    tables.push({ title: 'Неличные формы', columns: ['Форма'], rows })
  }
  return {
    lemma: inf,
    lang: 'ru',
    kind: 'conjugation',
    note:
      'У глаголов несовершенного вида будущее время образуется аналитически (буду + инфинитив); ' +
      'у глаголов совершенного вида формы настоящего времени употребляются как будущее.',
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
  if (stem.length === 0) return null
  switch (nounGender(word, stem)) {
    case 'feminine-a':
      return nounParadigm(word, feminineA(word, stem))
    case 'feminine-soft':
      return nounParadigm(word, feminineSoft(word, stem))
    case 'neuter':
      return nounParadigm(word, neuter(word, stem))
    case 'masculine':
      return nounParadigm(word, masculine(word, stem))
  }
}

function nounParadigm(word: string, forms: string[]): InflectionParadigm {
  const rows = CASES.map((label, i) => ({ label, cells: [forms[i], forms[i + 6]] }))
  return {
    lemma: word,
    lang: 'ru',
    kind: 'declension',
    note:
      'Винительный падеж приведён для неодушевлённых существительных ' +
      '(у одушевлённых он совпадает с родительным). Буква ё передаётся как е.',
    tables: [{ title: 'Склонение', columns: ['Singular', 'Plural'], rows }]
  }
}

type Gender = 'masculine' | 'feminine-a' | 'feminine-soft' | 'neuter'

function nounGender(word: string, _stem: string): Gender {
  if (MASCULINE_A.has(word)) return 'masculine'
  if (word.endsWith('а') || word.endsWith('я')) return 'feminine-a'
  if (word.endsWith('о') || word.endsWith('е')) return 'neuter'
  if (word.endsWith('мя')) return 'neuter'
  if (word.endsWith('ь')) {
    if (word.endsWith('ость') || word.endsWith('есть') || FEMININE_SOFT.has(word)) {
      return 'feminine-soft'
    }
    return 'masculine'
  }
  return 'masculine'
}

/** Feminine -а/-я (книга, машина, дача, песня, линия). */
function feminineA(word: string, stem: string): string[] {
  const hard = word.endsWith('а')
  const sibilant = 'гкхжшчщ'.includes(lastChar(stem))
  if (word.endsWith('ия')) {
    // линия: gen/dat/prep -ии, inst -ией, pl gen -ий
    return [
      word,
      stem + 'и',
      stem + 'и',
      stem + 'ю',
      stem + 'ей',
      stem + 'и',
      stem + 'и',
      stem + 'й',
      stem + 'ям',
      stem + 'и',
      stem + 'ями',
      stem + 'ях'
    ]
  }
  if (hard) {
    return [
      word,
      stem + (sibilant ? 'и' : 'ы'),
      stem + 'е',
      stem + 'у',
      stem + (SHIPYASHCHIE.includes(lastChar(stem)) ? 'ей' : 'ой'),
      stem + 'е',
      stem + (sibilant ? 'и' : 'ы'),
      FEMININE_GENPL.get(word) ?? stem,
      stem + 'ам',
      stem + (sibilant ? 'и' : 'ы'),
      stem + 'ами',
      stem + 'ах'
    ]
  }
  return [
    word,
    stem + 'и',
    stem + 'е',
    stem + 'ю',
    stem + 'ей',
    stem + 'е',
    stem + 'и',
    FEMININE_GENPL.get(word) ?? stem + 'ь',
    stem + 'ям',
    stem + 'и',
    stem + 'ями',
    stem + 'ях'
  ]
}

/** Feminine -ь (ночь, мышь, дверь). */
function feminineSoft(word: string, stem: string): string[] {
  return [
    word,
    stem + 'и',
    stem + 'и',
    word,
    stem + 'ью',
    stem + 'и',
    stem + 'и',
    stem + 'ей',
    stem + 'ям',
    stem + 'и',
    stem + 'ями',
    stem + 'ях'
  ]
}

/** Masculine consonant/-й/-ь (стол, музей, словарь). */
function masculine(word: string, stem: string): string[] {
  const softSign = word.endsWith('ь')
  const yot = word.endsWith('й')
  // Consonant nouns decline on the full word (стол -> стола); -й/-ь drop the final letter.
  const s = softSign || yot ? stem : word
  const sibilant = SHIPYASHCHIE.includes(lastChar(s))
  const pluralA = PLURAL_A.get(word)
  const genSg = s + (softSign || yot ? 'я' : 'а')
  const datSg = s + (softSign || yot ? 'ю' : 'у')
  let instSg: string
  if (yot) instSg = s + 'ем'
  else if (softSign) instSg = s + 'ем'
  else if (sibilant) instSg = s + (SHIP_OM.has(word) ? 'ом' : 'ем')
  else instSg = s + 'ом'
  const prepSg = s + 'е'
  const nomPl = pluralA != null ? pluralA[0] : s + (sibilant ? 'и' : 'ы')
  const genPl =
    pluralA?.[1] ??
    (yot ? s + 'ев' : softSign || sibilant ? s + 'ей' : s + 'ов')
  const datPl = s + 'ам'
  const instPl = s + 'ами'
  const prepPl = s + 'ах'
  return [word, genSg, datSg, word, instSg, prepSg, nomPl, genPl, datPl, nomPl, instPl, prepPl]
}

/** Neuter -о/-е/-ие/-мя (окно, море, здание, время). */
function neuter(word: string, stem: string): string[] {
  if (word.endsWith('ие')) {
    // здание: declined on the stem minus -ие; prep sg -ии, gen pl -ий
    const s = dropLast(word, 2)
    return [
      word,
      s + 'ия',
      s + 'ию',
      word,
      s + 'ием',
      s + 'ии',
      s + 'ия',
      s + 'ий',
      s + 'иям',
      s + 'ия',
      s + 'иями',
      s + 'иях'
    ]
  }
  if (word.endsWith('е')) {
    // море, поле: gen pl -ей
    return [
      word,
      stem + 'я',
      stem + 'ю',
      word,
      stem + 'ем',
      stem + 'е',
      stem + 'я',
      stem + 'ей',
      stem + 'ям',
      stem + 'я',
      stem + 'ями',
      stem + 'ях'
    ]
  }
  return [
    word,
    stem + 'а',
    stem + 'у',
    word,
    stem + 'ом',
    stem + 'е',
    stem + 'а',
    NEUTER_GENPL.get(word) ?? stem,
    stem + 'ам',
    stem + 'а',
    stem + 'ами',
    stem + 'ах'
  ]
}

/** Adjective declension: hard (новый), soft -ний (синий), possessive -ий (лисий). */
function adjectiveParadigm(word: string): InflectionParadigm {
  const stem = dropLast(word, 2)
  let nom: string[]
  let e: AdjectiveEndings
  if (word.endsWith('ний')) {
    nom = ADJ_SOFT
    e = ADJ_SOFT_ENDING
  } else if (
    // Possessive -ий (лисий, собачий), but -кий/-гий/-хий stay hard (русский, тихий).
    word.endsWith('ий') &&
    !word.endsWith('кий') &&
    !word.endsWith('гий') &&
    !word.endsWith('хий')
  ) {
    nom = ADJ_POSSESSIVE
    e = ADJ_POSSESSIVE_ENDING
  } else {
    nom = ADJ_HARD
    e = ADJ_HARD_ENDING
  }
  const rows = CASES.map((label, i) => {
    switch (i) {
      case 0:
        return { label, cells: [word, stem + nom[1], stem + nom[2], stem + nom[3]] }
      case 1:
        return { label, cells: [stem + e.gen[0], stem + e.gen[1], stem + e.gen[0], stem + e.gen[3]] }
      case 2:
        return { label, cells: [stem + e.dat[0], stem + e.dat[1], stem + e.dat[0], stem + e.dat[3]] }
      case 3:
        return { label, cells: [word, stem + e.accF, stem + nom[2], stem + nom[3]] }
      case 4:
        return {
          label,
          cells: [stem + e.inst[0], stem + e.inst[1], stem + e.inst[0], stem + e.inst[3]]
        }
      default:
        return {
          label,
          cells: [stem + e.prep[0], stem + e.prep[1], stem + e.prep[0], stem + e.prep[3]]
        }
    }
  })
  return {
    lemma: word,
    lang: 'ru',
    kind: 'declension',
    note: 'Винительный падеж приведён для неодушевлённых прилагательных.',
    tables: [{ title: 'Склонение прилагательного', columns: ADJECTIVE_COLUMNS, rows }]
  }
}

// ── Data ────────────────────────────────────────────────────────────────

const VOWELS = 'аеёиоуыэюя'
const SHIPYASHCHIE = 'жшчщ'
const HARD_CONSONANTS = 'гкх' + SHIPYASHCHIE
const MUTABLE_CONSONANTS = 'тдзспбвмф'

const PRESENT_LABELS = ['я', 'ты', 'он/она/оно', 'мы', 'вы', 'они']
const PAST_LABELS = ['он', 'она', 'оно', 'они']
const IMPERATIVE_LABELS = ['ты', 'вы']
const FUTURE_AUX = ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут']

const CASES = ['Именительный', 'Родительный', 'Дательный', 'Винительный', 'Творительный', 'Предложный']

const FIRST_SOFT = ['ю', 'ешь', 'ет', 'ем', 'ете', 'ют']
const FIRST_HARD = ['у', 'ешь', 'ет', 'ем', 'ете', 'ут']
const SECOND_SOFT = ['ю', 'ишь', 'ит', 'им', 'ите', 'ят']
const SECOND_HARD = ['у', 'ишь', 'ит', 'им', 'ите', 'ат']

/** 1st-conj -ать verbs whose whole present stem mutates (писать -> пиш-). */
const MUTATED_1ST = new Map<string, string>([
  ['писать', 'пиш'],
  ['искать', 'ищ'],
  ['плакать', 'плач'],
  ['прятать', 'пряч'],
  ['мазать', 'маж'],
  ['резать', 'реж'],
  ['вязать', 'вяж'],
  ['сказать', 'скаж'],
  ['плясать', 'пляш'],
  ['шептать', 'шепч'],
  ['махать', 'маш'],
  ['слать', 'шл']
])

/** 2nd-conj verbs not ending in -ить (держать, видеть, стоять, ...). */
const SECOND_CONJ_AT = new Set<string>([
  'держать',
  'слышать',
  'дышать',
  'лежать',
  'кричать',
  'молчать',
  'видеть',
  'смотреть',
  'ненавидеть',
  'обидеть',
  'зависеть',
  'терпеть',
  'вертеть',
  'сидеть',
  'лететь',
  'шуметь',
  'гореть',
  'кипеть',
  'свистеть',
  'звенеть',
  'блестеть',
  'стоять'
])

/** Curated past tenses for consonant-stem and -нуть-without-нул verbs. */
const PAST_IRREGULAR = new Map<string, string>([
  ['сохнуть', 'сох'],
  ['мёрзнуть', 'мёрз'],
  ['мокнуть', 'мок'],
  ['зябнуть', 'зяб'],
  ['привыкнуть', 'привык'],
  ['исчезнуть', 'исчез'],
  ['гаснуть', 'гас'],
  ['крепнуть', 'креп'],
  ['замолкнуть', 'замолк']
])

/** Verbs whose imperative is not the plain 3pl-stem rule (встань, будь, ...). */
const IMPERATIVE_IRREGULAR = new Map<string, string[]>([
  ['быть', ['будь', 'будьте']],
  ['есть', ['ешь', 'ешьте']],
  ['встать', ['встань', 'встаньте']],
  ['сесть', ['сядь', 'сядьте']],
  ['лечь', ['ляг', 'лягте']],
  ['ставить', ['ставь', 'ставьте']],
  ['готовить', ['готовь', 'готовьте']],
  ['бросить', ['брось', 'бросьте']],
  ['тронуть', ['тронь', 'троньте']],
  ['класть', ['клади', 'кладите']],
  ['красть', ['кради', 'крадите']]
])

interface IrregularVerb {
  present: string[]
  past: string[]
  imperative?: string[]
  participle?: string | null
  gerund?: string | null
  presentIsFuture?: boolean
}

/** Common irregular verbs. presentIsFuture marks perfective verbs whose
 *  present-tense forms are used as the future. */
const IRREGULAR_VERBS = new Map<string, IrregularVerb>([
  [
    'быть',
    {
      present: ['буду', 'будешь', 'будет', 'будем', 'будете', 'будут'],
      past: ['был', 'была', 'было', 'были'],
      imperative: ['будь', 'будьте'],
      gerund: 'будучи',
      presentIsFuture: true
    }
  ],
  [
    'хотеть',
    {
      present: ['хочу', 'хочешь', 'хочет', 'хотим', 'хотите', 'хотят'],
      past: ['хотел', 'хотела', 'хотело', 'хотели'],
      participle: 'хотящий',
      gerund: 'хотя'
    }
  ],
  [
    'бежать',
    {
      present: ['бегу', 'бежишь', 'бежит', 'бежим', 'бежите', 'бегут'],
      past: ['бежал', 'бежала', 'бежало', 'бежали'],
      imperative: ['беги', 'бегите'],
      participle: 'бегущий'
    }
  ],
  [
    'дать',
    {
      present: ['дам', 'дашь', 'даст', 'дадим', 'дадите', 'дадут'],
      past: ['дал', 'дала', 'дало', 'дали'],
      imperative: ['дай', 'дайте'],
      participle: 'дающий',
      presentIsFuture: true
    }
  ],
  [
    'есть',
    {
      present: ['ем', 'ешь', 'ест', 'едим', 'едите', 'едят'],
      past: ['ел', 'ела', 'ело', 'ели'],
      imperative: ['ешь', 'ешьте'],
      participle: 'едящий'
    }
  ],
  [
    'идти',
    {
      present: ['иду', 'идёшь', 'идёт', 'идём', 'идёте', 'идут'],
      past: ['шёл', 'шла', 'шло', 'шли'],
      imperative: ['иди', 'идите'],
      participle: 'идущий',
      gerund: 'идя'
    }
  ],
  [
    'мочь',
    {
      present: ['могу', 'можешь', 'может', 'можем', 'можете', 'могут'],
      past: ['мог', 'могла', 'могло', 'могли'],
      imperative: ['моги', 'могите'],
      participle: 'могущий'
    }
  ],
  [
    'лечь',
    {
      present: ['лягу', 'ляжешь', 'ляжет', 'ляжем', 'ляжете', 'лягут'],
      past: ['лёг', 'леглá', 'легло', 'легли'],
      imperative: ['ляг', 'лягте'],
      participle: 'лягущий',
      presentIsFuture: true
    }
  ],
  [
    'печь',
    {
      present: ['пеку', 'печёшь', 'печёт', 'печём', 'печёте', 'пекут'],
      past: ['пёк', 'пекла', 'пекло', 'пекли'],
      imperative: ['пеки', 'пеките'],
      participle: 'пекущий'
    }
  ],
  [
    'беречь',
    {
      present: ['берегу', 'бережёшь', 'бережёт', 'бережём', 'бережёте', 'берегут'],
      past: ['берёг', 'берегла', 'берегло', 'берегли'],
      imperative: ['береги', 'берегите'],
      participle: 'берегущий'
    }
  ],
  [
    'жить',
    {
      present: ['живу', 'живёшь', 'живёт', 'живём', 'живёте', 'живут'],
      past: ['жил', 'жила', 'жило', 'жили'],
      imperative: ['живи', 'живите'],
      participle: 'живущий',
      gerund: 'живя'
    }
  ],
  [
    'пить',
    {
      present: ['пью', 'пьёшь', 'пьёт', 'пьём', 'пьёте', 'пьют'],
      past: ['пил', 'пила', 'пило', 'пили'],
      imperative: ['пей', 'пейте'],
      participle: 'пьющий'
    }
  ],
  [
    'спать',
    {
      present: ['сплю', 'спишь', 'спит', 'спим', 'спите', 'спят'],
      past: ['спал', 'спала', 'спало', 'спали'],
      imperative: ['спи', 'спите'],
      participle: 'спящий'
    }
  ],
  [
    'гнать',
    {
      present: ['гоню', 'гонишь', 'гонит', 'гоним', 'гоните', 'гонят'],
      past: ['гнал', 'гнала', 'гнало', 'гнали'],
      imperative: ['гони', 'гоните'],
      participle: 'гонящий',
      gerund: 'гоня'
    }
  ],
  [
    'слать',
    {
      present: ['шлю', 'шлёшь', 'шлёт', 'шлём', 'шлёте', 'шлют'],
      past: ['слал', 'слала', 'слало', 'слали'],
      imperative: ['шли', 'шлите'],
      participle: 'шлющий'
    }
  ],
  [
    'звать',
    {
      present: ['зову', 'зовёшь', 'зовёт', 'зовём', 'зовёте', 'зовут'],
      past: ['звал', 'звала', 'звало', 'звали'],
      imperative: ['зови', 'зовите'],
      participle: 'зовущий',
      gerund: 'зовя'
    }
  ],
  [
    'брать',
    {
      present: ['беру', 'берёшь', 'берёт', 'берём', 'берёте', 'берут'],
      past: ['брал', 'брала', 'брало', 'брали'],
      imperative: ['бери', 'берите'],
      participle: 'берущий'
    }
  ],
  [
    'взять',
    {
      present: ['возьму', 'возьмёшь', 'возьмёт', 'возьмём', 'возьмёте', 'возьмут'],
      past: ['взял', 'взяла', 'взяло', 'взяли'],
      imperative: ['возьми', 'возьмите'],
      presentIsFuture: true
    }
  ],
  [
    'вести',
    {
      present: ['веду', 'ведёшь', 'ведёт', 'ведём', 'ведёте', 'ведут'],
      past: ['вёл', 'вела', 'вело', 'вели'],
      imperative: ['веди', 'ведите'],
      participle: 'ведущий',
      gerund: 'ведя'
    }
  ],
  [
    'нести',
    {
      present: ['несу', 'несёшь', 'несёт', 'несём', 'несёте', 'несут'],
      past: ['нёс', 'несла', 'несло', 'несли'],
      imperative: ['неси', 'несите'],
      participle: 'несущий'
    }
  ],
  [
    'везти',
    {
      present: ['везу', 'везёшь', 'везёт', 'везём', 'везёте', 'везут'],
      past: ['вёз', 'везла', 'везло', 'везли'],
      imperative: ['вези', 'везите'],
      participle: 'везущий'
    }
  ],
  [
    'расти',
    {
      present: ['расту', 'растёшь', 'растёт', 'растём', 'растёте', 'растут'],
      past: ['рос', 'росла', 'росло', 'росли'],
      imperative: ['расти', 'растите'],
      participle: 'растущий'
    }
  ],
  [
    'сесть',
    {
      present: ['сяду', 'сядешь', 'сядет', 'сядем', 'сядете', 'сядут'],
      past: ['сел', 'села', 'село', 'сели'],
      imperative: ['сядь', 'сядьте'],
      participle: 'сядущий',
      presentIsFuture: true
    }
  ],
  [
    'класть',
    {
      present: ['кладу', 'кладёшь', 'кладёт', 'кладём', 'кладёте', 'кладут'],
      past: ['клал', 'клала', 'клало', 'клали'],
      participle: 'кладущий'
    }
  ],
  [
    'красть',
    {
      present: ['краду', 'крадёшь', 'крадёт', 'крадём', 'крадёте', 'крадут'],
      past: ['крал', 'крала', 'крало', 'крали'],
      participle: 'крадущий'
    }
  ],
  [
    'лезть',
    {
      present: ['лезу', 'лезешь', 'лезет', 'лезем', 'лезете', 'лезут'],
      past: ['лез', 'лезла', 'лезло', 'лезли'],
      imperative: ['лезь', 'лезьте'],
      participle: 'лезущий'
    }
  ],
  [
    'стричь',
    {
      present: ['стригу', 'стрижёшь', 'стрижёт', 'стрижём', 'стрижёте', 'стригут'],
      past: ['стриг', 'стригла', 'стригло', 'стригли'],
      imperative: ['стриги', 'стригите'],
      participle: 'стригущий'
    }
  ],
  [
    'течь',
    {
      present: ['теку', 'течёшь', 'течёт', 'течём', 'течёте', 'текут'],
      past: ['тёк', 'текла', 'текло', 'текли'],
      imperative: ['теки', 'теките'],
      participle: 'текущий'
    }
  ],
  [
    'жечь',
    {
      present: ['жгу', 'жжёшь', 'жжёт', 'жжём', 'жжёте', 'жгут'],
      past: ['жёг', 'жгла', 'жгло', 'жгли'],
      imperative: ['жги', 'жгите'],
      participle: 'жгущий'
    }
  ],
  [
    'плыть',
    {
      present: ['плыву', 'плывёшь', 'плывёт', 'плывём', 'плывёте', 'плывут'],
      past: ['плыл', 'плыла', 'плыло', 'плыли'],
      imperative: ['плыви', 'плывите'],
      participle: 'плывущий'
    }
  ],
  [
    'бить',
    {
      present: ['бью', 'бьёшь', 'бьёт', 'бьём', 'бьёте', 'бьют'],
      past: ['бил', 'била', 'било', 'били'],
      imperative: ['бей', 'бейте'],
      participle: 'бьющий'
    }
  ],
  [
    'вить',
    {
      present: ['вью', 'вьёшь', 'вьёт', 'вьём', 'вьёте', 'вьют'],
      past: ['вил', 'вила', 'вило', 'вили'],
      imperative: ['вей', 'вейте'],
      participle: 'вьющий'
    }
  ],
  [
    'шить',
    {
      present: ['шью', 'шьёшь', 'шьёт', 'шьём', 'шьёте', 'шьют'],
      past: ['шил', 'шила', 'шило', 'шили'],
      imperative: ['шей', 'шейте'],
      participle: 'шьющий'
    }
  ],
  [
    'брить',
    {
      present: ['брею', 'бреешь', 'бреет', 'бреем', 'бреете', 'бреют'],
      past: ['брил', 'брила', 'брило', 'брили'],
      imperative: ['брей', 'брейте'],
      participle: 'бреющий',
      gerund: 'брея'
    }
  ],
  [
    'стелить',
    {
      present: ['стелю', 'стелешь', 'стелет', 'стелем', 'стелете', 'стелют'],
      past: ['стелил', 'стелила', 'стелило', 'стелили'],
      imperative: ['стели', 'стелите'],
      participle: 'стелющий'
    }
  ]
])

/** Words the rule engine must not guess at (pronouns/function words -> LLM). */
const NOUN_RULE_EXCLUDED = new Set<string>([
  'я',
  'ты',
  'он',
  'она',
  'оно',
  'мы',
  'вы',
  'они',
  'кто',
  'что',
  'никто',
  'ничто',
  'этот',
  'эта',
  'это',
  'эти',
  'тот',
  'та',
  'то',
  'те',
  'весь',
  'вся',
  'всё',
  'все',
  'сам',
  'сама',
  'само',
  'сами',
  'мой',
  'моя',
  'моё',
  'мои',
  'твой',
  'твоя',
  'твоё',
  'наш',
  'наша',
  'наше',
  'наши',
  'ваш',
  'ваша',
  'ваше',
  'ваши',
  'свой',
  'своя',
  'своё',
  'один',
  'одна',
  'одно',
  'одни',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
  'десять',
  'сто',
  'тысяча',
  'миллион'
])

/** Masculine nouns ending in -а/-я (grammatically masculine). */
const MASCULINE_A = new Set<string>([
  'папа',
  'дедушка',
  'дядя',
  'мужчина',
  'юноша',
  'старшина',
  'воевода',
  'слуга',
  'коллега',
  'староста',
  'судья',
  'дедушка'
])

/** Common feminine -ь nouns (the -ость/-есть rule covers the rest). */
const FEMININE_SOFT = new Set<string>([
  'ночь',
  'мышь',
  'дверь',
  'площадь',
  'жизнь',
  'любовь',
  'кровь',
  'соль',
  'боль',
  'вещь',
  'помощь',
  'речь',
  'осень',
  'тетрадь',
  'степь',
  'грудь',
  'кость',
  'лошадь',
  'тень',
  'лень',
  'связь',
  'роль',
  'цель',
  'пыль',
  'сталь',
  'даль',
  'моль',
  'бровь',
  'мебель',
  'нефть',
  'сирень',
  'грязь',
  'цепь',
  'печать',
  'область',
  'весть',
  'честь',
  'часть',
  'власть',
  'страсть',
  'крепость',
  'скорость',
  'новость',
  'молодость',
  'старость',
  'смерть',
  'верность',
  'гордость',
  'радость',
  'песнь',
  'полночь',
  'полынь'
])

/** Feminine -а/-я nouns with a mobile-vowel genitive plural. */
const FEMININE_GENPL = new Map<string, string>([
  ['песня', 'песен'],
  ['земля', 'земель'],
  ['неделя', 'недель'],
  ['деревня', 'деревень'],
  ['кухня', 'кухонь'],
  ['спальня', 'спален'],
  ['вишня', 'вишен'],
  ['сотня', 'сотен'],
  ['башня', 'башен'],
  ['мечта', 'мечтаний']
])

/** Masculine nouns with plural -а and their genitive plural. */
const PLURAL_A = new Map<string, [string, string]>([
  ['дом', ['дома', 'домов']],
  ['город', ['города', 'городов']],
  ['поезд', ['поезда', 'поездов']],
  ['глаз', ['глаза', 'глаз']],
  ['лес', ['леса', 'лесов']],
  ['берег', ['берега', 'берегов']],
  ['адрес', ['адреса', 'адресов']],
  ['вечер', ['вечера', 'вечеров']],
  ['голос', ['голоса', 'голосов']],
  ['номер', ['номера', 'номеров']],
  ['остров', ['острова', 'островов']],
  ['паспорт', ['паспорта', 'паспортов']],
  ['учитель', ['учителя', 'учителей']],
  ['профессор', ['профессора', 'профессоров']],
  ['доктор', ['доктора', 'докторов']],
  ['якорь', ['якоря', 'якорей']]
])

/** Neuter -о nouns with a non-zero genitive plural. */
const NEUTER_GENPL = new Map<string, string>([
  ['окно', 'окон'],
  ['письмо', 'писем'],
  ['кольцо', 'колец'],
  ['яйцо', 'яиц'],
  ['стекло', 'стёкол'],
  ['село', 'сёл'],
  ['число', 'чисел'],
  ['озеро', 'озёр'],
  ['сердце', 'сердец'],
  ['облако', 'облаков']
])

/** Masculine nouns whose instrumental singular is stressed -ом after a sibilant. */
const SHIP_OM = new Set<string>([
  'нож',
  'карандаш',
  'мяч',
  'борщ',
  'врач',
  'ключ',
  'плащ',
  'ёж',
  'пляж',
  'этаж',
  'ковш',
  'кирпич',
  'обруч'
])

/** Full 12-form paradigms (sg: nom gen dat acc inst prep, then plural) for
 *  irregular nouns: -мя group, mobile vowels, plural -а, suppletive plurals. */
const IRREGULAR_NOUNS = new Map<string, string[]>([
  [
    'время',
    [
      'время',
      'времени',
      'времени',
      'время',
      'временем',
      'времени',
      'времена',
      'времён',
      'временам',
      'времена',
      'временами',
      'временах'
    ]
  ],
  [
    'имя',
    ['имя', 'имени', 'имени', 'имя', 'именем', 'имени', 'имена', 'имён', 'именам', 'имена', 'именами', 'именах']
  ],
  [
    'день',
    ['день', 'дня', 'дню', 'день', 'днём', 'дне', 'дни', 'дней', 'дням', 'дни', 'днями', 'днях']
  ],
  [
    'мать',
    [
      'мать',
      'матери',
      'матери',
      'мать',
      'матерью',
      'матери',
      'матери',
      'матерей',
      'матерям',
      'матерей',
      'матерями',
      'матерях'
    ]
  ],
  [
    'дочь',
    [
      'дочь',
      'дочери',
      'дочери',
      'дочь',
      'дочерью',
      'дочери',
      'дочери',
      'дочерей',
      'дочерям',
      'дочерей',
      'дочерями',
      'дочерях'
    ]
  ],
  [
    'человек',
    [
      'человек',
      'человека',
      'человеку',
      'человека',
      'человеком',
      'человеке',
      'люди',
      'людей',
      'людям',
      'людей',
      'людьми',
      'людях'
    ]
  ],
  [
    'ребёнок',
    [
      'ребёнок',
      'ребёнка',
      'ребёнку',
      'ребёнка',
      'ребёнком',
      'ребёнке',
      'дети',
      'детей',
      'детям',
      'детей',
      'детьми',
      'детях'
    ]
  ],
  [
    'друг',
    ['друг', 'друга', 'другу', 'друга', 'другом', 'друге', 'друзья', 'друзей', 'друзьям', 'друзей', 'друзьями', 'друзьях']
  ],
  [
    'ухо',
    ['ухо', 'уха', 'уху', 'ухо', 'ухом', 'ухе', 'уши', 'ушей', 'ушам', 'уши', 'ушами', 'ушах']
  ],
  [
    'глаз',
    ['глаз', 'глаза', 'глазу', 'глаз', 'глазом', 'глазе', 'глаза', 'глаз', 'глазам', 'глаза', 'глазами', 'глазах']
  ],
  [
    'отец',
    ['отец', 'отца', 'отцу', 'отца', 'отцом', 'отце', 'отцы', 'отцов', 'отцам', 'отцов', 'отцами', 'отцах']
  ],
  [
    'лев',
    ['лев', 'льва', 'льву', 'льва', 'львом', 'льве', 'львы', 'львов', 'львам', 'львов', 'львами', 'львах']
  ],
  [
    'сон',
    ['сон', 'сна', 'сну', 'сон', 'сном', 'сне', 'сны', 'снов', 'снам', 'сны', 'снами', 'снах']
  ],
  [
    'рот',
    ['рот', 'рта', 'рту', 'рот', 'ртом', 'рте', 'рты', 'ртов', 'ртам', 'рты', 'ртами', 'ртах']
  ],
  [
    'угол',
    ['угол', 'угла', 'углу', 'угол', 'углом', 'угле', 'углы', 'углов', 'углам', 'углы', 'углами', 'углах']
  ],
  [
    'дерево',
    [
      'дерево',
      'дерева',
      'дереву',
      'дерево',
      'деревом',
      'дереве',
      'деревья',
      'деревьев',
      'деревьям',
      'деревья',
      'деревьями',
      'деревьях'
    ]
  ],
  [
    'яблоко',
    [
      'яблоко',
      'яблока',
      'яблоку',
      'яблоко',
      'яблоком',
      'яблоке',
      'яблоки',
      'яблок',
      'яблокам',
      'яблоки',
      'яблоками',
      'яблоках'
    ]
  ]
])

/** Adjective endings: hard (новый), soft -ний (синий), possessive -ий (лисий).
 *  Each is (masculine, feminine, neuter, plural) for the nominative, then
 *  lists for genitive/dative/instrumental/prepositional (m, f, m, pl). */
const ADJ_HARD = ['ый', 'ая', 'ое', 'ые']
const ADJ_HARD_ENDING: AdjectiveEndings = {
  gen: ['ого', 'ой', 'ого', 'ых'],
  dat: ['ому', 'ой', 'ому', 'ым'],
  accF: 'ую',
  inst: ['ым', 'ой', 'ым', 'ыми'],
  prep: ['ом', 'ой', 'ом', 'ых']
}
const ADJ_SOFT = ['ий', 'яя', 'ее', 'ие']
const ADJ_SOFT_ENDING: AdjectiveEndings = {
  gen: ['его', 'ей', 'его', 'их'],
  dat: ['ему', 'ей', 'ему', 'им'],
  accF: 'юю',
  inst: ['им', 'ей', 'им', 'ими'],
  prep: ['ем', 'ей', 'ем', 'их']
}
const ADJ_POSSESSIVE = ['ий', 'ья', 'ье', 'ьи']
const ADJ_POSSESSIVE_ENDING: AdjectiveEndings = {
  gen: ['ьего', 'ьей', 'ьего', 'ьих'],
  dat: ['ьему', 'ьей', 'ьему', 'ьим'],
  accF: 'ью',
  inst: ['ьим', 'ьей', 'ьим', 'ьими'],
  prep: ['ьем', 'ьей', 'ьем', 'ьих']
}
const ADJECTIVE_COLUMNS = ['Masculine', 'Feminine', 'Neuter', 'Plural']

interface AdjectiveEndings {
  gen: string[]
  dat: string[]
  accF: string
  inst: string[]
  prep: string[]
}

export const RussianInflector: InflectionEngine = {
  engine: 'ru-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'ru') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(word)
      case 'declension':
        return decline(word, pos)
      default:
        if (pos == null || pos.trim() === '') {
          return looksLikeVerb(word) ? conjugate(word) ?? decline(word, null) : decline(word, null)
        }
        return {
          lemma,
          lang: 'ru',
          kind: null,
          note: 'Наречия и служебные части речи не изменяются в русском языке.',
          tables: []
        }
    }
  }
}
