/**
 * Romanizers: native script -> Latin (port of `roman/*.kt`).
 */

export interface Romanization {
  source: string
  latin: string
  scheme: string
}

export interface Romanizer {
  readonly scheme: string
  romanize(text: string): Romanization
}

function cpAt(text: string, index: number): number | null {
  return index < text.length ? (text.codePointAt(index) as number) : null
}

function cpSize(cp: number): number {
  return cp > 0xffff ? 2 : 1
}

/** Base for letter-map romanizers with an optional multi-character rule hook. */
export abstract class LetterMapRomanizer implements Romanizer {
  constructor(
    readonly scheme: string,
    private readonly letters: Map<number, string>
  ) {}

  romanize(text: string): Romanization {
    return { source: text, latin: this.apply(text), scheme: this.scheme }
  }

  protected apply(text: string): string {
    let out = ''
    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const n = cpSize(cp)
      const rule = this.transform(text, i)
      if (rule !== null) {
        out += rule.replacement
        i += rule.consumed
        continue
      }
      out += this.letters.get(cp) ?? text.slice(i, i + n)
      i += n
    }
    return out
  }

  protected transform(
    _text: string,
    _index: number
  ): { replacement: string; consumed: number } | null {
    return null
  }

  protected codepointOf(text: string, index: number): number | null {
    return cpAt(text, index)
  }
}

// ── ISO 9:1995 (Cyrillic) ─────────────────────────────────────────────────
const ISO9_LETTERS = new Map<number, string>([
  [0x0430, 'a'], [0x0431, 'b'], [0x0432, 'v'], [0x0433, 'g'], [0x0434, 'd'],
  [0x0435, 'e'], [0x0451, '\u00EB'], [0x0436, '\u017E'], [0x0437, 'z'],
  [0x0438, 'i'], [0x0439, 'j'], [0x043A, 'k'], [0x043B, 'l'], [0x043C, 'm'],
  [0x043D, 'n'], [0x043E, 'o'], [0x043F, 'p'], [0x0440, 'r'], [0x0441, 's'],
  [0x0442, 't'], [0x0443, 'u'], [0x0444, 'f'], [0x0445, 'h'], [0x0446, 'c'],
  [0x0447, '\u010D'], [0x0448, '\u0161'], [0x0449, '\u015D'], [0x044A, '\u02BA'],
  [0x044B, 'y'], [0x044C, '\u02B9'], [0x044D, '\u00E8'], [0x044E, '\u00FB'],
  [0x044F, '\u00E2'],
  [0x0456, '\u00EC'], [0x0457, '\u00EF'], [0x0454, '\u00EA'], [0x0491, 'g\u0300'],
  [0x045E, '\u0169'],
  [0x0410, 'A'], [0x0411, 'B'], [0x0412, 'V'], [0x0413, 'G'], [0x0414, 'D'],
  [0x0415, 'E'], [0x0401, '\u00CB'], [0x0416, '\u017D'], [0x0417, 'Z'],
  [0x0418, 'I'], [0x0419, 'J'], [0x041A, 'K'], [0x041B, 'L'], [0x041C, 'M'],
  [0x041D, 'N'], [0x041E, 'O'], [0x041F, 'P'], [0x0420, 'R'], [0x0421, 'S'],
  [0x0422, 'T'], [0x0423, 'U'], [0x0424, 'F'], [0x0425, 'H'], [0x0426, 'C'],
  [0x0427, '\u010C'], [0x0428, '\u0160'], [0x0429, '\u015C'], [0x042A, '\u02BA'],
  [0x042B, 'Y'], [0x042C, '\u02B9'], [0x042D, '\u00C8'], [0x042E, '\u00DB'],
  [0x042F, '\u00C2'],
  [0x0406, '\u00CC'], [0x0407, '\u00CF'], [0x0404, '\u00CA'], [0x0490, 'G\u0300'],
  [0x040E, '\u0168']
])

export class Iso9Romanizer extends LetterMapRomanizer {
  constructor() {
    super('iso-9', ISO9_LETTERS)
  }
}

