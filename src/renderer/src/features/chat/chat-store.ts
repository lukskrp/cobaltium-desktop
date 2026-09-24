import { create } from 'zustand'
import { budgets, planContext } from '@shared/domain/context-window'
import { mergeThinking, splitThinking } from '@shared/domain/thinking'
import { PromptBuilder } from '@shared/domain/prompts'
import { TitleGenerator } from '@shared/domain/title-generator'
import type { ChatMode } from '@shared/domain/enums'
import type { AppSettings } from '@shared/domain/settings'
import type { ChatMessage } from '@shared/domain/llm'
import type { Message, Thread } from '@shared/domain/models'
import { getApi } from '@renderer/lib/ipc'
import { speak } from '@renderer/lib/tts'
import { useSettingsStore } from '@renderer/features/settings/settings-store'

const TITLE_PLACEHOLDER = 'New chat'
/** Context window assumed for cloud providers when the model is unknown. */
const CLOUD_CONTEXT = 8192

interface StreamHandlers {
  onToken: (text: string) => void
  onThinking: (text: string) => void
  onDone: () => void
  onError: (message: string) => void
}

const streamHandlers = new Map<string, StreamHandlers>()
let listenerInstalled = false
let currentStreamId: string | null = null
/**
 * Generation counter: bumped every time a stream is superseded (thread/mode
 * switch). The in-flight `send()` checks its captured value before saving a
 * reply and before clearing generating state, so a late stream can never
 * write into the wrong thread or clobber a newer generation's UI state.
 */
let generationSeq = 0
let draftTimer: ReturnType<typeof setTimeout> | null = null
let initPromise: Promise<void> | null = null

function installListener(): void {
  if (listenerInstalled) return
  listenerInstalled = true
  getApi()?.llm.onEvent((event) => {
    const handlers = streamHandlers.get(event.id)
    if (!handlers) return
    if (event.type === 'token') {
      handlers.onToken(event.text ?? '')
    } else if (event.type === 'thinking') {
      handlers.onThinking(event.text ?? '')
    } else if (event.type === 'done') {
      streamHandlers.delete(event.id)
      handlers.onDone()
    } else {
      streamHandlers.delete(event.id)
      handlers.onError(event.message ?? 'Generation failed')
    }
  })
}

/** Resolve the user's native language ('auto' -> OS locale). */
export function resolveTargetLang(raw: string): string {
  if (raw && raw !== 'auto') return raw.toLowerCase()
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en'
  const base = locale.split('-')[0]
  return base || 'en'
}

/** Voice-mode STT language ('auto' follows the learning language). */
export function resolveVoiceInputLang(settings: AppSettings): string {
  const code = settings.voiceInputLang?.trim().toLowerCase()
  if (code && code !== 'auto') return code
  return (settings.learnLang || 'en').toLowerCase()
}

/** Voice-mode reply language ('auto' replies in the spoken language). */
export function resolveVoiceResponseLang(settings: AppSettings): string {
  const code = settings.voiceResponseLang?.trim().toLowerCase()
  if (code && code !== 'auto') return code
  return resolveVoiceInputLang(settings)
}

/** Strip chat-template end-markers the model may leak into the stream. */
export function sanitizeAssistantText(text: string): string {
  const markers = ['<|im_end|>', '<|im_start|>', '</s>']
  const indices = markers.map((marker) => text.indexOf(marker)).filter((index) => index >= 0)
  const head = indices.length > 0 ? text.slice(0, Math.min(...indices)) : text
  return head.replace(/<\|im[\w|]*\|?>/g, '').replace(/<\/s>?/g, '').trim()
}

interface ChatState {
  threads: Thread[]
  messageCounts: Record<string, number>
  activeThreadId: string | null
  messages: Message[]
  streamingText: string | null
  streamingThinking: string | null
  /** Completed thinking by message id (session-only); collapsed by default. */
  messageThinking: Record<string, string>
  /** Message ids whose thinking block is expanded. */
  expandedThinking: Record<string, boolean>
  toggleThinking(id: string): void
  isGenerating: boolean
  generatingThreadId: string | null
  error: string | null
  translating: Record<string, boolean>
  initialized: boolean

