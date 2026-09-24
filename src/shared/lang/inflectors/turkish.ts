import type { InflectionEngine, InflectionParadigm, ParadigmKind, ParadigmTable } from '../inflection'

/**
 * Bundled Turkish (tr) inflector: deterministic, offline LangDex paradigms.
 *
 * Turkish is agglutinative with vowel harmony. Suffixes come in front/back
 * (-ler/-lar) or 4-way (-in/-ın/-ün/-un) variants depending on the last vowel
 * of the stem; vowel-initial suffixes take a -y- buffer after vowels (araba ->
 * arabayı) and voice a final p/ç/t/k (kitap -> kitabı, gitmek -> gidiyor).
 *
 * Nouns: six cases (nominative, genitive, dative, accusative, locative,
 * ablative) x singular/plural. Curated sets cover words with consonant voicing
 * (kitap -> kitab-) and vowel dropping (şehir -> şehr-).
 *
 * Verbs: seven moods/tenses — şimdiki zaman (-iyor), geniş zaman (aorist),
 * geçmiş zaman (-di/-miş), gelecek zaman (-ecek), şart kipi (-se), emir kipi
 * (imperative), plus the verbal noun (mastar), participle (ortaç) and gerund
 * (ulaç). The aorist distinguishes vowel stems (okur), monosyllabic stems
 * (gider, yazar) and polysyllabic stems (çalışır), with the classic -ir
 * exceptions (gelir, bilir, olur, görür...). The past tenses assimilate the
 * suffix to unvoiced stem finals (git -> gitti).
 *
 * Adjectives do not agree in Turkish (no inflection); pronouns/function words
 * go to the LLM tier.
 */
export const TurkishInflector: InflectionEngine = {
  engine: 'tr-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'tr') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const kind = classify(pos)
    if (kind === 'conjugation') return conjugate(word)
    if (kind === 'declension') {
      if (pos?.toLowerCase() === 'adjective') {
        return noInflection(
          word,
          'Sıfatlar Türkçede çekimlenmez; önüne geldikleri adla uyum göstermezler (güzel ev, güzel evler).'
        )
      }
      return nounParadigm(word)
    }
    if (pos != null && PRONOUN_LIKE.has(pos.toLowerCase())) return null
    if ((pos == null || pos.trim() === '') && looksLikeVerb(word)) {
      return conjugate(word) ?? nounParadigm(word)
    }
    if (pos == null || pos.trim() === '') return nounParadigm(word)
    return noInflection(word, 'Edatlar ve zarflar Türkçede çekimlenmez.')
  }
}

function classify(pos: string | null): ParadigmKind | null {
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

const PRONOUN_LIKE = new Set(['pronoun', 'determiner', 'numeral'])

function looksLikeVerb(word: string): boolean {
  return word.endsWith('mek') || word.endsWith('mak')
}

// ── Vowel harmony helpers ───────────────────────────────────────────────

const VOWELS = 'aeıioöuü'

function lastVowel(s: string): string | null {
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i]
    if (VOWELS.includes(ch)) return ch
  }
  return null
}

function isFront(v: string): boolean {
  return 'eiöü'.includes(v)
}

function h2(v: string, front: string, back: string): string {
  return isFront(v) ? front : back
}

function h4(v: string, e: string, a: string, o: string, u: string): string {
  switch (v) {
    case 'e':
    case 'i':
      return e
    case 'a':
    case 'ı':
      return a
    case 'ö':
    case 'ü':
      return o
    default:
      return u
  }
}

/** -y- buffer inserted between a vowel-final stem and a vowel-initial suffix. */
function buffer(stem: string): string {
  return VOWELS.includes(stem[stem.length - 1]) ? 'y' : ''
}

/** Final p/ç/t/k voices to b/c/d/ğ before vowel-initial suffixes (kitap -> kitab-). */
function voiceStem(word: string): string {
  switch (word[word.length - 1]) {
    case 'p':
      return word.slice(0, -1) + 'b'
    case 'ç':
      return word.slice(0, -1) + 'c'
    case 't':
      return word.slice(0, -1) + 'd'
    case 'k':
      return word.slice(0, -1) + 'ğ'
    default:
      return word
  }
}