// ── ELOT 743 (Greek) ──────────────────────────────────────────────────────
const GREEK_LETTERS = new Map<number, string>([
  [0x03b1, 'a'], [0x03b2, 'b'], [0x03b3, 'g'], [0x03b4, 'd'], [0x03b5, 'e'],
  [0x03b6, 'z'], [0x03b7, 'i'], [0x03b8, 'th'], [0x03b9, 'i'], [0x03ba, 'k'],
  [0x03bb, 'l'], [0x03bc, 'm'], [0x03bd, 'n'], [0x03be, 'x'], [0x03bf, 'o'],
  [0x03c0, 'p'], [0x03c1, 'r'], [0x03c3, 's'], [0x03c2, 's'], [0x03c4, 't'],
  [0x03c5, 'y'], [0x03c6, 'f'], [0x03c7, 'ch'], [0x03c8, 'ps'], [0x03c9, 'o'],
  [0x03ac, 'a'], [0x03ad, 'e'], [0x03ae, 'i'], [0x03af, 'i'], [0x03cc, 'o'],
  [0x03cd, 'y'], [0x03ce, 'o'], [0x03ca, 'i'], [0x03cb, 'y'], [0x03b0, 'y'],
  [0x0391, 'A'], [0x0392, 'B'], [0x0393, 'G'], [0x0394, 'D'], [0x0395, 'E'],
  [0x0396, 'Z'], [0x0397, 'I'], [0x0398, 'TH'], [0x0399, 'I'], [0x039A, 'K'],
  [0x039B, 'L'], [0x039C, 'M'], [0x039D, 'N'], [0x039E, 'X'], [0x039F, 'O'],
  [0x03A0, 'P'], [0x03A1, 'R'], [0x03A3, 'S'], [0x03A4, 'T'], [0x03A5, 'Y'],
  [0x03A6, 'F'], [0x03A7, 'CH'], [0x03A8, 'PS'], [0x03A9, 'O']
])

const GREEK_DIGRAPHS = new Map<string, string>([
  ['03bf,03c5', 'ou'], ['03b1,03b9', 'ai'], ['03b5,03b9', 'ei'], ['03bf,03b9', 'oi'],
  ['03b1,03c5', 'av'], ['03b5,03c5', 'ev'], ['03b3,03b3', 'ng'], ['03b3,03ba', 'gk'],
  ['03bc,03c0', 'b'], ['03bd,03c4', 'd'], ['03c4,03c3', 'ts'], ['03c4,03b6', 'tz'],
  ['039f,03a5', 'OU'], ['0391,0399', 'AI'], ['0395,0399', 'EI'], ['039f,0399', 'OI'],
  ['0391,03a5', 'AV'], ['0395,03a5', 'EV'], ['0393,0393', 'NG'], ['0393,039a', 'GK'],
  ['039c,03a0', 'B'], ['039d,03a4', 'D'], ['03a4,03a3', 'TS'], ['03a4,0396', 'TZ'],
  ['039f,03c5', 'Ou'], ['0391,03b9', 'Ai'], ['0395,03b9', 'Ei'], ['039f,03b9', 'Oi'],
  ['0391,03c5', 'Av'], ['0395,03c5', 'Ev'], ['0393,03b3', 'Ng'], ['0393,03ba', 'Gk'],
  ['039c,03c0', 'B'], ['039d,03c4', 'D'], ['03a4,03c3', 'Ts'], ['03a4,03b6', 'Tz']
])

function digraphKey(a: number, b: number): string {
  return `${a.toString(16).padStart(4, '0')},${b.toString(16).padStart(4, '0')}`
}

export class Elot743Romanizer extends LetterMapRomanizer {
  constructor() {
    super('elot-743', GREEK_LETTERS)
  }

  protected transform(
    text: string,
    index: number
  ): { replacement: string; consumed: number } | null {
    if (index + 1 >= text.length) return null
    const first = this.codepointOf(text, index)
    const second = this.codepointOf(text, index + 1)
    if (first == null || second == null) return null
    const digraph = GREEK_DIGRAPHS.get(digraphKey(first, second))
    return digraph ? { replacement: digraph, consumed: 2 } : null
  }
}

// ── IAST (Devanagari) ─────────────────────────────────────────────────────
const VIRAMA = 0x094d
const IAST_VOWEL_SIGNS = new Set([
  0x093e, 0x093f, 0x0940, 0x0941, 0x0942, 0x0943, 0x0944, 0x0945, 0x0946, 0x0947, 0x0948,
  0x0949, 0x094a, 0x094b, 0x094c
])

const IAST_CONSONANTS = new Map<number, string>([
  [0x0915, 'k'], [0x0916, 'kh'], [0x0917, 'g'], [0x0918, 'gh'], [0x0919, '\u1E45'],
  [0x091a, 'c'], [0x091b, 'ch'], [0x091c, 'j'], [0x091d, 'jh'], [0x091e, '\u00F1'],
  [0x091f, '\u1E6D'], [0x0920, '\u1E6Dh'], [0x0921, '\u1E21'], [0x0922, '\u1E21h'],
  [0x0923, '\u1E47'], [0x0924, 't'], [0x0925, 'th'], [0x0926, 'd'], [0x0927, 'dh'],
  [0x0928, 'n'], [0x092a, 'p'], [0x092b, 'ph'], [0x092c, 'b'], [0x092d, 'bh'],
  [0x092e, 'm'], [0x092f, 'y'], [0x0930, 'r'], [0x0932, 'l'], [0x0935, 'v'],
  [0x0936, '\u015B'], [0x0937, '\u1E63'], [0x0938, 's'], [0x0939, 'h'], [0x0933, '\u1E33'],
  [0x0958, 'q'], [0x0959, 'kh'], [0x095a, 'g'], [0x095b, 'z'], [0x095c, '\u1E5B'],
  [0x095d, '\u1E5Bh'], [0x095e, 'f']
])

