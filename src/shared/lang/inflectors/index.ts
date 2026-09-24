import type { InflectionEngine } from '../inflection'
import { ArabicInflector } from './arabic'
import { ChineseInflector } from './chinese'
import { DanishInflector } from './danish'
import { DutchInflector } from './dutch'
import { FinnishInflector } from './finnish'
import { FrenchInflector } from './french'
import { GermanInflector } from './german'
import { HindiInflector } from './hindi'
import { IndonesianInflector } from './indonesian'
import { ItalianInflector } from './italian'
import { KoreanInflector } from './korean'
import { PersianInflector } from './persian'
import { PolishInflector } from './polish'
import { RussianInflector } from './russian'
import { SpanishInflector } from './spanish'
import { SwedishInflector } from './swedish'
import { TurkishInflector } from './turkish'

/**
 * Bundled rule-based inflection engines, keyed by language code. The tiered
 * engine consults these before falling back to the LLM.
 */
export const BUNDLED_INFLECTORS: Map<string, InflectionEngine> = new Map([
  ['ar', ArabicInflector],
  ['zh', ChineseInflector],
  ['da', DanishInflector],
  ['nl', DutchInflector],
  ['fi', FinnishInflector],
  ['fr', FrenchInflector],
  ['de', GermanInflector],
  ['hi', HindiInflector],
  ['id', IndonesianInflector],
  ['it', ItalianInflector],
  ['ko', KoreanInflector],
  ['fa', PersianInflector],
  ['pl', PolishInflector],
  ['ru', RussianInflector],
  ['es', SpanishInflector],
  ['sv', SwedishInflector],
  ['tr', TurkishInflector]
])
