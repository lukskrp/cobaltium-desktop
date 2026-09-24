import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppSettings } from '../../src/shared/domain/settings'

function makeDefaultSettings(): Record<string, unknown> {
  return {
    themeMode: 'system', uiLanguage: 'en', sourceLang: 'auto', targetLang: 'auto',
    learnLang: 'en', mainLearnLang: 'auto', chatMode: 'conversation', activeThreadId: null,
    selectionMode: 'source', providerKind: 'openai-compat', cloudProvider: 'opencode-go',
    llmBaseUrl: '', llmModel: 'deepseek-v4-flash', llmMaxTokens: 2048, llmTemperature: 0.7,
    llmEnabled: true, glossaryCacheEnabled: true, transliterationEnabled: false,
    translationProvider: 'none', deeplPlan: 'free',
    fastTranslateEnabled: false, fastTranslateBaseUrl: '',
    fastTranslateModel: 'qwen-2.5-1.5b-instruct', fastTranslateTimeoutMs: 10_000,
    saveVolume: 0.5, updateChannel: 'stable', onboardingDone: false
  }
}
function makeSettings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...makeDefaultSettings(), ...overrides }
}

vi.mock('../../src/main/llm/manager', () => ({ complete: vi.fn() }))
vi.mock('../../src/main/llm/openai-compatible', () => ({ completeChatCompletion: vi.fn() }))
vi.mock('../../src/main/db/repositories/settings', () => ({ loadAppSettings: vi.fn(() => makeDefaultSettings()) }))
vi.mock('../../src/main/security/secure-keys', () => ({ getKey: vi.fn(() => 'key') }))
vi.mock('../../src/main/translation/external', () => ({ deepLTranslate: vi.fn(), googleTranslate: vi.fn() }))

const { translateText, GlossFilter, isUsefulTranslation, resolveFastConfig } = await import(
  '../../src/main/translation/tiered'
)
const { loadAppSettings } = await import('../../src/main/db/repositories/settings')
const { getKey } = await import('../../src/main/security/secure-keys')
const { complete } = await import('../../src/main/llm/manager')
const { completeChatCompletion } = await import('../../src/main/llm/openai-compatible')
const { deepLTranslate, googleTranslate } = await import('../../src/main/translation/external')

const mockedLoadAppSettings = loadAppSettings as ReturnType<typeof vi.fn>
const mockedGetKey = getKey as ReturnType<typeof vi.fn>
const mockedComplete = complete as ReturnType<typeof vi.fn>
const mockedChatCompletion = completeChatCompletion as ReturnType<typeof vi.fn>
const mockedDeepLTranslate = deepLTranslate as ReturnType<typeof vi.fn>
const mockedGoogleTranslate = googleTranslate as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockedLoadAppSettings.mockImplementation(() => makeDefaultSettings())
  mockedGetKey.mockImplementation(() => 'key')
  mockedDeepLTranslate.mockResolvedValue(undefined)
  mockedGoogleTranslate.mockResolvedValue(undefined)
  mockedComplete.mockResolvedValue(undefined)
  mockedChatCompletion.mockResolvedValue(undefined)
})

describe('GlossFilter and isUsefulTranslation (pure)', () => {
  it('GlossFilter keeps only glosses present in the translation', () => {
    expect(GlossFilter('bonjour le monde', [
      { native: 'bonjour', foreign: 'hello' },
      { native: 'monde', foreign: 'world' },
      { native: 'foo', foreign: 'bar' }
    ])).toEqual({ bonjour: 'hello', monde: 'world' })
  })
  it('isUsefulTranslation rejects null / same-as-source', () => {
    expect(isUsefulTranslation('hello', null)).toBe(false)
    expect(isUsefulTranslation('hello', 'hello')).toBe(false)
    expect(isUsefulTranslation('hello', '')).toBe(false)
    expect(isUsefulTranslation('hello', 'hola')).toBe(true)
  })
})