const IAST_VOWELS = new Map<number, string>([
  [0x0905, 'a'], [0x0906, '\u0101'], [0x0907, 'i'], [0x0908, '\u012B'], [0x0909, 'u'],
  [0x090a, '\u016B'], [0x090b, '\u1E5B'], [0x090c, '\u1E37'], [0x090f, 'e'], [0x0910, 'ai'],
  [0x0913, 'o'], [0x0914, 'au'], [0x093c, 'a'],
  [0x093e, '\u0101'], [0x093f, 'i'], [0x0940, '\u012B'], [0x0941, 'u'], [0x0942, '\u016B'],
  [0x0943, '\u1E5B'], [0x0944, '\u1E5D'], [0x0947, 'e'], [0x0948, 'ai'], [0x094b, 'o'],
  [0x094c, 'au'],
  [0x0902, '\u1E43'], [0x0903, '\u1E25'], [0x0901, '\u1E43'], [0x093d, "'"]
])

export class IastRomanizer implements Romanizer {
  readonly scheme = 'iast'

  romanize(text: string): Romanization {
    let out = ''
    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const size = cpSize(cp)
      if (IAST_CONSONANTS.has(cp)) {
        out += IAST_CONSONANTS.get(cp) ?? ''
        const next = cpAt(text, i + size)
        const suppressed = next === VIRAMA || (next != null && IAST_VOWEL_SIGNS.has(next))
        if (!suppressed) out += 'a'
      } else if (cp === VIRAMA) {
        // suppress inherent a
      } else {
        out += IAST_VOWELS.get(cp) ?? String.fromCodePoint(cp)
      }
      i += size
    }
    return { source: text, latin: out, scheme: this.scheme }
  }
}

// ── Modified Hepburn (kana) ───────────────────────────────────────────────
const SOKUON_HIRAGANA = 0x3063
const SOKUON_KATAKANA = 0x30c3
const LONG_VOWEL_MARK = 0x30fc
const HIRAGANA_HA = 0x306f
const HIRAGANA_HE = 0x3078

const MACRON: Record<string, string> = {
  a: '\u0101', i: '\u012B', u: '\u016B', e: '\u0113', o: '\u014D',
  A: '\u0100', I: '\u012A', U: '\u016A', E: '\u0112', O: '\u014C'
}

const SMALL_YOON = new Map<number, string>([
  [0x3083, 'ya'], [0x3085, 'yu'], [0x3087, 'yo'],
  [0x30e3, 'ya'], [0x30e5, 'yu'], [0x30e7, 'yo']
])

const ABSORBING = new Set(['sh', 'ch', 'j'])

const YOON_BASE = new Map<number, string>([
  [0x304d, 'k'], [0x304e, 'g'], [0x3057, 'sh'], [0x3058, 'j'], [0x3061, 'ch'], [0x3062, 'j'],
  [0x306b, 'n'], [0x3072, 'h'], [0x3073, 'b'], [0x3074, 'p'], [0x307f, 'm'], [0x308a, 'r'],
  [0x30ad, 'k'], [0x30ae, 'g'], [0x30b7, 'sh'], [0x30b8, 'j'], [0x30c1, 'ch'], [0x30c2, 'j'],
  [0x30cb, 'n'], [0x30d2, 'h'], [0x30d3, 'b'], [0x30d4, 'p'], [0x30df, 'm'], [0x30ea, 'r']
])