  init(): Promise<void>
  refreshThreads(): Promise<void>
  refreshMessages(): Promise<void>
  selectThread(id: string): Promise<void>
  newThread(): Promise<void>
  setMode(mode: ChatMode): Promise<void>
  deleteThread(id: string): Promise<void>
  renameThread(id: string, title: string): Promise<void>
  toggleStarred(id: string): Promise<void>
  send(text: string): Promise<void>
  cancel(): void
  /** Id of the message currently being spoken (TTS loading or playing), if any. */
  speakingMessageId: string | null
  speakMessage(messageId: string, text: string, lang: string): Promise<void>
  updateDraft(text: string): void
  translateMessage(message: Message): Promise<void>
  askAboutWord(prompt: string): Promise<void>
  appendContext(text: string): Promise<void>
  dismissError(): void
}

export const useChatStore = create<ChatState>((set, get) => {
  /**
   * Abort any in-flight generation and invalidate it, so its late events can
   * neither save a reply nor clear a newer generation's state. Must be called
   * before every active-thread change. The pending `send()` still resolves
   * (via the 'Cancelled' error event) and exits through its superseded path.
   */
  function stopGeneration(): void {
    generationSeq++
    const id = currentStreamId
    currentStreamId = null
    if (id) void getApi()?.llm.cancel(id)
    set({ streamingText: null, streamingThinking: null, isGenerating: false, generatingThreadId: null })
  }

  async function patchActiveThread(id: string | null): Promise<void> {
    set({ activeThreadId: id })
    if (id) await useSettingsStore.getState().patch({ activeThreadId: id })
    await get().refreshMessages()
  }

  async function ensureThreadPersisted(threadId: string): Promise<void> {
    const api = getApi()
    if (!api) return
    if (await api.threads.get(threadId)) return
    const now = Date.now()
    const thread: Thread = {
      id: threadId,
      title: TITLE_PLACEHOLDER,
      createdAt: now,
      updatedAt: now,
      collapsed: false,
      mode: useSettingsStore.getState().settings.chatMode as ChatMode,
      starred: false,
      draft: '',
      contextNotes: '',
      notesThroughMessageId: ''
    }
    await api.threads.upsert(thread)
  }

  async function touchThread(threadId: string, firstUserMsg: string): Promise<void> {
    const api = getApi()
    if (!api) return
    const thread = await api.threads.get(threadId)
    if (!thread) return
    const updated: Thread = { ...thread, updatedAt: Date.now() }
    if (thread.title === TITLE_PLACEHOLDER) {
      const title = TitleGenerator.generate(firstUserMsg)
      if (title !== '') updated.title = title
    }
    await api.threads.upsert(updated)
  }

  async function summarizeContext(existingNotes: string, foldText: string): Promise<string> {
    const api = getApi()
    if (!api) return existingNotes
    try {
      const reply = await api.llm.complete({
        messages: [
          { role: 'system', content: PromptBuilder.summarizeSystemPrompt() },
          { role: 'user', content: PromptBuilder.summarizeUserPrompt(existingNotes, foldText) }
        ],
        maxTokens: 256,
        temperature: 0.3
      })
      return reply.trim() || existingNotes
    } catch {
      return existingNotes
    }
  }

  async function persistDraft(id: string, text: string): Promise<void> {
    const api = getApi()
    if (!api) return
    const thread = await api.threads.get(id)
    const hasMessages = (get().messageCounts[id] ?? 0) > 0
    if (text.trim() === '') {
      if (thread) {
        if (hasMessages) await api.threads.upsert({ ...thread, draft: '' })
        else await api.threads.delete(id)
      }
    } else if (!thread) {
      const now = Date.now()
      await api.threads.upsert({
        id,
        title: TITLE_PLACEHOLDER,
        createdAt: now,
        updatedAt: now,
        collapsed: false,
        mode: useSettingsStore.getState().settings.chatMode as ChatMode,
        starred: false,
        draft: text,
        contextNotes: '',
        notesThroughMessageId: ''
      })
    } else {
      await api.threads.upsert({ ...thread, draft: text })
    }
    await get().refreshThreads()
  }

  return {
    threads: [],
    messageCounts: {},
    activeThreadId: null,
    messages: [],
    streamingText: null,
    streamingThinking: null,
    messageThinking: {},
    expandedThinking: {},
    isGenerating: false,
    generatingThreadId: null,
    error: null,
    translating: {},
    speakingMessageId: null,
    initialized: false,

    async init() {
      if (get().initialized) return
      if (!initPromise) {
        initPromise = (async () => {
          installListener()
          await useSettingsStore.getState().load()
          await get().refreshThreads()

          const settings = useSettingsStore.getState().settings
          const threads = get().threads
          const mode = settings.chatMode as ChatMode
          const restored =
            settings.activeThreadId && threads.some((t) => t.id === settings.activeThreadId)
              ? settings.activeThreadId
              : threads.filter((t) => t.mode === mode).sort((a, b) => b.updatedAt - a.updatedAt)[0]
                  ?.id ?? crypto.randomUUID()

          const restoredThread = threads.find((t) => t.id === restored)
          if (restoredThread && restoredThread.mode !== mode) {
            await useSettingsStore.getState().patch({ chatMode: restoredThread.mode })
          }
          await patchActiveThread(restored)
          set({ initialized: true })
        })()
      }
      await initPromise
    },

    async refreshThreads() {
      const api = getApi()
      if (!api) return
      const [threads, messageCounts] = await Promise.all([api.threads.list(), api.messages.counts()])
      set({ threads, messageCounts })
    },

    async refreshMessages() {
      const api = getApi()
      const id = get().activeThreadId
      if (!api || !id) {
        set({ messages: [] })
        return
      }
      set({ messages: await api.messages.list(id) })
    },

    async selectThread(id) {
      const api = getApi()
      if (!api) return
      stopGeneration()
      const thread = await api.threads.get(id)
      if (thread) {
        const settings = useSettingsStore.getState().settings
        if ((settings.chatMode as ChatMode) !== thread.mode) {
          await useSettingsStore.getState().patch({ chatMode: thread.mode })
        }
      }
      await patchActiveThread(id)
    },

    async newThread() {
      stopGeneration()
      await patchActiveThread(crypto.randomUUID())
    },

    async setMode(mode) {
      stopGeneration()
      await useSettingsStore.getState().patch({ chatMode: mode })
      const active = get().threads.find((t) => t.id === get().activeThreadId)
      if (active?.mode === mode) return
      const candidate = get()
        .threads.filter((t) => t.mode === mode)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0]
      await patchActiveThread(candidate?.id ?? crypto.randomUUID())
    },

    async deleteThread(id) {
      const api = getApi()
      if (!api) return
      if (get().generatingThreadId === id) stopGeneration()
      await api.threads.delete(id)
      await get().refreshThreads()
      if (get().activeThreadId === id) {
        const mode = useSettingsStore.getState().settings.chatMode as ChatMode
        const next = get()
          .threads.filter((t) => t.mode === mode)
          .sort((a, b) => b.updatedAt - a.updatedAt)[0]
        await patchActiveThread(next?.id ?? crypto.randomUUID())
      }
    },

    async renameThread(id, title) {
      const api = getApi()
      if (!api || title.trim() === '') return
      const thread = await api.threads.get(id)
      if (!thread) return
      await api.threads.upsert({ ...thread, title: title.trim(), updatedAt: Date.now() })
      await get().refreshThreads()
    },

    async toggleStarred(id) {
      const api = getApi()
      if (!api) return
      const thread = await api.threads.get(id)
      if (!thread) return
      await api.threads.upsert({ ...thread, starred: !thread.starred })
      await get().refreshThreads()
    },

    async send(text) {
      const api = getApi()
      const trimmed = text.trim()
      if (!api || trimmed === '' || get().isGenerating) return
      const myGeneration = ++generationSeq

      let threadId = get().activeThreadId
      if (!threadId) {
        threadId = crypto.randomUUID()
        await patchActiveThread(threadId)
      }
      set({ error: null })
      await ensureThreadPersisted(threadId)

      const settings = useSettingsStore.getState().settings
      const mode = settings.chatMode as ChatMode

      await api.messages.save({
        id: crypto.randomUUID(),
        threadId,
        role: 'user',
        content: trimmed,
        createdAt: Date.now()
      })
      const threadRow = await api.threads.get(threadId)
      if (threadRow && threadRow.draft !== '') {
        await api.threads.upsert({ ...threadRow, draft: '' })
      }
      await get().refreshMessages()

      // Switched threads while the user message was being stored: leave the
      // message in its thread and generate nothing here.
      if (myGeneration !== generationSeq) return

      if (mode === 'reflective') {
        await touchThread(threadId, trimmed)
        await get().refreshThreads()
        return
      }

      if (!settings.llmEnabled) {
        set({ error: 'Enable the language model in Settings to chat in this mode.' })
        return
      }

      set({ isGenerating: true, generatingThreadId: threadId, streamingText: '' })
      try {
        const learn = settings.learnLang
        const helper = resolveTargetLang(settings.targetLang)
        const system =
          mode === 'voice'
            ? PromptBuilder.buildVoiceSystemPrompt(settings.voiceResponseLang)
            : PromptBuilder.buildSystemPrompt(mode, learn, helper)
        const systemTokens = await api.llm.countTokens(system)
        const [notesBudget, freshBudget] = budgets(CLOUD_CONTEXT, settings.llmMaxTokens, systemTokens)

        const all = await api.messages.list(threadId)
        const thread = await api.threads.get(threadId)
        const plan = await planContext({
          notes: thread?.contextNotes ?? '',
          boundaryId: thread?.notesThroughMessageId ?? '',
          messages: all,
          freshBudget,
          notesBudget,
          countTokens: (value) => api.llm.countTokens(value),
          summarize: summarizeContext
        })
        if (
          thread &&
          (plan.notes !== thread.contextNotes || plan.boundaryId !== thread.notesThroughMessageId)
        ) {
          await api.threads.upsert({
            ...thread,
            contextNotes: plan.notes,
            notesThroughMessageId: plan.boundaryId
          })
        }

        const finalMessages: ChatMessage[] = [
          { role: 'system', content: system },
          ...plan.messages
        ]

        const streamId = crypto.randomUUID()
        currentStreamId = streamId
        let buffer = ''
        let sseThinking = ''
        const pushStreamState = (): void => {
          const split = splitThinking(buffer)
          const thinking = mergeThinking(sseThinking, split.thinking)
          set({
            streamingText: sanitizeAssistantText(split.visible),
            streamingThinking: thinking !== '' ? thinking : null
          })
        }
        const result = await new Promise<{ text: string; thinking: string; error?: string }>((resolve) => {
          const doneThinking = (): string => {
            const split = splitThinking(buffer)
            return mergeThinking(sseThinking, split.thinking)
          }
          streamHandlers.set(streamId, {
            onToken: (token) => {
              buffer += token
              pushStreamState()
            },
            onThinking: (text) => {
              sseThinking += text
              pushStreamState()
            },
            onDone: () => resolve({ text: buffer, thinking: doneThinking() }),
            onError: (message) => resolve({ text: buffer, thinking: doneThinking(), error: message })
          })
          void api.llm
            .start(
              {
                messages: finalMessages,
                maxTokens: settings.llmMaxTokens,
                temperature: settings.llmTemperature
              },
              streamId
            )
            .catch((err: unknown) => {
              streamHandlers.delete(streamId)
              resolve({
                text: buffer,
                thinking: doneThinking(),
                error: err instanceof Error ? err.message : String(err)
              })
            })
        })
        currentStreamId = null

        const reply = sanitizeAssistantText(splitThinking(result.text).visible).trim()
        // A superseded stream (thread/mode switch mid-flight) must not save.
        const superseded = myGeneration !== generationSeq
        if (!superseded && reply !== '') {
          const replyId = crypto.randomUUID()
          await api.messages.save({
            id: replyId,
            threadId,
            role: 'assistant',
            content: reply,
            createdAt: Date.now()
          })
          if (result.thinking.trim() !== '') {
            set((state) => ({ messageThinking: { ...state.messageThinking, [replyId]: result.thinking } }))
          }
          await touchThread(threadId, trimmed)
          // Voice mode speaks the reply aloud (Android parity: TTS on voice replies).
          if (mode === 'voice' && settings.voiceTtsEnabled) {
            void get().speakMessage(replyId, reply, resolveVoiceResponseLang(settings))
          }
        } else if (!superseded && result.error && result.error !== 'Cancelled') {
          set({ error: result.error })
          await api.messages.save({
            id: crypto.randomUUID(),
            threadId,
            role: 'assistant',
            content: result.error,
            createdAt: Date.now()
          })
          await touchThread(threadId, trimmed)
        }
      } catch (err) {
        if (myGeneration === generationSeq) {
          set({ error: err instanceof Error ? err.message : String(err) })
        }
      } finally {
        currentStreamId = null
        // Only the owning generation clears the generating flags; a newer
        // generation (or a switch) owns them now. Lists are always refreshed.
        if (myGeneration === generationSeq) {
          set({ streamingText: null, streamingThinking: null, isGenerating: false, generatingThreadId: null })
        }
        await get().refreshThreads()
        await get().refreshMessages()
      }
    },

    cancel() {
      if (currentStreamId) void getApi()?.llm.cancel(currentStreamId)
    },

    toggleThinking(id) {
      set((state) => ({
        expandedThinking: { ...state.expandedThinking, [id]: !state.expandedThinking[id] }
      }))
    },

    async speakMessage(messageId, text, lang) {
      set({ speakingMessageId: messageId })
      try {
        await speak(text, lang)
      } finally {
        if (get().speakingMessageId === messageId) set({ speakingMessageId: null })
      }
    },

    updateDraft(text) {
      const id = get().activeThreadId
      if (!id) return
      if (draftTimer) clearTimeout(draftTimer)
      draftTimer = setTimeout(() => {
        void persistDraft(id, text)
      }, 400)
    },

    async translateMessage(message) {
      const api = getApi()
      if (!api || message.immersive) return
      const mode = useSettingsStore.getState().settings.chatMode as ChatMode
      // Voice mode shows raw text; translations/glosses never apply (Android parity).
      if (mode === 'conversation' || mode === 'corrective' || mode === 'voice') return
      if (mode === 'immersive' && message.role === 'user') return
      if (get().translating[message.id]) return

      const settings = useSettingsStore.getState().settings
      const learn = settings.learnLang
      const helper = resolveTargetLang(settings.targetLang)
      if (learn.toLowerCase() === helper.toLowerCase()) return
      const foreign = mode === 'reflective' ? helper : learn
      const native = mode === 'reflective' ? learn : helper

      set((state) => ({ translating: { ...state.translating, [message.id]: true }, error: null }))
      try {
        const data = await api.translation.translate(message.content, foreign, native)
        await api.messages.updateImmersive(message.id, data)
        await get().refreshMessages()
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) })
      } finally {
        set((state) => {
          const next = { ...state.translating }
          delete next[message.id]
          return { translating: next }
        })
      }
    },

    async askAboutWord(prompt) {
      const value = prompt.trim()
      if (value === '') return
      await get().init()
      await get().setMode('conversation')
      await get().send(value)
    },

    async appendContext(text) {
      const api = getApi()
      const trimmed = text.trim()
      if (!api || trimmed === '') return
      await get().init()
      const threadId = get().activeThreadId
      if (!threadId) return
      await ensureThreadPersisted(threadId)
      await api.messages.save({
        id: crypto.randomUUID(),
        threadId,
        role: 'user',
        content: trimmed,
        createdAt: Date.now()
      })
      await get().refreshMessages()
      await get().refreshThreads()
    },

    dismissError() {
      set({ error: null })
    }
  }
})
