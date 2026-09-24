import type { InflectionParadigm, ParadigmRow } from '../../inflection'
import {
  abessive,
  ablative,
  adessive,
  elative,
  essive,
  inessive,
  isBack,
  partitive,
  weakStem
} from './phonology'

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

export const FinnishDecliner = {
  decline(nominative: string): InflectionParadigm | null {
    const word = nominative.trim().toLowerCase()
    if (word === '') return null
    if (word.endsWith('nen')) return type3(word)
    if ('aouyäö'.includes(word.charAt(word.length - 1))) return type1(word)
    return null
  }
}

// ── Type 1 (vowel-final) ───────────────────────────────────────────────
function type1(word: string): InflectionParadigm {
  const strong = word
  const weak = weakStem(word)
  const back = isBack(word)
  const part = partitive(back)
  const last = word.charAt(word.length - 1)

  let pluralStem: string
  if (last === 'a') pluralStem = strong.slice(0, -1) + 'o'
  else if (last === 'ä') pluralStem = strong.slice(0, -1)
  else pluralStem = strong

  const endsVowel = 'aeiouyäö'.includes(pluralStem.charAt(pluralStem.length - 1))
  const genPl = pluralStem + (endsVowel ? 'jen' : 'ien')
  const partPl = pluralStem + (endsVowel ? (back ? 'ja' : 'jä') : back ? 'ia' : 'iä')
  const illPl = pluralStem + (endsVowel ? 'ihin' : 'iin')
  const iEnd = pluralStem + 'i'

  const sg = [
    word,
    weak + 'n',
    strong + part,
    weak + inessive(back),
    weak + elative(back),
    strong + last + 'n',
    weak + adessive(back),
    weak + ablative(back),
    weak + 'lle',
    strong + essive(back),
    weak + 'ksi',
    weak + 'n',
    strong + abessive(back),
    pluralStem + 'ine',
    weak + 'n'
  ]
  const pl = [
    weak + 't',
    genPl,
    partPl,
    iEnd + inessive(back),
    iEnd + elative(back),
    illPl,
    iEnd + adessive(back),
    iEnd + ablative(back),
    iEnd + 'lle',
    iEnd + essive(back),
    iEnd + 'ksi',
    iEnd + 'n',
    iEnd + abessive(back),
    iEnd + 'ne',
    weak + 't'
  ]
  return paradigm(word, sg, pl)
}

// ── Type 3 (-nen) ──────────────────────────────────────────────────────
function type3(word: string): InflectionParadigm {
  const stem = word.slice(0, -3) + 'se' // nainen -> naise, ihminen -> ihmise
  const cons = stem.slice(0, -1) // nais, ihmis
  const back = isBack(word)

  const sg = [
    word,
    stem + 'n',
    cons + (back ? 'ta' : 'tä'),
    stem + inessive(back),
    stem + elative(back),
    stem + 'en',
    stem + adessive(back),
    stem + ablative(back),
    stem + 'lle',
    stem + essive(back),
    stem + 'ksi',
    stem + 'n',
    stem + abessive(back),
    cons + 'ine',
    stem + 'n'
  ]
  const pl = [
    cons + 'et',
    cons + 'ten',
    cons + (back ? 'ia' : 'iä'),
    cons + inessive(back),
    cons + elative(back),
    cons + 'iin',
    cons + adessive(back),
    cons + ablative(back),
    cons + 'lle',
    cons + essive(back),
    cons + 'iksi',
    cons + 'in',
    cons + abessive(back),
    cons + 'ine',
    cons + 'et'
  ]
  return paradigm(word, sg, pl)
}

function paradigm(lemma: string, singular: string[], plural: string[]): InflectionParadigm {
  const rows: ParadigmRow[] = CASES.map((label, i) => ({
    label,
    cells: [singular[i], plural[i]]
  }))
  return {
    lemma,
    lang: 'fi',
    kind: 'declension',
    note: '',
    tables: [{ title: 'Declension', columns: ['Singular', 'Plural'], rows }]
  }
}
