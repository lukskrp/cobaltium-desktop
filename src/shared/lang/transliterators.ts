import type { ScriptSystem } from './scripts'

/** Script-to-script transliteration (port of `translit/*.kt`). */
export interface Transliterator {
  readonly name: string
  readonly from: ScriptSystem
  readonly to: ScriptSystem
  transliterate(text: string): string
}

function cpSize(cp: number): number {
  return cp > 0xffff ? 2 : 1
}

/** Base for codepoint-table transliterators with an optional digraph hook. */
export abstract class CodepointTransliterator implements Transliterator {
  constructor(
    readonly name: string,
    readonly from: ScriptSystem,
    readonly to: ScriptSystem,
    private readonly letters: Map<number, string>
  ) {}

  transliterate(text: string): string {
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

  protected codepointAt(text: string, index: number): number | null {
    return index < text.length ? (text.codePointAt(index) as number) : null
  }
}

// ── Greek <-> Cyrillic ────────────────────────────────────────────────────
const GREEK_TO_CYRILLIC = new Map<number, string>([
  [0x03b1, '\u0430'], [0x03b2, '\u0432'], [0x03b3, '\u0433'], [0x03b4, '\u0434'],
  [0x03b5, '\u0435'], [0x03b6, '\u0437'], [0x03b7, '\u0438'], [0x03b8, '\u0442'],
  [0x03b9, '\u0438'], [0x03ba, '\u043A'], [0x03bb, '\u043B'], [0x03bc, '\u043C'],
  [0x03bd, '\u043D'], [0x03be, '\u043A\u0441'], [0x03bf, '\u043E'], [0x03c0, '\u043F'],
  [0x03c1, '\u0440'], [0x03c3, '\u0441'], [0x03c2, '\u0441'], [0x03c4, '\u0442'],
  [0x03c5, '\u0438'], [0x03c6, '\u0444'], [0x03c7, '\u0445'], [0x03c8, '\u043F\u0441'],
  [0x03c9, '\u043E'],
  [0x03ac, '\u0430'], [0x03ad, '\u0435'], [0x03ae, '\u0438'], [0x03af, '\u0438'],
  [0x03cc, '\u043E'], [0x03cd, '\u0438'], [0x03ce, '\u043E'],
  [0x0391, '\u0410'], [0x0392, '\u0412'], [0x0393, '\u0413'], [0x0394, '\u0414'],
  [0x0395, '\u0415'], [0x0396, '\u0417'], [0x0397, '\u0418'], [0x0398, '\u0422'],
  [0x0399, '\u0418'], [0x039A, '\u041A'], [0x039B, '\u041B'], [0x039C, '\u041C'],
  [0x039D, '\u041D'], [0x039E, '\u041A\u0421'], [0x039F, '\u041E'], [0x03A0, '\u041F'],
  [0x03A1, '\u0420'], [0x03A3, '\u0421'], [0x03A4, '\u0422'], [0x03A5, '\u0418'],
  [0x03A6, '\u0424'], [0x03A7, '\u0425'], [0x03A8, '\u041F\u0421'], [0x03A9, '\u041E']
])

const CYRILLIC_TO_GREEK = new Map<number, string>([
  [0x0430, '\u03B1'], [0x0431, '\u03B2'], [0x0432, '\u03B2'], [0x0433, '\u03B3'],
  [0x0434, '\u03B4'], [0x0435, '\u03B5'], [0x0451, '\u03B9\u03BF'], [0x0436, '\u03B6'],
  [0x0437, '\u03B6'], [0x0438, '\u03B9'], [0x0439, '\u03B9'], [0x043A, '\u03BA'],
  [0x043B, '\u03BB'], [0x043C, '\u03BC'], [0x043D, '\u03BD'], [0x043E, '\u03BF'],
  [0x043F, '\u03C0'], [0x0440, '\u03C1'], [0x0441, '\u03C3'], [0x0442, '\u03C4'],
  [0x0443, '\u03C5'], [0x0444, '\u03C6'], [0x0445, '\u03C7'], [0x0446, '\u03C4\u03C3'],
  [0x0447, '\u03C4\u03C3'], [0x0448, '\u03C3'], [0x0449, '\u03C3\u03C3'], [0x044B, '\u03B9'],
  [0x044D, '\u03B5'], [0x044E, '\u03B9\u03BF\u03C5'], [0x044F, '\u03B9\u03B1'],
  [0x044A, ''], [0x044C, ''],
  [0x0410, '\u0391'], [0x0411, '\u0392'], [0x0412, '\u0392'], [0x0413, '\u0393'],
  [0x0414, '\u0394'], [0x0415, '\u0395'], [0x0416, '\u0396'], [0x0417, '\u0396'],
  [0x0418, '\u0399'], [0x041A, '\u039A'], [0x041B, '\u039B'], [0x041C, '\u039C'],
  [0x041D, '\u039D'], [0x041E, '\u039F'], [0x041F, '\u03A0'], [0x0420, '\u03A1'],
  [0x0421, '\u03A3'], [0x0422, '\u03A4'], [0x0423, '\u03A5'], [0x0424, '\u03A6'],
  [0x0425, '\u03A7'], [0x0426, '\u03A4\u03A3'], [0x0427, '\u03A4\u03A3'], [0x0428, '\u03A3'],
  [0x0429, '\u03A3\u03A3'], [0x042B, '\u0399'], [0x042D, '\u0395'], [0x042E, '\u0399\u039F\u03A5'],
  [0x042F, '\u0399\u0391'], [0x0401, '\u0399\u039F'], [0x042A, ''], [0x042C, '']
])

const GREEK_CYR_DIGRAPHS = new Map<string, string>([
  ['03bf,03c5', '\u0443'], ['03b1,03c5', '\u0430\u0432'], ['03b5,03c5', '\u0435\u0432'],
  ['03b3,03b3', '\u043d\u0433'], ['03b3,03ba', '\u0433\u043a'], ['03bc,03c0', '\u043c\u043f'],
  ['03bd,03c4', '\u043d\u0442'], ['03c4,03c3', '\u0442\u0441'], ['03c4,03b6', '\u0442\u0437'],
  ['03b1,03b9', '\u0430\u0439'], ['03b5,03b9', '\u0438'], ['03bf,03b9', '\u0438'],
  ['039f,03c5', '\u0423'], ['0391,03c5', '\u0410\u0432'], ['0395,03c5', '\u0415\u0432'],
  ['0393,03b3', '\u041d\u0433'], ['0393,03ba', '\u0413\u043a'], ['039c,03c0', '\u041c\u043f'],
  ['039d,03c4', '\u041d\u0442'], ['03a4,03c3', '\u0422\u0441'], ['03a4,03b6', '\u0422\u0437']
])

function hexKey(a: number, b: number): string {
  return `${a.toString(16).padStart(4, '0')},${b.toString(16).padStart(4, '0')}`
}

export class GreekCyrillicTransliterator extends CodepointTransliterator {
  private readonly toGreek: boolean

