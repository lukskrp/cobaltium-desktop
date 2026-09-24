import { createLanguageEngine, type LanguageEngine, type LanguageEngineComponents } from '@shared/lang'
import type { LangResourceStatus } from '@shared/ipc'
import { complete } from '../llm/manager'
import { languageResourcesStatus, loadLanguageResources } from './resources'
import { createJaAnalyzers, type JaAnalyzers } from './kuromoji'

let components: LanguageEngineComponents | null = null

function buildComponents(ja: JaAnalyzers | null = null): LanguageEngineComponents {
  const created = createLanguageEngine({
    complete: (request) => complete(request),
    ...(ja ? { tokenizers: { sudachi: ja.tokenizer }, romanizers: { hepburn: ja.romanizer } } : {})
  })
  loadLanguageResources(created)
  return created
}

/**
 * Builds the engine with the bundled Japanese tokenizer. Call before serving
 * language IPC so `ja` segmentation/readings are available from the first use.
 */
export async function initLanguageEngine(): Promise<void> {
  if (components) return
  const ja = await createJaAnalyzers().catch(() => null)
  components = buildComponents(ja)
}

/** Lazily-built language engine with LLM-backed morphology/inflection/dictionary tiers. */
export function getLanguageEngine(): LanguageEngine {
  if (!components) components = buildComponents()
  return components.engine
}

/** Which data-driven tables (pinyin, han↔kanji) were loaded successfully. */
export function getLanguageResourceStatus(): LangResourceStatus {
  if (!components) components = buildComponents()
  return languageResourcesStatus()
}
