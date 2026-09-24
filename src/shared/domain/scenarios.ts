/** Scenario practice data (port of `data/model/ScenarioModels.kt`). */

export interface ScenarioWord {
  word: string
  translation: string
  pos?: string | null
  example?: string | null
  exampleTranslation?: string | null
}

export interface ScenarioPhrase {
  phrase: string
  translation: string
  context?: string | null
}

export interface ScenarioDialogue {
  speaker: string
  text: string
  translation: string
}

export interface Scenario {
  id: string
  title: string
  description: string
  category: string
  icon: string
  languagePair: string
  vocabulary: ScenarioWord[]
  phrases: ScenarioPhrase[]
  dialogues: ScenarioDialogue[]
}

export const SCENARIO_TABS = ['vocabulary', 'phrases', 'dialogues'] as const
export type ScenarioTab = (typeof SCENARIO_TABS)[number]

export const SCENARIO_CATEGORIES: { id: string; displayName: string }[] = [
  { id: 'HOME', displayName: 'HOME 🏠' },
  { id: 'TECHNICAL', displayName: 'TECHNICAL ⚙️' },
  { id: 'SCIENTIFIC', displayName: 'SCIENTIFIC 🔬' },
  { id: 'BUSINESS', displayName: 'BUSINESS 💼' },
  { id: 'FITNESS', displayName: 'FITNESS 🏋️' },
  { id: 'MEDICAL', displayName: 'MEDICAL 🏥' },
  { id: 'EDUCATION', displayName: 'EDUCATION 🎓' },
  { id: 'TRAVEL', displayName: 'TRAVEL ✈️' },
  { id: 'SOCIAL', displayName: 'SOCIAL ☕' },
  { id: 'DINING', displayName: 'DINING 🍽️' },
  { id: 'OUTDOOR', displayName: 'OUTDOOR 🌲' },
  { id: 'FAMILY', displayName: 'FAMILY 👨‍👩‍👧‍👦' },
  { id: 'EMERGENCY', displayName: 'EMERGENCY 🚨' }
]

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Validate/coerce a parsed scenario JSON object. */
export function parseScenario(raw: unknown): Scenario | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const id = asString(obj.id)
  const languagePair = asString(obj.languagePair)
  if (id === '' || languagePair === '') return null

  const vocabulary = (Array.isArray(obj.vocabulary) ? obj.vocabulary : [])
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      word: asString(entry.word),
      translation: asString(entry.translation),
      pos: typeof entry.pos === 'string' ? entry.pos : null,
      example: typeof entry.example === 'string' ? entry.example : null,
      exampleTranslation:
        typeof entry.exampleTranslation === 'string' ? entry.exampleTranslation : null
    }))
    .filter((entry) => entry.word !== '')

  const phrases = (Array.isArray(obj.phrases) ? obj.phrases : [])
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      phrase: asString(entry.phrase),
      translation: asString(entry.translation),
      context: typeof entry.context === 'string' ? entry.context : null
    }))
    .filter((entry) => entry.phrase !== '')

  const dialogues = (Array.isArray(obj.dialogues) ? obj.dialogues : [])
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      speaker: asString(entry.speaker),
      text: asString(entry.text),
      translation: asString(entry.translation)
    }))
    .filter((entry) => entry.text !== '')

  return {
    id,
    title: asString(obj.title) || id,
    description: asString(obj.description),
    category: asString(obj.category),
    icon: asString(obj.icon),
    languagePair,
    vocabulary,
    phrases,
    dialogues
  }
}