/** Vowel-drop nouns (şehir -> şehr-) for vowel-initial case suffixes. */
function weakStem(word: string): string {
  return VOWEL_DROP.get(word) ?? (VOICING.has(word) ? voiceStem(word) : word)
}

// ── Nouns ───────────────────────────────────────────────────────────────

function nounParadigm(word: string): InflectionParadigm | null {
  const v = lastVowel(word)
  if (v == null) return null
  const weak = weakStem(word)
  const b = buffer(weak) // -y- buffer before vowel-initial dative/accusative
  const nb = VOWELS.includes(weak[weak.length - 1]) ? 'n' : '' // genitive takes -n- after vowels
  // Locative/ablative keep the original stem and devoice the suffix after
  // unvoiced finals (kitap -> kitapta, not kitapda).
  const unvoiced = 'pçtksşfh'.includes(word[word.length - 1])
  const loc = h2(v, 'de', 'da')
  const abl = h2(v, 'den', 'dan')
  const sg = [
    word,
    weak + nb + h4(v, 'in', 'ın', 'ün', 'un'),
    weak + b + h2(v, 'e', 'a'),
    weak + b + h4(v, 'i', 'ı', 'ü', 'u'),
    word + (unvoiced ? loc.replace('d', 't') : loc),
    word + (unvoiced ? abl.replace('d', 't') : abl)
  ]
  const pl = word + h2(v, 'ler', 'lar')
  const pv = lastVowel(pl) ?? v
  const pb = buffer(pl)
  const pnb = VOWELS.includes(pl[pl.length - 1]) ? 'n' : ''
  const punv = 'pçtksşfh'.includes(pl[pl.length - 1])
  const plForms = [
    pl,
    pl + pnb + h4(pv, 'in', 'ın', 'ün', 'un'),
    pl + pb + h2(pv, 'e', 'a'),
    pl + pb + h4(pv, 'i', 'ı', 'ü', 'u'),
    pl + (punv ? loc.replace('d', 't') : loc),
    pl + (punv ? abl.replace('d', 't') : abl)
  ]
  const rows = CASES.map((label, i) => ({ label, cells: [sg[i], plForms[i]] }))
  return {
    lemma: word,
    lang: 'tr',
    kind: 'declension',
    note: 'İyelik ekleri ayrı bir tabloda gösterilir (benim evim). Olumsuzluk: -me/-ma.',
    tables: [{ title: 'İsim çekimi', columns: ['Tekil', 'Çoğul'], rows }]
  }
}

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(inf: string): InflectionParadigm | null {
  let stem: string
  if (inf.endsWith('mek')) stem = inf.slice(0, -3)
  else if (inf.endsWith('mak')) stem = inf.slice(0, -3)
  else return null
  const v = lastVowel(stem)
  if (v == null) return null
  // Soft stem for vowel-initial suffixes (git -> gid-iyor, yemek -> yi-yor).
  const soft = VOWEL_CHANGE.get(inf) ?? voiceStem(stem)

  const tables: ParadigmTable[] = []
  tables.push({
    title: 'Şimdiki zaman',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [continuous(soft, v)[i]] }))
  })
  tables.push({
    title: 'Geniş zaman',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [aorist(inf, stem, soft, v)[i]] }))
  })
  tables.push({
    title: 'Geçmiş zaman (-di)',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [pastDi(stem, v)[i]] }))
  })
  tables.push({
    title: 'Geçmiş zaman (-miş)',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [pastMis(stem, v)[i]] }))
  })
  tables.push({
    title: 'Gelecek zaman',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [future(soft, v)[i]] }))
  })
  tables.push({
    title: 'Şart kipi',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [conditional(stem, v)[i]] }))
  })
  const emir = imperative(soft, stem, v)
  tables.push({
    title: 'Emir kipi',
    columns: ['Form'],
    rows: IMPERATIVE_LABELS.map((l, i) => ({ label: l, cells: [emir[i]] }))
  })
  const vn = stem + h2(v, 'mek', 'mak')
  tables.push({
    title: 'Adlaşmış biçimler',
    columns: ['Form'],
    rows: [
      { label: 'Mastar', cells: [vn] },
      { label: 'Ortaç', cells: [soft + buffer(soft) + h2(v, 'en', 'an')] },
      { label: 'Ulaç', cells: [soft + buffer(soft) + h2(v, 'erek', 'arak')] }
    ]
  })
  return {
    lemma: inf,
    lang: 'tr',
    kind: 'conjugation',
    note: 'Olumsuzluk: -me/-ma (gelmiyorum). Soru eki: -mi/-mı/-mü/-mu.',
    tables
  }
}