const KANA = new Map<number, string>([
  // basic gojūon (hiragana)
  [0x3042, 'a'], [0x3044, 'i'], [0x3046, 'u'], [0x3048, 'e'], [0x304a, 'o'],
  [0x304b, 'ka'], [0x304d, 'ki'], [0x304f, 'ku'], [0x3051, 'ke'], [0x3053, 'ko'],
  [0x3055, 'sa'], [0x3057, 'shi'], [0x3059, 'su'], [0x305b, 'se'], [0x305d, 'so'],
  [0x305f, 'ta'], [0x3061, 'chi'], [0x3064, 'tsu'], [0x3066, 'te'], [0x3068, 'to'],
  [0x306a, 'na'], [0x306b, 'ni'], [0x306c, 'nu'], [0x306d, 'ne'], [0x306e, 'no'],
  [0x306f, 'ha'], [0x3072, 'hi'], [0x3075, 'fu'], [0x3078, 'he'], [0x307b, 'ho'],
  [0x307e, 'ma'], [0x307f, 'mi'], [0x3080, 'mu'], [0x3081, 'me'], [0x3082, 'mo'],
  [0x3084, 'ya'], [0x3086, 'yu'], [0x3088, 'yo'],
  [0x3089, 'ra'], [0x308a, 'ri'], [0x308b, 'ru'], [0x308c, 're'], [0x308d, 'ro'],
  [0x308f, 'wa'], [0x3090, 'wi'], [0x3091, 'we'], [0x3092, 'o'], [0x3093, 'n'],
  [0x304c, 'ga'], [0x304e, 'gi'], [0x3050, 'gu'], [0x3052, 'ge'], [0x3054, 'go'],
  [0x3056, 'za'], [0x3058, 'ji'], [0x305a, 'zu'], [0x305c, 'ze'], [0x305e, 'zo'],
  [0x3060, 'da'], [0x3062, 'ji'], [0x3065, 'zu'], [0x3067, 'de'], [0x3069, 'do'],
  [0x3070, 'ba'], [0x3073, 'bi'], [0x3076, 'bu'], [0x3079, 'be'], [0x307c, 'bo'],
  [0x3071, 'pa'], [0x3074, 'pi'], [0x3077, 'pu'], [0x307a, 'pe'], [0x307d, 'po'],
  [0x3041, 'a'], [0x3043, 'i'], [0x3045, 'u'], [0x3047, 'e'], [0x3049, 'o'],
  [0x3095, 'ka'], [0x3096, 'ke'],
  // katakana
  [0x30a2, 'a'], [0x30a4, 'i'], [0x30a6, 'u'], [0x30a8, 'e'], [0x30aa, 'o'],
  [0x30ab, 'ka'], [0x30ad, 'ki'], [0x30af, 'ku'], [0x30b1, 'ke'], [0x30b3, 'ko'],
  [0x30b5, 'sa'], [0x30b7, 'shi'], [0x30b9, 'su'], [0x30bb, 'se'], [0x30bd, 'so'],
  [0x30bf, 'ta'], [0x30c1, 'chi'], [0x30c4, 'tsu'], [0x30c6, 'te'], [0x30c8, 'to'],
  [0x30ca, 'na'], [0x30cb, 'ni'], [0x30cc, 'nu'], [0x30cd, 'ne'], [0x30ce, 'no'],
  [0x30cf, 'ha'], [0x30d2, 'hi'], [0x30d5, 'fu'], [0x30d8, 'he'], [0x30db, 'ho'],
  [0x30de, 'ma'], [0x30df, 'mi'], [0x30e0, 'mu'], [0x30e1, 'me'], [0x30e2, 'mo'],
  [0x30e4, 'ya'], [0x30e6, 'yu'], [0x30e8, 'yo'],
  [0x30e9, 'ra'], [0x30ea, 'ri'], [0x30eb, 'ru'], [0x30ec, 're'], [0x30ed, 'ro'],
  [0x30ef, 'wa'], [0x30f0, 'wi'], [0x30f1, 'we'], [0x30f2, 'o'], [0x30f3, 'n'],
  [0x30ac, 'ga'], [0x30ae, 'gi'], [0x30b0, 'gu'], [0x30b2, 'ge'], [0x30b4, 'go'],
  [0x30b6, 'za'], [0x30b8, 'ji'], [0x30ba, 'zu'], [0x30bc, 'ze'], [0x30be, 'zo'],
  [0x30c0, 'da'], [0x30c2, 'ji'], [0x30c5, 'zu'], [0x30c7, 'de'], [0x30c9, 'do'],
  [0x30d0, 'ba'], [0x30d3, 'bi'], [0x30d6, 'bu'], [0x30d9, 'be'], [0x30dc, 'bo'],
  [0x30d1, 'pa'], [0x30d4, 'pi'], [0x30d7, 'pu'], [0x30da, 'pe'], [0x30dd, 'po'],
  [0x30a1, 'a'], [0x30a3, 'i'], [0x30a5, 'u'], [0x30a7, 'e'], [0x30a9, 'o'],
  [0x30f5, 'ka'], [0x30f6, 'ke']
])

export class HepburnRomanizer implements Romanizer {
  readonly scheme = 'hepburn'

  romanize(text: string): Romanization {
    let out = ''
    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const size = cpSize(cp)

      if (i + 1 < text.length) {
        const next = text.codePointAt(i + size) as number
        const small = SMALL_YOON.get(next)
        const consonant = YOON_BASE.get(cp)
        if (small != null && consonant != null) {
          const tail = ABSORBING.has(consonant) ? small.slice(1) : small
          out += consonant + tail
          i += size + cpSize(next)
          continue
        }
      }

      if (cp === SOKUON_HIRAGANA || cp === SOKUON_KATAKANA) {
        if (i + size < text.length) {
          const nextCp = text.codePointAt(i + size) as number
          const roman = KANA.get(nextCp)
          const doubled =
            roman == null ? 't' : 'aeiou'.includes(roman[0]) ? 't' : roman[0] + roman
          out += doubled
          i += size + cpSize(nextCp)
        } else {
          out += 't'
          i += size
        }
        continue
      }

      if (cp === LONG_VOWEL_MARK) {
        const last = out.length > 0 ? out[out.length - 1] : null
        const macron = last != null ? MACRON[last] : undefined
        if (macron != null) {
          out = out.slice(0, -1) + macron
        }
        i += size
        continue
      }

      if ((cp === 0x3093 || cp === 0x30f3) && i + size < text.length) {
        const nextCp = text.codePointAt(i + size) as number
        const roman = KANA.get(nextCp)
        if (roman != null && 'pbm'.includes(roman[0])) {
          out += 'm'
          i += size
          continue
        }
      }

      let roman: string | undefined
      if (cp === HIRAGANA_HA) {
        roman = i + size >= text.length ? 'wa' : KANA.get(cp)
      } else if (cp === HIRAGANA_HE) {
        roman = i + size >= text.length ? 'e' : KANA.get(cp)
      } else {
        roman = KANA.get(cp)
      }
      out += roman ?? text.slice(i, i + size)
      i += size
    }
    return { source: text, latin: out, scheme: this.scheme }
  }
}

