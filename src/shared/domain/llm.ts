import type { ProviderKind } from './enums'

export interface ChatMessage {
  role: string
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  /**
   * Ask the provider to skip chain-of-thought for this request. Used by the
   * structured utility passes (translation, morphology, dictionary, inflection)
   * where reasoning only wastes the token budget and can leave the reply empty.
   */
  disableThinking?: boolean
}

/** One streamed token/chunk. */
export interface Token {
  text: string
}

/** The OpenAI-style request path. */
export type RemoteApiRoute = 'chat/completions' | 'responses' | 'messages'

/** Auth header scheme for a remote route. */
export type RemoteAuth = 'bearer' | 'x-api-key' | 'none'

/**
 * A cloud/local LLM vendor Cobaltium can talk to. Most expose OpenAI-compatible
 * `/v1/chat/completions`. New vendors are pure data here — no client changes
 * required for OpenAI-compatible ones.
 */
export interface CloudProviderPreset {
  id: string
  label: string
  /** Default endpoint; must end at `/v1` (the client appends the path). */
  baseUrl: string
  route: RemoteApiRoute
  auth: RemoteAuth
  /** Editable model-id suggestions shown in the UI. */
  knownModels: string[]
  /** False for local servers that do not need a key (Ollama, LM Studio, ...). */
  requiresKey: boolean
  /** True for servers running on the user's own machine. */
  local: boolean
}

export const CLOUD_PROVIDERS: readonly CloudProviderPreset[] = [
  {
    id: 'opencode-go',
    label: 'OpenCode Go',
    baseUrl: 'https://opencode.ai/zen/go/v1',
    route: 'chat/completions',
    auth: 'bearer',
    knownModels: ['deepseek-v4-flash', 'mimo-2.5', 'glm-5.1', 'kimi-k3', 'deepseek-v4-pro'],
    requiresKey: true,
    local: false
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    route: 'chat/completions',
    auth: 'bearer',
    knownModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-5'],
    requiresKey: true,
    local: false
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    route: 'chat/completions',
    auth: 'bearer',
    knownModels: [
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.1-70b-instruct'
    ],
    requiresKey: true,
    local: false
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    route: 'chat/completions',
    auth: 'bearer',
    knownModels: ['deepseek-chat', 'deepseek-reasoner'],
    requiresKey: true,
    local: false
  },
  {
    id: 'moonshot',
    label: 'Moonshot',
    baseUrl: 'https://api.moonshot.ai/v1',
    route: 'chat/completions',
    auth: 'bearer',
    knownModels: ['kimi-k3', 'moonshot-v1-8k', 'moonshot-v1-32k'],
    requiresKey: true,
    local: false
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    route: 'chat/completions',
    auth: 'bearer',
    knownModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    requiresKey: true,
    local: false
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    route: 'chat/completions',
    auth: 'none',
    knownModels: ['llama3.1', 'qwen2.5', 'mistral', 'gemma2'],
    requiresKey: false,
    local: true
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234/v1',
    route: 'chat/completions',
    auth: 'none',
    knownModels: [],
    requiresKey: false,
    local: true
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp server (local)',
    baseUrl: 'http://localhost:8080/v1',
    route: 'chat/completions',
    auth: 'none',
    knownModels: [],
    requiresKey: false,
    local: true
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    route: 'chat/completions',
    auth: 'bearer',
    knownModels: [],
    requiresKey: false,
    local: false
  }
] as const

export const DEFAULT_PROVIDER_ID = 'opencode-go'

export function getProviderPreset(id: string): CloudProviderPreset {
  return CLOUD_PROVIDERS.find((provider) => provider.id === id) ?? CLOUD_PROVIDERS[0]
}

/** Resolved cloud endpoint settings (from AppSettings + vendor defaults). */
export interface CloudConfig {
  baseUrl: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  route: RemoteApiRoute
  auth: RemoteAuth
}

/** Backend-agnostic LLM interface (local llama.cpp vs OpenAI-compatible cloud). */
export interface LLMClient {
  readonly kind: ProviderKind
  /** Prepare the backend (validates settings / loads weights). */
  load(): Promise<void>
  /** Release the backend. */
  unload(): Promise<void>
  /** Stream a chat completion, yielding incremental text chunks. */
  stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<string>
  /** Non-streaming completion (used by glossary/morphology passes). */
  complete(request: ChatRequest, signal?: AbortSignal): Promise<string>
  /** Request cancellation of an in-flight generation. */
  cancel(): void
  /** Exact token count where available; cloud providers use an estimate. */
  countTokens(text: string): Promise<number>
}

/** Narrow surface the translation/morphology passes need from the LLM manager. */
export interface LlmGateway {
  activate(): Promise<void>
  complete(request: ChatRequest): Promise<string>
  cancel(): void
}
