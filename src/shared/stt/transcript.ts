/** Pure whisper-server `/inference` response parsing (shared for tests). */

export interface TranscriptPayload {
  text?: unknown
  language?: unknown
  segments?: Array<{ text?: unknown }>
}

export interface ParsedTranscript {
  text: string
  language: string
}

/**
 * Normalize an `/inference` JSON body: prefer `text`, fall back to joined
 * segments, strip bracketed non-speech markers (`[music]`, …). Null when
 * nothing transcribable remains.
 */
export function parseTranscript(
  data: TranscriptPayload | null | undefined,
  fallbackLang: string
): ParsedTranscript | null {
  if (!data || typeof data !== 'object') return null
  let text = typeof data.text === 'string' ? data.text : ''
  if (text.trim() === '' && Array.isArray(data.segments)) {
    text = data.segments.map((segment) => (typeof segment?.text === 'string' ? segment.text : '')).join(' ')
  }
  const cleaned = text.replace(/\[.*?\]/g, '').trim()
  if (cleaned === '') return null
  const language = typeof data.language === 'string' && data.language !== '' ? data.language : fallbackLang
  return { text: cleaned, language }
}