// ── Revised Romanization of Korean ────────────────────────────────────────
const GIYEOK = 0
const NIEUN = 2
const DIGEUT = 3
const RIEUL = 5
const BIEUP = 7
const IEUNG = 11
const JIEUT = 12
const HIEUH = 18
const GIYEOK_F = 1
const NIEUN_F = 4
const DIGEUT_F = 7
const RIEUL_F = 8
const BIEUP_F = 17
const SIOT_F = 19
const JIEUT_F = 22
const HIEUH_F = 27
const ASPIRATED_KEYS = new Set([GIYEOK, DIGEUT, BIEUP, JIEUT])
const ASPIRATED = new Map<number, string>([
  [GIYEOK, 'k'],
  [DIGEUT, 't'],
  [BIEUP, 'p'],
  [JIEUT, 'ch']
])
const RR_INITIAL = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
]
const RR_MEDIAL = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we',
  'wi', 'yu', 'eu', 'ui', 'i'
]
const RR_FINAL = [
  '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh',
  'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h'
]

export class RevisedRomanization implements Romanizer {
  readonly scheme = 'rr-2000'

  romanize(text: string): Romanization {
    let out = ''
    let prevCoda = 0
    let atWordStart = true
    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const size = cpSize(cp)

      if (cp < 0xac00 || cp > 0xd7a3) {
        if (prevCoda !== 0) {
          out += RR_FINAL[prevCoda]
          prevCoda = 0
        }
        out += text.slice(i, i + size)
        atWordStart = /\s/.test(String.fromCodePoint(cp))
        i += size
        continue
      }

      const index = cp - 0xac00
      const l = Math.floor(index / (21 * 28))
      const v = Math.floor((index % (21 * 28)) / 28)
      const t = index % 28

      if (prevCoda !== 0) {
        const handled = this.handleCoda(prevCoda, l)
        out += handled.roman
        if (handled.consumesOnset) {
          out += RR_MEDIAL[v]
          atWordStart = false
          prevCoda = t
          i += size
          continue
        }
        prevCoda = 0
      }

      const onset = l === RIEUL ? (atWordStart || prevCoda === 0 ? 'r' : 'l') : RR_INITIAL[l]
      out += onset
      out += RR_MEDIAL[v]
      atWordStart = false
      prevCoda = t
      i += size
    }
    if (prevCoda !== 0) out += RR_FINAL[prevCoda]
    return { source: text, latin: out, scheme: this.scheme }
  }

  private handleCoda(coda: number, onsetL: number): { roman: string; consumesOnset: boolean } {
    const base =
      coda === GIYEOK_F
        ? GIYEOK
        : coda === DIGEUT_F
          ? DIGEUT
          : coda === BIEUP_F
            ? BIEUP
            : coda === JIEUT_F
              ? JIEUT
              : -1
    if (base >= 0 && onsetL === HIEUH) {
      return { roman: ASPIRATED.get(base) as string, consumesOnset: true }
    }
    if (coda === HIEUH_F && ASPIRATED_KEYS.has(onsetL)) {
      return { roman: ASPIRATED.get(onsetL) as string, consumesOnset: true }
    }
    if (coda === HIEUH_F && onsetL === HIEUH) {
      return { roman: 'h', consumesOnset: true }
    }
    if ((coda === NIEUN_F || coda === RIEUL_F) && onsetL === RIEUL) {
      return { roman: 'll', consumesOnset: true }
    }
    if (coda === RIEUL_F && onsetL === NIEUN) {
      return { roman: 'll', consumesOnset: true }
    }
    if (onsetL === IEUNG) {
      const resyllabified =
        coda === GIYEOK_F
          ? 'g'
          : coda === DIGEUT_F
            ? 'd'
            : coda === BIEUP_F
              ? 'b'
              : coda === SIOT_F
                ? 's'
                : coda === JIEUT_F
                  ? 'j'
                  : coda === HIEUH_F
                    ? ''
                    : RR_FINAL[coda]
      return { roman: resyllabified, consumesOnset: false }
    }
    return { roman: RR_FINAL[coda], consumesOnset: false }
  }
}

// ── Arabic-script base (Arabic / Persian / Urdu) ──────────────────────────
const FATHA = 0x064e
const DAMMA = 0x064f
const KASRA = 0x0650
const FATHA_TANWIN = 0x064b
const DAMMA_TANWIN = 0x064c
const KASRA_TANWIN = 0x064d
const SUKUN = 0x0652
const SHADDA = 0x0651

