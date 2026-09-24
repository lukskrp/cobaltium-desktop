import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SCENARIO_CATEGORIES, parseScenario } from '@shared/domain/scenarios'

describe('scenarios', () => {
  it('parses a bundled scenario file', () => {
    const raw = JSON.parse(readFileSync('resources/scenarios/fi-en/business_meeting.json', 'utf8'))
    const scenario = parseScenario(raw)
    expect(scenario).not.toBeNull()
    expect(scenario?.languagePair).toBe('fi-en')
    expect(scenario?.vocabulary.length).toBeGreaterThan(0)
    expect(scenario?.phrases.length).toBeGreaterThan(0)
    expect(scenario?.dialogues.length).toBeGreaterThan(0)
    expect(scenario?.vocabulary[0].word).not.toBe('')
  })

  it('rejects malformed objects', () => {
    expect(parseScenario(null)).toBeNull()
    expect(parseScenario({ title: 'x' })).toBeNull()
    expect(parseScenario({ id: 'a' })).toBeNull()
  })

  it('exposes the category catalogue', () => {
    expect(SCENARIO_CATEGORIES).toHaveLength(13)
  })
})
