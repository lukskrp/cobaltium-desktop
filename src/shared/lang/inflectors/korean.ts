import type { InflectionEngine, InflectionParadigm, ParadigmKind, ParadigmTable } from '../inflection'

/**
 * Bundled Korean (ko) inflector: deterministic, offline LangDex paradigms.
 *
 * Korean does not conjugate for person or number; tense is marked on a single
 * verb form in the polite 해요체 register (가다 -> 가요, 먹다 -> 먹어요). The
 * three main tenses are present (현재), past (과거) and future (미래) — 가요 /
 * 갔어요 / 갈 거예요 — plus a speech-level table (높임말) for the irregular
 * verbs showing 해요체 / 해체 / 합쇼체 (가요 / 가 / 갑니다).
 *
 * Present forms follow vowel harmony: bright vowels (ㅏ ㅑ ㅗ ㅛ) take -아요 and
 * dark vowels take -어요, with the classic contractions 가+아요 -> 가요,
 * 오/보+아요 -> 와요/봐요, 하+아요 -> 해요, 쓰+어요 -> 써요 and 시/지+어요 ->
 * 셔요/져요 (마시다 -> 마셔요). A curated table pins the exact forms of the
 * common verbs; anything else is derived from the stem (the infinitive minus
 * 다). The past is stem + -았어요 (bright) / -었어요 (dark) / -했어요 (하) and
 * the future is stem + -(으)ㄹ 거예요.
 *
 * Adjectives conjugate exactly like verbs (좋다 -> 좋아요). Nouns do not
 * inflect at all: particles (은/는, 이/가, 을/를, 에) are postpositions, so we
 * return a kind=null paradigm with an explanatory note. Pronouns, adverbs and
 * other closed classes fall through to the LLM tier.
 */
export const KoreanInflector: InflectionEngine = {
  engine: 'ko-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'ko') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(word)
      case 'declension':
        return nounNote(word)
      default:
        if (pos === null || pos.trim() === '') {
          if (looksLikeVerb(word)) {
            const conjugated = conjugate(word)
            return conjugated ?? nounNote(word)
          }
          return nounNote(word)
        }
        return null // unhandled POS (pronoun, adverb, ...) -> LLM tier
    }
  }
}

function classify(pos: string | null): ParadigmKind | null {
  switch (pos?.toLowerCase()) {
    case 'verb':
    case 'adjective':
      return 'conjugation'
    case 'noun':
      return 'declension'
    default:
      return null
  }
}

function looksLikeVerb(word: string): boolean {
  return word.endsWith('다')
}

// ── Verbs ───────────────────────────────────────────────────────────────

function conjugate(word: string): InflectionParadigm | null {
  if (!word.endsWith('다')) return null
  const stem = word.slice(0, -1)
  if (stem === '') return null
  const curated = CURATED.get(word)

  const tables: ParadigmTable[] = []
  tables.push(tenseTable('현재', curated ? curated.present : presentForm(stem)))
  tables.push(tenseTable('과거', curated ? curated.past : pastForm(stem)))
  tables.push(tenseTable('미래', curated ? curated.future : futureForm(stem)))
  const high = curated?.high
  if (high) {
    tables.push({
      title: '높임말',
      columns: ['형태'],
      rows: [
        { label: '해요체', cells: [high[0]] },
        { label: '해체', cells: [high[1]] },
        { label: '합쇼체', cells: [high[2]] }
      ]
    })
  }
  return {
    lemma: word,
    lang: 'ko',
    kind: 'conjugation',
    note: '부정: 안 + 동사 (안 먹어요) 또는 -지 않아요 (먹지 않아요). 의문문은 어순이 바뀌지 않습니다.',
    tables
  }
}

function tenseTable(title: string, form: string): ParadigmTable {
  return {
    title,
    columns: ['형태'],
    rows: [{ label: '해요체', cells: [form] }]
  }
}

/**
 * Present (해요체) from the stem: vowel harmony picks -아요 (ㅏ ㅑ ㅗ ㅛ)
 * or -어요, then open-syllable contractions collapse 가+아요 -> 가요,
 * 오/보+아요 -> 와요/봐요, 쓰+어요 -> 써요, 시/지+어요 -> 셔요/져요 and
 * 하+아요 -> 해요.
 */
function presentForm(stem: string): string {
  if (stem.endsWith('하')) return stem.slice(0, -1) + '해요'
  const syl = lastSyllable(stem)
  if (!syl) return stem + '어요'
  const open = syl.coda === 0
  if (BRIGHT_VOWELS.has(syl.vowel) && open && syl.vowel === 'ㅏ') return stem + '요' // 가요, 자요
  if (BRIGHT_VOWELS.has(syl.vowel) && open && syl.vowel === 'ㅗ')
    return replaceLastVowel(stem, 'ㅘ') + '요' // 와요, 봐요
  if (BRIGHT_VOWELS.has(syl.vowel)) return stem + '아요' // 살아요, 놀아요
  if (open && syl.vowel === 'ㅡ') return replaceLastVowel(stem, 'ㅓ') + '요' // 써요
  if (open && syl.vowel === 'ㅣ' && (stem.endsWith('시') || stem.endsWith('지')))
    return replaceLastVowel(stem, 'ㅕ') + '요' // 마셔요, 져요
  return stem + '어요' // 먹어요, 읽어요, 주어요
}

/**
 * Past (해요체): bright stems take -았어요 (contracted to 갔어요, 왔어요,
 * 봤어요), 하 stems take -했어요 and everything else takes -었어요.
 */
