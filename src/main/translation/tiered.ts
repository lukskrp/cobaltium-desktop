import { Languages } from '@shared/domain/languages'
import { PromptBuilder } from '@shared/domain/prompts'
import { LlmJsonParser } from '@shared/domain/json-parser'
import type { AppSettings } from '@shared/domain/settings'
import type { ImmersiveData } from '@shared/domain/models'
import { complete } from '../llm/manager'
import { completeChatCompletion } from '../llm/openai-compatible'
import { loadAppSettings } from '../db/repositories/settings'
import { getKey } from '../security/secure-keys'
import { ContentSafetyFilter, SafetyBlockedError } from '@shared/domain/safety'
import { GlossFilter, isUsefulTranslation } from '@shared/domain/translation'
import { deepLTranslate, googleTranslate } from './external'
import type { CloudConfig } from '@shared/domain/llm'

export { GlossFilter, isUsefulTranslation }

const FAST_TIMEOUT_MS = 10_000

/** Optional plug-in tier: a local fast translator (e.g. NLLB ONNX) that
 *  resolves a translation in a single call and never streams. */
export interface FastTranslator {
  translate(text: string, foreignLang: string, nativeLang: string): Promise<ImmersiveData | null>
}

function normalizeBaseUrl(url: string): string {
  let trimmed = url.replace(/\/+$/, '')
  if (/^https?:\/\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^https?:\/\/0\.0\.0\.0/, 'http://127.0.0.1')
  } else {
    trimmed = trimmed.replace(/^0\.0\.0\.0/, '127.0.0.1')
    trimmed = `http://${trimmed}`
  }
  return trimmed
}

/** Resolve the persisted fast-translation settings + decrypted key into a
 *  concrete cloud config, or null when the tier is disabled/unconfigured. */
export function resolveFastConfig(settings: AppSettings, apiKey: string | null): CloudConfig | null {
  if (!settings.fastTranslateEnabled) return null
  if (settings.fastTranslateBaseUrl.trim() === '') return null
  const baseUrl = normalizeBaseUrl(settings.fastTranslateBaseUrl.trim())
  if (!baseUrl) return null
  const key = apiKey ?? ''
  return {
    baseUrl,
    apiKey: key,
    model: settings.fastTranslateModel,
    maxTokens: 1024,
    temperature: 0.2,
    route: 'chat/completions',
    auth: key ? 'bearer' : 'none'
  }
}

async function fastTranslate(
  text: string,
  from: string,
  to: string
): Promise<ImmersiveData | null> {
  const settings = loadAppSettings()
  const config = resolveFastConfig(settings, getKey('fast-translate'))
  if (!config) return null
  const sourceName = Languages.name(from)
  const targetName = Languages.name(to)
  const trimmed = text.trim()
  if (trimmed === '' || from.toLowerCase() === to.toLowerCase()) {
    return { sourceText: text, glossMap: {}, foreignLang: from }
  }
  const verdict = ContentSafetyFilter.check(trimmed)
  if (!verdict.allowed) throw new SafetyBlockedError(verdict.category ?? 'HARMFUL')
  const messages = [
    { role: 'system', content: PromptBuilder.translationSystemPrompt(sourceName, targetName) },
    { role: 'user', content: PromptBuilder.translationUserPrompt(trimmed, sourceName, targetName) }
  ]
  let parsed!: ReturnType<typeof LlmJsonParser.parseTranslation>
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(settings.fastTranslateTimeoutMs ?? FAST_TIMEOUT_MS, FAST_TIMEOUT_MS))
    const reply = await completeChatCompletion(config, { messages, maxTokens: 1024, temperature: 0.2, disableThinking: true }, controller.signal)
    clearTimeout(timer)
    parsed = LlmJsonParser.parseTranslation(reply)
  } catch {
    return null
  }
  if (!parsed) return null
  const glossMap = GlossFilter(parsed.translation, parsed.glosses)
  return { sourceText: parsed.translation, glossMap, foreignLang: from }
}

async function llmTranslate(text: string, from: string, to: string): Promise<ImmersiveData> {
  const sourceName = Languages.name(from)
  const targetName = Languages.name(to)
  const trimmed = text.trim()
  const messages = [
    { role: 'system', content: PromptBuilder.translationSystemPrompt(sourceName, targetName) },
    { role: 'user', content: PromptBuilder.translationUserPrompt(trimmed, sourceName, targetName) }
  ]
  let parsed: ReturnType<typeof LlmJsonParser.parseTranslation> = null
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    const reply = await complete({ messages, maxTokens: 4096, temperature: 0.2, disableThinking: true })
    parsed = LlmJsonParser.parseTranslation(reply)
    if (!parsed) console.warn(`[translation] attempt ${attempt + 1} returned no usable JSON`)
  }
  if (!parsed) throw new Error('Translation returned no data')
  const glossMap = GlossFilter(parsed.translation, parsed.glosses)
  return { sourceText: parsed.translation, glossMap, foreignLang: from }
}

/** Tiered dispatcher: fast Tailscale Qwen preset → DeepL/Google → LLM.
 *  Each tier is time-bounded and falls through on failure or a useless result.
 *  Mirrors Android `TieredTranslator` (`TranslationEngine.kt:40-132`). */
export async function translateText(text: string, from: string, to: string): Promise<ImmersiveData> {
  if (from.toLowerCase() === to.toLowerCase()) {
    return { sourceText: text, glossMap: {}, foreignLang: from }
  }
  // Tier 1 — fast translation (Tailscale Qwen preset).
  const fastResult = await fastTranslate(text, from, to)
  if (fastResult && isUsefulTranslation(text, fastResult.sourceText)) {
    return fastResult
  }
  // Tier 2 — external provider (DeepL / Google).
  const settings = loadAppSettings()
  const provider = settings.translationProvider
  if (provider === 'deepl') {
    const key = getKey('deepl')
    if (key) {
      const plan = settings.deeplPlan === 'pro' ? 'pro' : 'free'
      const result = await deepLTranslate(text, from, to, key, plan)
      if (isUsefulTranslation(text, result)) {
        return { sourceText: result, glossMap: {}, foreignLang: from }
      }
    }
  } else if (provider === 'google') {
    const key = getKey('google')
    if (key) {
      const result = await googleTranslate(text, from, to, key)
      if (isUsefulTranslation(text, result)) {
        return { sourceText: result, glossMap: {}, foreignLang: from }
      }
    }
  }
  // Tier 3 — LLM fallback.
  return llmTranslate(text, from, to)
}
