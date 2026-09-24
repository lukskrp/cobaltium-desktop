import type { GlossPair, LlmTranslation, SavedWordAnalysis } from './models'

/**
 * Robustly extract JSON from an LLM response (port of Android `LlmJsonParser`).
 * Strips <think> blocks and markdown fences, scans the first self-balanced
 * `{...}` while respecting quoted strings, then falls back to a regex pull of
 * the "translation" string value.
 */
export const LlmJsonParser = {
  /** Parse a flat JSON object of string values, or null. */
  parseJsonObject(text: string): Record<string, string> | null {
    const obj = extractBalancedJsonObject(text)
    if (obj) {
      const map: Record<string, string> = {}
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') map[key] = value
        else if (typeof value === 'number' || typeof value === 'boolean') map[key] = String(value)
      }
      return Object.keys(map).length > 0 ? map : null
    }
    const translation = extractTranslationOnly(text)
    return translation ? { translation } : null
  },

  /** Parse the immersive-translation JSON (`translation` + `glosses[]`). */
  parseTranslation(text: string): LlmTranslation | null {
    const obj = extractBalancedJsonObject(text)
    if (obj) {
      const translation = typeof obj.translation === 'string' ? obj.translation : null
      if (translation == null) return null
      const rawGlosses = Array.isArray(obj.glosses) ? obj.glosses : []
      const glosses: GlossPair[] = []
      for (const entry of rawGlosses) {
        if (!entry || typeof entry !== 'object') continue
        const record = entry as Record<string, unknown>
        const native = typeof record.native === 'string' ? record.native.trim() : null
        const foreign = typeof record.foreign === 'string' ? record.foreign.trim() : null
        if (native && foreign) glosses.push({ native, foreign })
      }
      return { translation, glosses }
    }
    const translation = extractTranslationOnly(text)
    return translation ? { translation, glosses: [] } : null
  },

  /** Parse a JSON array of flat string-valued objects, or null. */
  parseJsonArray(text: string): Record<string, string>[] | null {
    const cleaned = cleanFences(text)
    const start = cleaned.indexOf('[')
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escaped = false
    let end = -1
    for (let i = start; i < cleaned.length; i++) {
      const c = cleaned[i]
      if (inString) {
        if (escaped) escaped = false
        else if (c === '\\') escaped = true
        else if (c === '"') inString = false
      } else if (c === '"') {
        inString = true
      } else if (c === '[') {
        depth++
      } else if (c === ']') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end === -1) return null

    const candidate = cleaned.slice(start, end + 1)
    let array: unknown
    try {
      array = JSON.parse(candidate)
    } catch {
      return null
    }
    if (!Array.isArray(array)) return null

    const result: Record<string, string>[] = []
    for (const element of array) {
      if (!element || typeof element !== 'object') continue
      const map: Record<string, string> = {}
      for (const [key, value] of Object.entries(element as Record<string, unknown>)) {
        if (typeof value === 'string') map[key] = value
        else if (typeof value === 'number' || typeof value === 'boolean') map[key] = String(value)
      }
      if (Object.keys(map).length > 0) result.push(map)
    }
    return result.length > 0 ? result : null
  },

  /** Map parsed fields onto a SavedWordAnalysis (extension's parseAnalysisJson). */
  toAnalysis(parsed: Record<string, string>): SavedWordAnalysis {
    return {
      pos: parsed.pos,
      tense: parsed.tense,
      gender: parsed.gender,
      number: parsed.number,
      person: parsed.person,
      case: parsed.case,
      mood: parsed.mood,
      form: parsed.form,
      notes: parsed.notes
    }
  }
}

export function cleanFences(text: string): string {
  let s = text.trim()
  // Drop the full contents of chain-of-thought blocks, then any dangling tags.
  s = s.replace(/<(?:think|reasoning|thought)\b[^>]*>[\s\S]*?<\/(?:think|reasoning|thought)>/gi, ' ')
  s = s.replace(/<\/?(?:think|reasoning|thought)\b[^>]*>/gi, ' ')
  const fence = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(s)
  return fence ? fence[1].trim() : s
}

export function extractBalancedJsonObject(text: string): Record<string, unknown> | null {
  const s = cleanFences(text)
  const start = s.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  let end = -1
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
    } else if (c === '"') {
      inString = true
    } else if (c === '{') {
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return null

  const candidate = s.slice(start, end + 1)
  try {
    const parsed = JSON.parse(candidate)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Last-resort: pull the "translation" string value via regex. */
function extractTranslationOnly(text: string): string | null {
  const match = /"translation"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text)
  if (!match) return null
  let translation = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim()
  if (translation === '') return null
  // Truncate when the model runs the string into a trailing {"glosses": ...} object.
  const boundary = /\n\s*\{/.exec(translation)
  if (boundary) translation = translation.slice(0, boundary.index).trim()
  return translation === '' ? null : translation
}