export abstract class ArabicScriptRomanizer implements Romanizer {
  constructor(readonly scheme: string) {}

  protected vowels: Map<number, string> = new Map([
    [FATHA, 'a'],
    [DAMMA, 'u'],
    [KASRA, 'i'],
    [FATHA_TANWIN, 'an'],
    [DAMMA_TANWIN, 'un'],
    [KASRA_TANWIN, 'in']
  ])

  protected consonantLetters: Set<number> = new Set()

  protected abstract romanizeLetter(text: string, index: number, codepoint: number): string | null

  romanize(text: string): Romanization {
    let out = ''
    let pendingConsonant: string | null = null
    let pendingVowel = ''
    let shadda = false

    const flush = (): void => {
      if (pendingConsonant !== null) {
        out += pendingConsonant
        if (shadda) out += pendingConsonant
      }
      out += pendingVowel
      pendingConsonant = null
      pendingVowel = ''
      shadda = false
    }

    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const n = cpSize(cp)
      if (cp === SUKUN) {
        // no vowel
      } else if (cp === SHADDA) {
        shadda = true
      } else {
        const vowel = this.vowels.get(cp)
        if (vowel != null) {
          pendingVowel += vowel
        } else {
          const roman = this.romanizeLetter(text, i, cp)
          if (roman != null) {
            flush()
            if (this.consonantLetters.has(cp)) pendingConsonant = roman
            else out += roman
          } else {
            flush()
            out += text.slice(i, i + n)
          }
        }
      }
      i += n
    }
    flush()
    return { source: text, latin: out, scheme: this.scheme }
  }

  protected prevCodepoint(text: string, index: number): number | null {
    return index > 0 ? (text.codePointAt(index - 1) as number) : null
  }

  protected nextCodepoint(text: string, index: number): number | null {
    const size = cpSize(text.codePointAt(index) as number)
    return index + size < text.length ? (text.codePointAt(index + size) as number) : null
  }

  protected isConsonantEnd(next: number | null): boolean {
    return next == null || /\s/.test(String.fromCodePoint(next)) || !isVowelLetter(next)
  }
}

function isVowelLetter(cp: number): boolean {
  return [0x0627, 0x0648, 0x064a, 0x06cc, 0x06d2, 0x0622].includes(cp)
}

const ARABIC_LETTERS = new Map<number, string>([
  [0x0627, '\u0101'], [0x0628, 'b'], [0x062a, 't'], [0x062b, '\u1E6F'], [0x062c, '\u01E7'],
  [0x062d, '\u1E25'], [0x062e, '\u1E2B'], [0x062f, 'd'], [0x0630, '\u1E0F'], [0x0631, 'r'],
  [0x0632, 'z'], [0x0633, 's'], [0x0634, '\u0161'], [0x0635, '\u1E63'], [0x0636, '\u1E0D'],
  [0x0637, '\u1E6D'], [0x0638, '\u1E93'], [0x0639, '\u02BF'], [0x063a, '\u0121'], [0x0641, 'f'],
  [0x0642, 'q'], [0x0643, 'k'], [0x0644, 'l'], [0x0645, 'm'], [0x0646, 'n'], [0x0647, 'h'],
  [0x0648, 'w'], [0x064a, 'y'], [0x0621, '\u02BE'], [0x0623, '\u02BEa'], [0x0625, '\u02BEi'],
  [0x0624, '\u02BEu'], [0x0626, '\u02BEi'], [0x0622, '\u02BE\u0101'], [0x0629, 'h'],
  [0x0649, '\u0101']
])

const ARABIC_CONSONANT_LETTERS = new Set([
  0x0628, 0x062a, 0x062b, 0x062c, 0x062d, 0x062e, 0x062f, 0x0630, 0x0631, 0x0632, 0x0633,
  0x0634, 0x0635, 0x0636, 0x0637, 0x0638, 0x0639, 0x063a, 0x0641, 0x0642, 0x0643, 0x0644,
  0x0645, 0x0646, 0x0647, 0x0648, 0x064a
])

export class ArabicRomanizer extends ArabicScriptRomanizer {
  constructor() {
    super('din-31635')
    this.consonantLetters = ARABIC_CONSONANT_LETTERS
  }

  protected romanizeLetter(_text: string, _index: number, codepoint: number): string | null {
    return ARABIC_LETTERS.get(codepoint) ?? null
  }
}

const UNIPERS_CONS = new Set([
  0x0628, 0x067e, 0x062a, 0x062b, 0x062c, 0x0686, 0x062d, 0x062e, 0x062f, 0x0630, 0x0631,
  0x0632, 0x0698, 0x0633, 0x0634, 0x0635, 0x0636, 0x0637, 0x0638, 0x0639, 0x063a, 0x0641,
  0x0642, 0x06a9, 0x06af, 0x0644, 0x0645, 0x0646, 0x0648, 0x0647, 0x06cc
])

