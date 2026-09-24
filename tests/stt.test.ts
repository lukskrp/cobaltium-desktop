import { describe, it, expect } from 'vitest'
import {
  DEFAULT_STT_MODEL_ID,
  STT_MODELS,
  serverBinaryName,
  sttModelFor,
  whisperLangCode
} from '../src/shared/stt/catalog'
import { parseTranscript } from '../src/shared/stt/transcript'
import { PromptBuilder } from '../src/shared/domain/prompts'
import { ChatMode } from '../src/shared/domain/enums'
import { DEFAULT_SETTINGS, normalizeAppSettings } from '../src/shared/domain/settings'

describe('stt catalog', () => {
  it('ships tiny/base/small multilingual models with weights urls', () => {
    expect(STT_MODELS.map((entry) => entry.id)).toEqual(['tiny', 'base', 'small'])
    for (const entry of STT_MODELS) {
      expect(entry.url).toMatch(/^https:\/\/huggingface\.co\/ggerganov\/whisper\.cpp\//)
      expect(entry.url).toMatch(/\.bin$/)
      expect(entry.bytes).toBeGreaterThan(0)
    }
    expect(DEFAULT_STT_MODEL_ID).toBe('base')
  })

  it('resolves models case-insensitively and rejects unknown ids', () => {
    expect(sttModelFor('BASE')?.id).toBe('base')
    expect(sttModelFor('small')?.id).toBe('small')
    expect(sttModelFor('xxl')).toBeNull()
  })

  it('maps language codes to whisper tags', () => {
    expect(whisperLangCode('auto')).toBe('auto')
    expect(whisperLangCode('')).toBe('auto')
    expect(whisperLangCode('fi')).toBe('fi')
    expect(whisperLangCode('pt-br')).toBe('pt')
    expect(whisperLangCode('EN')).toBe('en')
  })

  it('names the server binary per platform', () => {
    expect(serverBinaryName('win32')).toBe('whisper-server.exe')
    expect(serverBinaryName('darwin')).toBe('whisper-server')
    expect(serverBinaryName('linux')).toBe('whisper-server')
  })
})

describe('parseTranscript', () => {
  it('prefers the text field and keeps the reported language', () => {
    expect(parseTranscript({ text: ' hei maailma ', language: 'fi' }, 'en')).toEqual({
      text: 'hei maailma',
      language: 'fi'
    })
  })

  it('falls back to joined segments and the requested language', () => {
    expect(
      parseTranscript({ text: '', segments: [{ text: 'hello' }, { text: 'world' }] }, 'en')
    ).toEqual({ text: 'hello world', language: 'en' })
  })

  it('strips bracketed non-speech markers', () => {
    expect(parseTranscript({ text: '[music] hello [applause]' }, 'en')).toEqual({
      text: 'hello',
      language: 'en'
    })
  })

  it('returns null for empty, missing, or marker-only output', () => {
    expect(parseTranscript({ text: '   ' }, 'en')).toBeNull()
    expect(parseTranscript({ text: '[music]' }, 'en')).toBeNull()
    expect(parseTranscript(null, 'en')).toBeNull()
    expect(parseTranscript(undefined, 'en')).toBeNull()
  })
})

describe('voice chat mode', () => {
  it('accepts voice as a chat mode', () => {
    expect(ChatMode.fromWire('voice')).toBe('voice')
    expect(ChatMode.fromWire('nonsense')).toBe('conversation')
  })

  it('builds a same-language voice prompt for auto', () => {
    const prompt = PromptBuilder.buildVoiceSystemPrompt('auto')
    expect(prompt).toContain('same language the user is speaking')
    expect(prompt).toContain('read aloud')
  })

  it('builds an explicit-language voice prompt', () => {
    const prompt = PromptBuilder.buildVoiceSystemPrompt('fi')
    expect(prompt).toContain('Finnish')
  })

  it('defaults voice settings and coerces them', () => {
    const defaults = normalizeAppSettings({})
    expect(defaults.micEnabled).toBe(false)
    expect(defaults.voiceInputLang).toBe('auto')
    expect(defaults.voiceResponseLang).toBe('auto')
    expect(defaults.voiceTtsEnabled).toBe(true)
    expect(defaults.sttModel).toBe('base')
    const coerced = normalizeAppSettings({ micEnabled: 'yes', sttModel: 42 })
    expect(coerced.micEnabled).toBe(false)
    expect(coerced.sttModel).toBe('base')
  })

  it('keeps DEFAULT_SETTINGS in sync with normalization', () => {
    expect(normalizeAppSettings({})).toEqual(DEFAULT_SETTINGS)
  })
})
