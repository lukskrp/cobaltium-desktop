import type { ChatRequest } from '../domain/llm'
import { Languages } from '../domain/languages'
import { LlmJsonParser } from '../domain/json-parser'
import { PromptBuilder } from '../domain/prompts'
import {
  InflectionParser,
  type Dictionary,
  type DictionaryEntry,
  type InflectionEngine,
  type InflectionParadigm,
  type LanguageInflectionSpec,
  type MorphologyAnalyzer,
  type MorphologyResult
} from './inflection'

/** A non-streaming completion, e.g. the main-process provider manager. */
export type CompleteFn = (request: ChatRequest) => Promise<string>

const INFLECTED_FIELDS = new Set(['tense', 'gender', 'number', 'person', 'case', 'mood', 'form'])

/** LLM-backed morphology analyzer (reuses the saved-word morph prompt). */
export function createLlmMorphology(complete: CompleteFn): MorphologyAnalyzer {
  async function attempt(word: string, lang: string): Promise<MorphologyResult | null> {
    try {
      const reply = await complete({
        messages: [
          { role: 'system', content: PromptBuilder.morphSystemPrompt('en') },
          { role: 'user', content: PromptBuilder.morphUserPrompt(word, Languages.name(lang), 'en') }
        ],
        maxTokens: 2048,
        temperature: 0.3,
        disableThinking: true
      })
      const parsed = LlmJsonParser.parseJsonObject(reply)
      if (!parsed) return null
      const inflected: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (INFLECTED_FIELDS.has(key)) inflected[key] = value
      }
      return { word, lang, lemma: parsed.lemma ?? null, pos: parsed.pos ?? null, inflected }
    } catch {
      return null
    }
  }

  return {
    engine: 'llm',
    async analyze(word: string, lang: string): Promise<MorphologyResult | null> {
      if (word.trim() === '') return null
      // Reasoning models occasionally spend the whole budget on chain-of-thought
      // and return no content; retry once before giving up.
      return (await attempt(word, lang)) ?? (await attempt(word, lang))
    }
  }
}

/** LLM-backed inflection engine (the LangDex-like lexicon backend). */
export function createLlmInflection(
  complete: CompleteFn,
  specs: Record<string, LanguageInflectionSpec> = {}
): InflectionEngine {
  return {
    engine: 'llm',
    async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
      if (lemma.trim() === '') return null
      try {
        const reply = await complete({
          messages: [
            {
              role: 'system',
              content: PromptBuilder.inflectionSystemPrompt(specs[lang.toLowerCase()] ?? null)
            },
            {
              role: 'user',
              content: PromptBuilder.inflectionUserPrompt(lemma, Languages.name(lang), pos)
            }
          ],
          maxTokens: 2048,
          temperature: 0.3,
          disableThinking: true
        })
        const parsed = InflectionParser.parse(reply)
        return parsed ? { ...parsed, lemma, lang } : null
      } catch {
        return null
      }
    }
  }
}

/** LLM-backed dictionary lookup: a JSON array of {headword, pos, reading, sense}. */
export function createLlmDictionary(complete: CompleteFn): Dictionary {
  return {
    source: 'llm',
    async lookup(word: string, lang: string): Promise<DictionaryEntry[] | null> {
      if (word.trim() === '') return null
      try {
        const reply = await complete({
          messages: [
            { role: 'system', content: PromptBuilder.dictionarySystemPrompt() },
            { role: 'user', content: PromptBuilder.dictionaryUserPrompt(word, Languages.name(lang)) }
          ],
          maxTokens: 1024,
          temperature: 0.3,
          disableThinking: true
        })
        const list = LlmJsonParser.parseJsonArray(reply)
        if (!list) return null
        const entries: DictionaryEntry[] = []
        for (const entry of list) {
          const headword = entry.headword ?? entry.word
          if (!headword) continue
          entries.push({
            headword,
            lang,
            senses: entry.sense ? [entry.sense] : [],
            reading: entry.reading ?? null,
            pos: entry.pos ?? null
          })
        }
        return entries.length > 0 ? entries : null
      } catch {
        return null
      }
    }
  }
}
