import { getKey } from '../security/secure-keys'
import { loadAppSettings } from '../db/repositories/settings'
import { resolveCloudConfig } from '@shared/domain/settings'
import { getProviderPreset, type ChatRequest, type CloudConfig } from '@shared/domain/llm'
import { ContentSafetyFilter, SafetyBlockedError } from '@shared/domain/safety'
import { completeChatCompletion, estimateTokens, streamChatCompletion } from './openai-compatible'
import type { LlmStreamEvent, ProviderInfo } from '@shared/ipc'

const activeStreams = new Map<string, AbortController>()

/** Resolve the persisted settings + decrypted key into a concrete cloud config. */
export function currentCloudConfig(): CloudConfig {
  const settings = loadAppSettings()
  return resolveCloudConfig(settings, getKey(settings.cloudProvider))
}

export function providerInfo(): ProviderInfo {
  const settings = loadAppSettings()
  const preset = getProviderPreset(settings.cloudProvider)
  const baseUrl = settings.llmBaseUrl.trim() || preset.baseUrl
  return {
    providerId: preset.id,
    label: preset.label,
    model: settings.llmModel,
    baseUrl,
    hasKey: getKey(preset.id) != null,
    requiresKey: preset.requiresKey,
    local: preset.local
  }
}

function assertSafe(request: ChatRequest): void {
  const userText =
    [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? ''
  if (userText.trim() === '') return
  const verdict = ContentSafetyFilter.check(userText)
  if (!verdict.allowed) throw new SafetyBlockedError(verdict.category ?? 'HARMFUL')
}

export async function complete(request: ChatRequest): Promise<string> {
  assertSafe(request)
  return completeChatCompletion(currentCloudConfig(), request)
}

export function countTokens(text: string): number {
  return estimateTokens(text)
}

/**
 * Run a streamed completion, forwarding incremental events to `onEvent`. The
 * returned promise resolves when the stream finishes. Cancel via `cancelStream`.
 */
export async function runStream(
  id: string,
  request: ChatRequest,
  onEvent: (event: LlmStreamEvent) => void
): Promise<void> {
  const controller = new AbortController()
  activeStreams.set(id, controller)
  try {
    assertSafe(request)
    const config = currentCloudConfig()
    for await (const chunk of streamChatCompletion(config, request, controller.signal)) {
      onEvent({ id, type: chunk.type === 'thinking' ? 'thinking' : 'token', text: chunk.text })
    }
    onEvent({ id, type: 'done' })
  } catch (error) {
    if (controller.signal.aborted) {
      onEvent({ id, type: 'error', message: 'Cancelled' })
    } else if (error instanceof SafetyBlockedError) {
      onEvent({ id, type: 'error', message: error.message, category: error.category })
    } else {
      onEvent({ id, type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  } finally {
    activeStreams.delete(id)
  }
}

export function cancelStream(id: string): boolean {
  const controller = activeStreams.get(id)
  if (!controller) return false
  controller.abort()
  activeStreams.delete(id)
  return true
}

export function cancelAllStreams(): void {
  for (const controller of activeStreams.values()) controller.abort()
  activeStreams.clear()
}
