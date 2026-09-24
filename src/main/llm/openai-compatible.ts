import type { ChatRequest, CloudConfig } from '@shared/domain/llm'

const DONE = Symbol('sse-done')

function requestUrl(config: CloudConfig): string {
  return `${config.baseUrl}/${config.route}`
}

function authHeaders(config: CloudConfig): Record<string, string> {
  if (config.auth === 'none') return {}
  if (config.auth === 'x-api-key') return { 'x-api-key': config.apiKey }
  return { Authorization: `Bearer ${config.apiKey}` }
}

function requestBody(
  config: CloudConfig,
  request: ChatRequest,
  stream: boolean,
  thinkingControls: boolean
): string {
  const body: Record<string, unknown> = {
    model: config.model,
    stream,
    temperature: request.temperature ?? config.temperature,
    max_tokens: request.maxTokens ?? config.maxTokens,
    messages: request.messages.map((message) => ({
      role: message.role,
      content: message.content
    }))
  }
  if (thinkingControls) {
    // Nudge reasoning models to answer directly. Unknown fields are ignored by
    // most OpenAI-compatible servers, and we retry without them on HTTP 400.
    body.reasoning_effort = 'none'
    body.chat_template_kwargs = { enable_thinking: false }
  }
  return JSON.stringify(body)
}

interface SseChoiceDelta {
  content?: unknown
  reasoning_content?: unknown
  reasoning?: unknown
}
interface SseChoice {
  delta?: SseChoiceDelta
  message?: SseChoiceDelta
  text?: unknown
}
interface SseRoot {
  error?: unknown
  choices?: SseChoice[]
}

/** One tagged piece of a streamed completion. */
export interface StreamChunk {
  type: 'text' | 'thinking'
  text: string
}

function chunkText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const joined = value
      .map((part) => (part && typeof part === 'object' ? ((part as { text?: string }).text ?? '') : ''))
      .join('')
    return joined === '' ? null : joined
  }
  return null
}

/**
 * Parse one SSE data line into tagged chunks. Reasoning-model fields
 * (`reasoning_content` / `reasoning`, used by DeepSeek/Qwen-style
 * OpenAI-compatible servers) surface as `thinking` chunks instead of being
 * dropped. Pure (unit-tested).
 */
export function parseSseChunk(line: string): StreamChunk[] | typeof DONE | null {
  if (!line.startsWith('data:')) return null
  const payload = line.slice(5).trim()
  if (payload === '') return null
  if (payload === '[DONE]') return DONE

  let root: SseRoot
  try {
    root = JSON.parse(payload) as SseRoot
  } catch {
    return null
  }
  if (root.error) {
    const message =
      typeof root.error === 'string'
        ? root.error
        : ((root.error as { message?: string }).message ?? 'Provider error')
    throw new Error(message)
  }
  const choice = Array.isArray(root.choices) ? root.choices[0] : undefined
  if (!choice) return null

  const out: StreamChunk[] = []
  const thinking = chunkText(
    choice.delta?.reasoning_content ??
      choice.delta?.reasoning ??
      choice.message?.reasoning_content ??
      choice.message?.reasoning
  )
  if (thinking) out.push({ type: 'thinking', text: thinking })
  const text =
    chunkText(choice.delta?.content ?? choice.message?.content) ??
    (typeof choice.text === 'string' ? choice.text : null)
  if (text) out.push({ type: 'text', text })
  return out.length > 0 ? out : null
}

/** Stream an OpenAI-compatible chat completion, yielding tagged text/thinking chunks. */
export async function* streamChatCompletion(
  config: CloudConfig,
  request: ChatRequest,
  signal: AbortSignal
): AsyncGenerator<StreamChunk> {
  const doFetch = (thinkingControls: boolean): Promise<Response> =>
    fetch(requestUrl(config), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...authHeaders(config)
      },
      body: requestBody(config, request, true, thinkingControls),
      signal
    }).catch((error: Error & { cause?: Error }) => {
      const detail = error.cause?.message ?? error.message
      throw new Error(`Failed to connect to ${config.baseUrl}: ${detail}`)
    })

  let response = await doFetch(request.disableThinking === true)
  if (!response.ok && response.status === 400 && request.disableThinking) {
    // The provider rejected the thinking-control fields; retry without them.
    response = await doFetch(false)
  }

  if (!response.ok) {
    const detail = await response
      .text()
      .then((text) => text.slice(0, 200))
      .catch(() => '')
    throw new Error(`HTTP ${response.status}${detail ? ` - ${detail}` : ''}`)
  }
  if (!response.body) throw new Error('Empty response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const rawLine = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        const parsed = parseSseChunk(rawLine.replace(/\r$/, ''))
        if (parsed === DONE) return
        if (parsed !== null) yield* parsed
        newlineIndex = buffer.indexOf('\n')
      }
    }
    const parsed = parseSseChunk(buffer.replace(/\r$/, ''))
    if (parsed !== null && parsed !== DONE) yield* parsed
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* already released */
    }
  }
}

/** Non-streaming completion (used by glossary/morphology passes). */
export async function completeChatCompletion(
  config: CloudConfig,
  request: ChatRequest,
  signal?: AbortSignal
): Promise<string> {
  const controller = new AbortController()
  const onAbort = (): void => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    let out = ''
    for await (const chunk of streamChatCompletion(config, request, controller.signal)) {
      // Thinking chunks never belong in the (non-streamed) answer text.
      if (chunk.type === 'text') out += chunk.text
    }
    return out
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Rough character-based token estimate for cloud providers without a tokenizer. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.floor(text.length / 4))
}