const UNIPERS_LETTERS = new Map<number, string>([
  [0x0627, '\u0101'], [0x0622, '\u0101'], [0x0628, 'b'], [0x067e, 'p'], [0x062a, 't'],
  [0x062b, 's'], [0x062c, 'j'], [0x0686, 'ch'], [0x062d, 'h'], [0x062e, 'kh'], [0x062f, 'd'],
  [0x0630, 'z'], [0x0631, 'r'], [0x0632, 'z'], [0x0698, 'zh'], [0x0633, 's'], [0x0634, 'sh'],
  [0x0635, 's'], [0x0636, 'z'], [0x0637, 't'], [0x0638, 'z'], [0x0639, '\u02BF'], [0x063a, 'gh'],
  [0x0641, 'f'], [0x0642, 'gh'], [0x06a9, 'k'], [0x06af, 'g'], [0x0644, 'l'], [0x0645, 'm'],
  [0x0646, 'n'], [0x0648, 'v'], [0x0647, 'h'], [0x06cc, 'y'], [0x0621, '\u02BE'],
  [0x0626, '\u02BEi'], [0x0623, '\u02BEa'], [0x0624, '\u02BEu'], [0x0629, 'h'], [0x0649, '\u0101']
])

export class UniPersRomanizer extends ArabicScriptRomanizer {
  constructor() {
    super('unipers')
    this.consonantLetters = UNIPERS_CONS
    this.vowels = new Map([
      [FATHA, 'a'],
      [KASRA, 'e'],
      [DAMMA, 'o'],
      [FATHA_TANWIN, 'an'],
      [KASRA_TANWIN, 'en'],
      [DAMMA_TANWIN, 'on']
    ])
  }

  protected romanizeLetter(text: string, index: number, codepoint: number): string | null {
    const prev = this.prevCodepoint(text, index)
    const next = this.nextCodepoint(text, index)
    const prevIsConsonant = prev != null && this.consonantLetters.has(prev)
    if (codepoint === 0x0648) return prevIsConsonant && this.isConsonantEnd(next) ? '\u016B' : 'v'
    if (codepoint === 0x06cc) return prevIsConsonant && this.isConsonantEnd(next) ? '\u012B' : 'y'
    if (codepoint === 0x0647) {
      const finalE = prevIsConsonant && (next == null || /\s/.test(String.fromCodePoint(next)))
      return finalE ? 'e' : 'h'
    }
    return UNIPERS_LETTERS.get(codepoint) ?? null
  }
}

const URDU_CONS = new Set([
  0x0628, 0x067e, 0x062a, 0x0679, 0x062b, 0x062c, 0x0686, 0x062d, 0x062e, 0x062f, 0x0688,
  0x0630, 0x0631, 0x0691, 0x0632, 0x0698, 0x0633, 0x0634, 0x0635, 0x0636, 0x0637, 0x0638,
  0x0639, 0x063a, 0x0641, 0x0642, 0x06a9, 0x06af, 0x0644, 0x0645, 0x0646, 0x06ba, 0x0648,
  0x06c1, 0x06be, 0x06cc
])

const URDU_LETTERS = new Map<number, string>([
  [0x0627, '\u0101'], [0x0622, '\u0101'], [0x0628, 'b'], [0x067e, 'p'], [0x062a, 't'],
  [0x0679, '\u1E6D'], [0x062b, 's'], [0x062c, 'j'], [0x0686, 'ch'], [0x062d, 'h'],
  [0x062e, 'kh'], [0x062f, 'd'], [0x0688, '\u1E21'], [0x0630, 'z'], [0x0631, 'r'],
  [0x0691, '\u1E5B'], [0x0632, 'z'], [0x0698, 'zh'], [0x0633, 's'], [0x0634, 'sh'],
  [0x0635, 's'], [0x0636, 'z'], [0x0637, 't'], [0x0638, 'z'], [0x0639, '\u02BF'], [0x063a, 'gh'],
  [0x0641, 'f'], [0x0642, 'q'], [0x06a9, 'k'], [0x06af, 'g'], [0x0644, 'l'], [0x0645, 'm'],
  [0x0646, 'n'], [0x06ba, '\u1E43'], [0x0648, 'v'], [0x06c1, 'h'], [0x06be, 'h'], [0x06cc, 'y'],
  [0x06d2, 'e'], [0x0621, '\u02BE'], [0x0626, '\u02BEi'], [0x0624, '\u02BEu'], [0x0629, 'h'],
  [0x0649, '\u0101']
])

export class UrduRomanizer extends ArabicScriptRomanizer {
  constructor() {
    super('urdu')
    this.consonantLetters = URDU_CONS
    this.vowels = new Map([
      [FATHA, 'a'],
      [KASRA, 'i'],
      [DAMMA, 'u'],
      [FATHA_TANWIN, 'an'],
      [KASRA_TANWIN, 'in'],
      [DAMMA_TANWIN, 'un']
    ])
  }