/** Şimdiki zaman: geliyorum, okuyorum, yazıyorum, yiyorum. */
function continuous(soft: string, v: string): string[] {
  // The soft stem is the base for every vowel-initial suffix, so yemek -> yiyor
  // (not yeyor) while okumak -> okuyor still gets the plain -yor.
  const base =
    soft + (VOWELS.includes(soft[soft.length - 1]) ? 'yor' : h4(v, 'iyor', 'ıyor', 'üyor', 'uyor'))
  return [base + 'um', base + 'sun', base, base + 'uz', base + 'sunuz', base + 'lar']
}

/** Geniş zaman (aorist): okur, gider, yazar, gelir, çalışır, konuşur. */
function aorist(inf: string, stem: string, soft: string, v: string): string[] {
  const base =
    AORIST_IR.get(inf) ??
    (VOWELS.includes(stem[stem.length - 1])
      ? stem + 'r' // okur
      : vowelGroups(stem) === 1
        ? soft + h2(v, 'er', 'ar') // gider, yazar
        : stem + h4(v, 'ir', 'ır', 'ür', 'ur')) // çalışır, konuşur
  const av = lastVowel(base) ?? v
  return [
    base + h4(av, 'im', 'ım', 'üm', 'um'),
    base + h4(av, 'sin', 'sın', 'sün', 'sun'),
    base,
    base + h4(av, 'iz', 'ız', 'üz', 'uz'),
    base + h4(av, 'siniz', 'sınız', 'sünüz', 'sunuz'),
    base + h2(av, 'ler', 'lar')
  ]
}

/** Geçmiş zaman (-di): geldim, gittim, yazdım, okudum. */
function pastDi(stem: string, v: string): string[] {
  const unvoiced = 'pçtksşfh'.includes(stem[stem.length - 1])
  const suffix = unvoiced ? h4(v, 'ti', 'tı', 'tü', 'tu') : h4(v, 'di', 'dı', 'dü', 'du')
  const base = stem + suffix
  // -di ends in a vowel, so person endings attach without a buffer vowel
  // (geldim, geldin, geldik, geldiniz).
  return [
    base + 'm',
    base + 'n',
    base,
    base + 'k',
    base + 'niz',
    base + h2(lastVowel(base) ?? v, 'ler', 'lar') // okudular, geldiler
  ]
}

/** Geçmiş zaman (-miş): gelmişim, okumuşum. */
function pastMis(stem: string, v: string): string[] {
  const base = stem + h4(v, 'miş', 'mış', 'müş', 'muş')
  const pv = lastVowel(base) ?? v
  return [
    base + h4(pv, 'im', 'ım', 'üm', 'um'),
    base + h4(pv, 'sin', 'sın', 'sün', 'sun'),
    base,
    base + h4(pv, 'iz', 'ız', 'üz', 'uz'),
    base + h4(pv, 'siniz', 'sınız', 'sünüz', 'sunuz'),
    base + h2(pv, 'ler', 'lar')
  ]
}

/** Gelecek zaman: geleceğim, okuyacağım. */
function future(soft: string, v: string): string[] {
  const base = soft + buffer(soft) + h2(v, 'ecek', 'acak')
  const softened = base.slice(0, -1) + 'ğ' // -k -> -ğ before a vowel suffix
  const pv = lastVowel(base) ?? v
  return [
    softened + h4(pv, 'im', 'ım', 'üm', 'um'),
    base + h4(pv, 'sin', 'sın', 'sün', 'sun'),
    base,
    softened + h4(pv, 'iz', 'ız', 'üz', 'uz'),
    base + h4(pv, 'siniz', 'sınız', 'sünüz', 'sunuz'),
    base + h2(pv, 'ler', 'lar')
  ]
}

