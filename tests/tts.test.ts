import { describe, expect, it } from 'vitest'
import {
  normalizePhonemeToken,
  normalizePhonemes,
  phonemeTypeOf,
  phonemesToIds,
  tokenizeForTts,
  TTS_VOICES,
  ttsVoiceFor,
  voiceConfigUrl,
  voiceModelUrl,
  type PhonemeIdMap
} from '@shared/tts'
import { encodeWavPcm16 } from '@shared/tts/wav'

const idMap: PhonemeIdMap = { _: [0], '^': [1], $: [2], a: [10], b: [11] }

describe('tts phonemes', () => {
  it('normalizes ASCII g and strips affricate tie-bars', () => {
    expect(normalizePhonemeToken('g')).toBe('\u0261')
    expect(normalizePhonemeToken('t\u0361\u0283')).toBe('t\u0283')
  })

  it('normalizes a space-separated phoneme string', () => {
    expect(normalizePhonemes('g a')).toBe('\u0261 a')
  })

  it('builds the piper id sequence with interspersed pad', () => {
    const { ids, skipped } = phonemesToIds('a_b', idMap)
    expect(ids).toEqual([1, 0, 10, 0, 0, 0, 11, 0, 2])
    expect(skipped).toEqual([])
  })

  it('reports phonemes missing from the voice map', () => {
    const { skipped } = phonemesToIds('aZ', idMap)
    expect(skipped).toEqual(['Z'])
  })

  it('tokenizes text', () => {
    expect(tokenizeForTts('¡Hola, mundo!')).toEqual(['hola', 'mundo'])
  })
})

describe('tts wav', () => {
  it('encodes a valid PCM16 header and normalizes the peak', () => {
    const samples = Float32Array.from([0, 0.25, -0.5])
    const bytes = encodeWavPcm16(samples, 22050)
    expect(bytes.length).toBe(44 + 3 * 2)
    const view = new DataView(bytes.buffer)
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WAVE')
    expect(view.getUint32(24, true)).toBe(22050)
    expect(view.getUint32(40, true)).toBe(6)
    // peak -0.5 normalized to -32767
    expect(view.getInt16(44 + 2 * 2, true)).toBe(-32767)
  })
})

describe('tts catalog', () => {
  it('lists unique offline languages', () => {
    const langs = TTS_VOICES.map((entry) => entry.lang)
    expect(new Set(langs).size).toBe(langs.length)
    expect(langs).toContain('fi')
    expect(langs).toContain('ar')
    expect(langs).toContain('ja')
    expect(langs).toContain('ko')
    expect(langs).toContain('zh')
  })

  it('builds model and config urls', () => {
    const es = ttsVoiceFor('es')
    expect(es).toBeDefined()
    expect(voiceModelUrl(es!)).toContain('rhasspy/piper-voices')
    expect(voiceConfigUrl(es!)).toContain('.onnx.json')
    expect(phonemeTypeOf(es!)).toBe('espeak')
  })

  it('marks Japanese as the japanese phoneme type', () => {
    const ja = ttsVoiceFor('ja')
    expect(ja).toBeDefined()
    expect(phonemeTypeOf(ja!)).toBe('japanese')
  })
})