  protected romanizeLetter(text: string, index: number, codepoint: number): string | null {
    const prev = this.prevCodepoint(text, index)
    const next = this.nextCodepoint(text, index)
    const prevIsConsonant = prev != null && this.consonantLetters.has(prev)
    if (codepoint === 0x0648) return prevIsConsonant && this.isConsonantEnd(next) ? '\u016B' : 'v'
    if (codepoint === 0x06cc) return prevIsConsonant && this.isConsonantEnd(next) ? '\u012B' : 'y'
    if (codepoint === 0x06d2) return 'e'
    return URDU_LETTERS.get(codepoint) ?? null
  }
}

// ── ALA-LC (Hebrew) ───────────────────────────────────────────────────────
const DAGESH = 0x05bc
const HEBREW_NIKKUD = new Map<number, string>([
  [0x05b8, '\u0101'], [0x05b7, 'a'], [0x05b5, '\u0113'], [0x05b6, 'e'], [0x05b4, 'i'],
  [0x05b9, '\u014D'], [0x05bb, 'u'], [0x05b0, ''], [0x05b1, 'e'], [0x05b2, 'a'], [0x05b3, 'o']
])
const VOWEL_NIKKUD = new Set([0x05b8, 0x05b7, 0x05b5, 0x05b6, 0x05b4, 0x05b9, 0x05bb, 0x05b0, 0x05b1, 0x05b2, 0x05b3])
const HEBREW_LETTERS = new Map<number, string>([
  [0x05d0, '\u02BC'], [0x05d1, 'b'], [0x05d2, 'g'], [0x05d3, 'd'], [0x05d4, 'h'],
  [0x05d5, 'w'], [0x05d6, 'z'], [0x05d7, '\u1E25'], [0x05d8, '\u1E6D'], [0x05d9, 'y'],
  [0x05db, 'kh'], [0x05dc, 'l'], [0x05de, 'm'], [0x05e0, 'n'], [0x05e1, 's'],
  [0x05e2, '\u02BB'], [0x05e4, 'f'], [0x05e6, 'ts'], [0x05e7, 'q'], [0x05e8, 'r'],
  [0x05e9, '\u0161'], [0x05ea, 't'], [0x05da, 'kh'], [0x05dd, 'm'], [0x05df, 'n'],
  [0x05e3, 'f'], [0x05e5, 'ts']
])

export class HebrewRomanizer implements Romanizer {
  readonly scheme = 'ala-lc'

  romanize(text: string): Romanization {
    let out = ''
    let lastCp: number | null = null
    let lastLen = 0
    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const n = cpSize(cp)
      if (cp === DAGESH) {
        if (lastCp === 0x05d5) {
          out = out.slice(0, out.length - lastLen) + '\u016B'
        } else if (lastCp === 0x05db) {
          out = out.slice(0, out.length - lastLen) + 'k'
        } else if (lastCp === 0x05e4) {
          out = out.slice(0, out.length - lastLen) + 'p'
        } else if (lastLen > 0) {
          out += out.slice(out.length - lastLen)
        }
      } else if (cp === 0x05c1) {
        // shin dot: š already emitted
      } else if (cp === 0x05c2) {
        out = out.slice(0, out.length - lastLen) + '\u015B'
      } else if (HEBREW_NIKKUD.has(cp)) {
        out += HEBREW_NIKKUD.get(cp) ?? ''
      } else {
        const silentVav = cp === 0x05d5 && nextIsVowelNikkud(text, i + n)
        const roman = silentVav ? '' : HEBREW_LETTERS.get(cp)
        if (roman != null) {
          out += roman
          lastCp = cp
          lastLen = roman.length
        } else {
          out += text.slice(i, i + n)
          lastCp = null
          lastLen = 0
        }
      }
      i += n
    }
    return { source: text, latin: out, scheme: this.scheme }
  }
}

function nextIsVowelNikkud(text: string, from: number): boolean {
  if (from >= text.length) return false
  return VOWEL_NIKKUD.has(text.codePointAt(from) as number)
}

// ── Hanyu Pinyin (data-driven) ────────────────────────────────────────────
export class PinyinRomanizer implements Romanizer {
  readonly scheme = 'pinyin'
  private table: Map<number, string> | null = null

  get isReady(): boolean {
    return this.table != null
  }

  setTable(table: Map<number, string>): void {
    this.table = table
  }

  /** Parse lines of `4E00 ni3` into a codepoint map. */
  loadFromText(text: string): void {
    const map = new Map<number, string>()
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim()
      if (line === '' || line.startsWith('#')) continue
      const space = line.indexOf(' ')
      if (space <= 0) continue
      const hex = line.slice(0, space).trim()
      const pinyin = line.slice(space + 1).trim()
      const cp = Number.parseInt(hex, 16)
      if (Number.isNaN(cp) || pinyin === '') continue
      map.set(cp, pinyin)
    }
    this.table = map
  }

  romanize(text: string): Romanization {
    if (!this.table) return { source: text, latin: text, scheme: this.scheme }
    let out = ''
    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const n = cpSize(cp)
      out += this.table.get(cp) ?? text.slice(i, i + n)
      i += n
    }
    return { source: text, latin: out, scheme: this.scheme }
  }
}