/** Şart kipi: gelsem, okusam, gitse. */
function conditional(stem: string, v: string): string[] {
  const base = stem + h2(v, 'se', 'sa')
  return [base + 'm', base + 'n', base, base + 'k', base + 'niz', base + 'ler']
}

/** Emir kipi: gel!, gelsin, gelelim, gelin, gelsinler. */
function imperative(soft: string, stem: string, v: string): string[] {
  const sen = stem
  const o = stem + h4(v, 'sin', 'sın', 'sun', 'sün')
  const biz = soft + buffer(soft) + h2(v, 'elim', 'alım')
  const siz = soft + buffer(soft) + h4(v, 'in', 'ın', 'un', 'ün')
  const onlar = o + h2(v, 'ler', 'lar')
  return [sen, o, biz, siz, onlar]
}

function vowelGroups(s: string): number {
  let count = 0
  let inVowel = false
  for (let i = 0; i < s.length; i++) {
    const isV = VOWELS.includes(s[i])
    if (isV && !inVowel) count++
    inVowel = isV
  }
  return count
}

// ── Data ────────────────────────────────────────────────────────────────

const PERSONS = ['ben', 'sen', 'o', 'biz', 'siz', 'onlar']
const IMPERATIVE_LABELS = ['sen', 'o', 'biz', 'siz', 'onlar']

const CASES = [
  'Yalın',
  'İlgeç (-in)',
  'Yönelme (-e)',
  'Belirtme (-i)',
  'Bulunma (-de)',
  'Ayrılma (-den)'
]

/** Nouns whose final p/ç/t/k voices before vowel-initial suffixes (kitap -> kitabın). */
const VOICING: Set<string> = new Set([
  'kitap',
  'kanat',
  'ağaç',
  'yaprak',
  'ayak',
  'kulak',
  'yatak',
  'çorap',
  'kebap',
  'dolap',
  'tabak',
  'balık',
  'mektup',
  'toprak',
  'kağıt',
  'bilet',
  'kebap',
  'renk',
  'sürat',
  'kanat',
  'kilit'
])

/** Nouns losing a middle vowel before vowel-initial suffixes (şehir -> şehrin). */
const VOWEL_DROP: Map<string, string> = new Map([
  ['şehir', 'şehr'],
  ['isim', 'ism'],
  ['burun', 'burn'],
  ['nehir', 'nehr'],
  ['devir', 'devr'],
  ['alın', 'aln'],
  ['boyun', 'boyn'],
  ['oğul', 'oğl'],
  ['göğüs', 'göğs'],
  ['karın', 'karn'],
  ['beyin', 'beyn'],
  ['resim', 'resm'],
  ['ağız', 'ağz'],
  ['benzin', 'benz'],
  ['zamir', 'zamr'],
  ['zihin', 'zihn']
])

/** Monosyllabic verbs taking the -ir aorist (gelir, bilir, olur, görür, ...). */
const AORIST_IR: Map<string, string> = new Map([
  ['gelmek', 'gelir'],
  ['bilmek', 'bilir'],
  ['vermek', 'verir'],
  ['almak', 'alır'],
  ['kalmak', 'kalır'],
  ['olmak', 'olur'],
  ['durmak', 'durur'],
  ['görmek', 'görür'],
  ['ölmek', 'ölür'],
  ['varmak', 'varır'],
  ['sanmak', 'sanır']
])

/** Verbs whose soft stem changes its vowel (yemek -> yiyor, demek -> diyor). */
const VOWEL_CHANGE: Map<string, string> = new Map([
  ['yemek', 'yi'],
  ['demek', 'di']
])

function noInflection(word: string, note: string): InflectionParadigm {
  return { lemma: word, lang: 'tr', kind: null, note, tables: [] }
}