  constructor(name: string, from: ScriptSystem, to: ScriptSystem) {
    super(name, from, to, from === 'greek' ? GREEK_TO_CYRILLIC : CYRILLIC_TO_GREEK)
    this.toGreek = from === 'cyrillic'
  }

  protected transform(
    text: string,
    index: number
  ): { replacement: string; consumed: number } | null {
    const cp = this.codepointAt(text, index)
    if (cp == null) return null
    if (this.toGreek) {
      if (cp === 0x0441) {
        const next = this.codepointAt(text, index + 1)
        const atEnd = next == null || /\s/.test(String.fromCodePoint(next)) || next === 0x002e
        return atEnd ? { replacement: '\u03C2', consumed: 1 } : { replacement: '\u03C3', consumed: 1 }
      }
      return null
    }
    if (index + 1 >= text.length) return null
    const second = this.codepointAt(text, index + 1)
    if (second == null) return null
    const digraph = GREEK_CYR_DIGRAPHS.get(hexKey(cp, second))
    return digraph ? { replacement: digraph, consumed: 2 } : null
  }
}

// ── Arabic <-> Hebrew ─────────────────────────────────────────────────────
const AR_TO_HE = new Map<number, string>([
  [0x0627, '\u05D0'], [0x0628, '\u05D1'], [0x062A, '\u05EA'], [0x062B, '\u05EA'],
  [0x062C, '\u05D2'], [0x062D, '\u05D7'], [0x062E, '\u05DB'], [0x062F, '\u05D3'],
  [0x0630, '\u05D3'], [0x0631, '\u05E8'], [0x0632, '\u05D6'], [0x0633, '\u05E1'],
  [0x0634, '\u05E9'], [0x0635, '\u05E6'], [0x0636, '\u05E6'], [0x0637, '\u05D8'],
  [0x0638, '\u05D8'], [0x0639, '\u05E2'], [0x063A, '\u05E2'], [0x0641, '\u05E4'],
  [0x0642, '\u05E7'], [0x0643, '\u05DB'], [0x0644, '\u05DC'], [0x0645, '\u05DE'],
  [0x0646, '\u05E0'], [0x0647, '\u05D4'], [0x0648, '\u05D5'], [0x064A, '\u05D9'],
  [0x0629, '\u05D4'], [0x0622, '\u05D0']
])

const HE_TO_AR = new Map<number, string>([
  [0x05D0, '\u0627'], [0x05D1, '\u0628'], [0x05D2, '\u062C'], [0x05D3, '\u062F'],
  [0x05D4, '\u0647'], [0x05D5, '\u0648'], [0x05D6, '\u0632'], [0x05D7, '\u062D'],
  [0x05D8, '\u0637'], [0x05D9, '\u064A'], [0x05DB, '\u0643'], [0x05DC, '\u0644'],
  [0x05DE, '\u0645'], [0x05E0, '\u0646'], [0x05E1, '\u0633'], [0x05E2, '\u0639'],
  [0x05E4, '\u0641'], [0x05E6, '\u0635'], [0x05E7, '\u0642'], [0x05E8, '\u0631'],
  [0x05E9, '\u0634'], [0x05EA, '\u062A'], [0x05DA, '\u0643'], [0x05DD, '\u0645'],
  [0x05DF, '\u0646'], [0x05E3, '\u0641'], [0x05E5, '\u0635']
])

export class ArabicHebrewTransliterator extends CodepointTransliterator {
  constructor(name: string, from: ScriptSystem, to: ScriptSystem) {
    super(name, from, to, from === 'arabic' ? AR_TO_HE : HE_TO_AR)
  }
}

// ── Syriac <-> Arabic ─────────────────────────────────────────────────────
const SYRIAC_TO_ARABIC = new Map<number, string>([
  [0x0710, '\u0627'], [0x0712, '\u0628'], [0x0713, '\u062C'], [0x0715, '\u062F'],
  [0x0717, '\u0647'], [0x0718, '\u0648'], [0x0719, '\u0632'], [0x071A, '\u062D'],
  [0x071B, '\u0637'], [0x071D, '\u064A'], [0x071F, '\u0643'], [0x0720, '\u0644'],
  [0x0721, '\u0645'], [0x0722, '\u0646'], [0x0723, '\u0633'], [0x0725, '\u0639'],
  [0x0726, '\u0641'], [0x0728, '\u0635'], [0x0729, '\u0642'], [0x072A, '\u0631'],
  [0x072B, '\u0634'], [0x072C, '\u062A']
])

const ARABIC_TO_SYRIAC = new Map<number, string>([
  [0x0627, '\u0710'], [0x0628, '\u0712'], [0x062A, '\u072C'], [0x062B, '\u072C'],
  [0x062C, '\u0713'], [0x062D, '\u071A'], [0x062E, '\u071F'], [0x062F, '\u0715'],
  [0x0630, '\u0715'], [0x0631, '\u072A'], [0x0632, '\u0719'], [0x0633, '\u0723'],
  [0x0634, '\u072B'], [0x0635, '\u0728'], [0x0636, '\u0728'], [0x0637, '\u071B'],
  [0x0638, '\u071B'], [0x0639, '\u0725'], [0x063A, '\u0725'], [0x0641, '\u0726'],
  [0x0642, '\u0729'], [0x0643, '\u071F'], [0x0644, '\u0720'], [0x0645, '\u0721'],
  [0x0646, '\u0722'], [0x0647, '\u0717'], [0x0648, '\u0718'], [0x064A, '\u071D']
])

export class SyriacArabicTransliterator extends CodepointTransliterator {
  constructor(name: string, from: ScriptSystem, to: ScriptSystem) {
    super(name, from, to, from === 'syriac' ? SYRIAC_TO_ARABIC : ARABIC_TO_SYRIAC)
  }
}

// ── Han <-> Kanji (data-driven; pass-through until a table is loaded) ──────
export class HanKanjiTransliterator implements Transliterator {
  private map: Map<number, number> | null = null

  constructor(
    readonly name: string,
    readonly from: ScriptSystem,
    readonly to: ScriptSystem
  ) {}

  get isReady(): boolean {
    return this.map != null
  }

  setTable(map: Map<number, number>): void {
    this.map = map
  }

  /** Parse `4E00 5B66` lines into a codepoint map. */
  loadFromText(text: string): void {
    const map = new Map<number, number>()
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim()
      if (line === '' || line.startsWith('#')) continue
      const parts = line.split(/\s+/)
      if (parts.length < 2) continue
      const src = Number.parseInt(parts[0], 16)
      const dst = Number.parseInt(parts[1], 16)
      if (Number.isNaN(src) || Number.isNaN(dst) || src === dst) continue
      map.set(src, dst)
    }
    this.map = map
  }

  transliterate(text: string): string {
    if (!this.map) return text
    let out = ''
    let i = 0
    while (i < text.length) {
      const cp = text.codePointAt(i) as number
      const n = cpSize(cp)
      const target = this.map.get(cp)
      out += target != null ? String.fromCodePoint(target) : text.slice(i, i + n)
      i += n
    }
    return out
  }
}
