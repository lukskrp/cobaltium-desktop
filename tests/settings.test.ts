import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  normalizeAppSettings,
  resolveCloudConfig
} from '@shared/domain/settings'

describe('settings', () => {
  it('returns defaults for empty input', () => {
    expect(normalizeAppSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('coerces invalid enum values back to defaults', () => {
    const settings = normalizeAppSettings({
      chatMode: 'nonsense',
      providerKind: 42,
      themeMode: 'blossom'
    })
    expect(settings.chatMode).toBe('conversation')
    expect(settings.providerKind).toBe('openai-compat')
    expect(settings.themeMode).toBe('blossom')
  })

  it('clamps numeric ranges', () => {
    const settings = normalizeAppSettings({ llmTemperature: 99, llmMaxTokens: 1, saveVolume: -5 })
    expect(settings.llmTemperature).toBe(2)
    expect(settings.llmMaxTokens).toBe(64)
    expect(settings.saveVolume).toBe(0)
  })

  it('resolves the vendor base url when none is set', () => {
    const config = resolveCloudConfig(normalizeAppSettings({}), 'sk-test')
    expect(config.baseUrl).toBe('https://opencode.ai/zen/go/v1')
    expect(config.apiKey).toBe('sk-test')
    expect(config.route).toBe('chat/completions')
    expect(config.auth).toBe('bearer')
  })

  it('strips trailing slashes from a custom base url', () => {
    const config = resolveCloudConfig(
      normalizeAppSettings({ llmBaseUrl: 'http://localhost:1234/v1///' }),
      null
    )
    expect(config.baseUrl).toBe('http://localhost:1234/v1')
  })
})