describe('resolveFastConfig', () => {
  const settings = (overrides: Record<string, unknown> = {}): AppSettings =>
    makeSettings({
      fastTranslateEnabled: true,
      fastTranslateBaseUrl: 'tailscale:11434/v1',
      ...overrides
    }) as unknown as AppSettings

  it('returns null when the tier is disabled or unconfigured', () => {
    expect(resolveFastConfig(makeDefaultSettings() as unknown as AppSettings, 'key')).toBeNull()
    expect(resolveFastConfig(settings({ fastTranslateEnabled: false }), 'key')).toBeNull()
    expect(resolveFastConfig(settings({ fastTranslateBaseUrl: '   ' }), 'key')).toBeNull()
  })

  it('builds a bearer config with a key and normalizes the url', () => {
    const config = resolveFastConfig(
      settings({ fastTranslateBaseUrl: 'tailscale:11434/v1///' }),
      'secret'
    )
    expect(config).not.toBeNull()
    expect(config?.baseUrl).toBe('http://tailscale:11434/v1')
    expect(config?.auth).toBe('bearer')
    expect(config?.apiKey).toBe('secret')
    expect(config?.route).toBe('chat/completions')
    expect(config?.maxTokens).toBe(1024)
  })

  it('falls back to no-auth when keyless', () => {
    const config = resolveFastConfig(settings(), null)
    expect(config?.auth).toBe('none')
    expect(config?.apiKey).toBe('')
  })
})

describe('translateText tier dispatch', () => {
  it('returns immediately for same-language pairs', async () => {
    const result = await translateText('hello', 'en', 'en')
    expect(result.sourceText).toBe('hello')
    expect(result.glossMap).toEqual({})
    expect(result.foreignLang).toBe('en')
    expect(mockedLoadAppSettings).not.toHaveBeenCalled()
  })

  it('uses the fast tier when enabled and the result is useful', async () => {
    mockedLoadAppSettings.mockImplementation(() => makeSettings({ fastTranslateEnabled: true, fastTranslateBaseUrl: 'http://host/v1' }))
    mockedChatCompletion.mockResolvedValue('{"translation":"hola","glosses":[{"foreign":"hello","native":"hola"}]}')
    const result = await translateText('hello', 'en', 'es')
    expect(result.sourceText).toBe('hola')
    expect(result.glossMap).toEqual({ hola: 'hello' })
    expect(mockedChatCompletion).toHaveBeenCalled()
    expect(mockedDeepLTranslate).not.toHaveBeenCalled()
  })

  it('falls through the fast tier to DeepL when fast is disabled', async () => {
    mockedLoadAppSettings.mockImplementation(() => makeSettings({ translationProvider: 'deepl' }))
    mockedDeepLTranslate.mockResolvedValue('hola')
    const result = await translateText('hello', 'en', 'es')
    expect(result.sourceText).toBe('hola')
    expect(mockedDeepLTranslate).toHaveBeenCalled()
    expect(mockedChatCompletion).not.toHaveBeenCalled()
  })



  it('falls through to the LLM when external providers produce useless results', async () => {
    mockedLoadAppSettings.mockImplementation(() => makeSettings({ translationProvider: 'none' }))
    mockedComplete.mockResolvedValue('{"translation":"hola","glosses":[{"foreign":"hello","native":"hola"}]}')
    const result = await translateText('hello', 'en', 'es')
    expect(result.sourceText).toBe('hola')
    expect(mockedComplete).toHaveBeenCalled()
  })

  it('the LLM tier applies GlossFilter to the raw glosses', async () => {
    mockedLoadAppSettings.mockImplementation(() => makeSettings({ translationProvider: 'none' }))
    mockedComplete.mockResolvedValue(
      '{"translation":"hola mundo","glosses":[{"foreign":"hello","native":"hola"},{"foreign":"world","native":"mundo"}]}'
    )
    const result = await translateText('hello world', 'en', 'es')
    expect(result.glossMap).toEqual({ hola: 'hello', mundo: 'world' })
    expect(result.glossMap).not.toHaveProperty('foo')
  })
})