function pastForm(stem: string): string {
  if (stem.endsWith('하')) return stem.slice(0, -1) + '했어요'
  const syl = lastSyllable(stem)
  if (!syl) return stem + '었어요'
  const open = syl.coda === 0
  if (BRIGHT_VOWELS.has(syl.vowel) && open && syl.vowel === 'ㅏ')
    return replaceLastCoda(stem, CODA_SSANG_SIOT) + '어요' // 갔어요, 잤어요
  if (BRIGHT_VOWELS.has(syl.vowel) && open && syl.vowel === 'ㅗ')
    return replaceLastCoda(replaceLastVowel(stem, 'ㅘ'), CODA_SSANG_SIOT) + '어요' // 왔어요, 봤어요
  if (BRIGHT_VOWELS.has(syl.vowel)) return stem + '았어요' // 살았어요, 놀았어요
  return stem + '었어요' // 먹었어요, 읽었어요
}

/**
 * Future: stem + -(으)ㄹ 거예요 — a consonant batchim takes 을 (먹을 거예요),
 * an open syllable takes ㄹ (갈 거예요), and a stem already ending in ㄹ
 * keeps just the ㄹ (살 거예요, 만들 거예요).
 */
function futureForm(stem: string): string {
  const coda = lastSyllable(stem)?.coda ?? 0
  if (coda === CODA_RIEUL) return stem + ' 거예요' // 살 거예요, 놀 거예요
  if (coda === 0) return replaceLastCoda(stem, CODA_RIEUL) + ' 거예요' // 갈 거예요, 만날 거예요
  return stem + '을 거예요' // 먹을 거예요, 읽을 거예요
}

// ── Nouns ───────────────────────────────────────────────────────────────

function nounNote(word: string): InflectionParadigm {
  return {
    lemma: word,
    lang: 'ko',
    kind: null,
    note: '조사(은/는, 이/가, 을/를, 에)는 굴절이 아니라 후치사입니다. 명사는 형태가 변하지 않습니다.',
    tables: []
  }
}

// ── Hangul helpers ──────────────────────────────────────────────────────

/** Medial vowel jamo by syllable-medial index (0..20), as in U+1161... */
const MEDIAL: readonly string[] = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ',
  'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
]

/** Bright vowels select -아요 (and past -았어요); everything else -어요/-었어요. */
const BRIGHT_VOWELS: ReadonlySet<string> = new Set(['ㅏ', 'ㅑ', 'ㅗ', 'ㅛ'])

// Coda (batchim) indices in the Hangul syllable FINAL table.
const CODA_RIEUL = 8 // ㄹ
const CODA_SSANG_SIOT = 20 // ㅆ

interface Syllable {
  onset: number
  vowel: string
  coda: number
}

function decompose(ch: string): Syllable | null {
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return null
  const index = code - 0xac00
  return {
    onset: Math.floor(index / (21 * 28)),
    vowel: MEDIAL[Math.floor((index % (21 * 28)) / 28)],
    coda: index % 28
  }
}

function compose(onset: number, vowel: number, coda: number): string {
  return String.fromCharCode(0xac00 + onset * 21 * 28 + vowel * 28 + coda)
}

function lastSyllable(stem: string): Syllable | null {
  if (stem.length === 0) return null
  return decompose(stem[stem.length - 1])
}

/** Rebuilds the stem's final syllable with a different medial vowel (오 -> 와). */
function replaceLastVowel(stem: string, vowel: string): string {
  const s = lastSyllable(stem)
  if (!s) return stem
  return stem.slice(0, -1) + compose(s.onset, MEDIAL.indexOf(vowel), s.coda)
}

/** Rebuilds the stem's final syllable with a different coda (가 -> 갔). */
function replaceLastCoda(stem: string, coda: number): string {
  const s = lastSyllable(stem)
  if (!s) return stem
  return stem.slice(0, -1) + compose(s.onset, MEDIAL.indexOf(s.vowel), coda)
}

// ── Data ────────────────────────────────────────────────────────────────

interface VerbForms {
  present: string
  past: string
  future: string
  high?: string[] // 해요체, 해체, 합쇼체
}

/** Exact forms for the common verbs; everything else is derived from the stem. */
const CURATED: ReadonlyMap<string, VerbForms> = new Map([
  ['가다', { present: '가요', past: '갔어요', future: '갈 거예요', high: ['가요', '가', '갑니다'] }],
  ['오다', { present: '와요', past: '왔어요', future: '올 거예요', high: ['와요', '와', '옵니다'] }],
  ['보다', { present: '봐요', past: '봤어요', future: '볼 거예요' }],
  ['하다', { present: '해요', past: '했어요', future: '할 거예요', high: ['해요', '해', '합니다'] }],
  ['먹다', { present: '먹어요', past: '먹었어요', future: '먹을 거예요', high: ['먹어요', '먹어', '먹습니다'] }],
  ['읽다', { present: '읽어요', past: '읽었어요', future: '읽을 거예요' }],
  ['마시다', { present: '마셔요', past: '마셨어요', future: '마실 거예요' }],
  ['살다', { present: '살아요', past: '살았어요', future: '살 거예요' }],
  ['주다', { present: '주어요', past: '주었어요', future: '줄 거예요' }],
  ['만들다', { present: '만들어요', past: '만들었어요', future: '만들 거예요' }],
  ['자다', { present: '자요', past: '잤어요', future: '잘 거예요' }],
  ['쓰다', { present: '써요', past: '썼어요', future: '쓸 거예요' }],
  ['놀다', { present: '놀아요', past: '놀았어요', future: '놀 거예요' }],
  ['배우다', { present: '배워요', past: '배웠어요', future: '배울 거예요' }],
  ['공부하다', { present: '공부해요', past: '공부했어요', future: '공부할 거예요' }],
  ['좋아하다', { present: '좋아해요', past: '좋아했어요', future: '좋아할 거예요' }]
])
