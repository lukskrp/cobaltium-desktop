import { ChatMode } from './enums'
import type { Message, Thread } from './models'

/**
 * Parses a `cobaltium.chat` v1 export (from PhonosAssist/Android) into
 * Cobaltium Thread + Message models. Pure (no platform dependencies) so it
 * is unit-testable. Port of Android `data/export/ChatImporter.kt`.
 *
 * Imported messages get fresh ids and the thread keeps a fresh id, so
 * re-importing the same file yields a separate session rather than
 * clobbering an existing one.
 */

export const CHAT_EXPORT_FORMAT = 'cobaltium.chat'
export const CHAT_EXPORT_VERSION = 1

const TITLE_MAX = 60
const DEFAULT_TITLE = 'Imported chat'

export type ChatImportReason = 'EMPTY' | 'NOT_JSON' | 'WRONG_FORMAT' | 'UNSUPPORTED_VERSION' | 'NO_MESSAGES'

export type ChatImportResult =
  | { ok: true; thread: Thread; messages: Message[] }
  | { ok: false; reason: ChatImportReason }

interface RawImportThread {
  title?: unknown
  mode?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

interface RawImportMessage {
  role?: unknown
  content?: unknown
  createdAt?: unknown
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function roleOf(raw: string): Message['role'] {
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'assistant') return 'assistant'
  if (normalized === 'system') return 'system'
  return 'user'
}

/** Parse + normalize raw export text; never throws. */
export function parseChatImport(
  raw: string,
  idFactory: () => string = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  now: () => number = () => Date.now()
): ChatImportResult {
  // Tolerate a UTF-8 BOM (some editors/tools prepend one).
  const trimmed = (raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).trim()
  if (trimmed === '') return { ok: false, reason: 'EMPTY' }

  let doc: { format?: unknown; version?: unknown; thread?: unknown; messages?: unknown }
  try {
    doc = JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    return { ok: false, reason: 'NOT_JSON' }
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return { ok: false, reason: 'NOT_JSON' }
  }
  if (doc.format !== CHAT_EXPORT_FORMAT) return { ok: false, reason: 'WRONG_FORMAT' }
  if (typeof doc.version !== 'number' || doc.version > CHAT_EXPORT_VERSION) {
    return { ok: false, reason: 'UNSUPPORTED_VERSION' }
  }

  const threadId = idFactory()
  const rawMessages = Array.isArray(doc.messages) ? (doc.messages as RawImportMessage[]) : []
  const messages: Message[] = []
  let previous = 0
  for (const entry of rawMessages) {
    if (typeof entry !== 'object' || entry === null) continue
    const content = asString(entry.content).trim()
    if (content === '') continue
    // Preserve original timestamps; bump only to keep the file's own order
    // when a value is missing or not strictly increasing.
    let timestamp = asNumber(entry.createdAt)
    if (timestamp <= previous || timestamp <= 0) {
      timestamp = previous > 0 ? previous + 1 : now()
    }
    previous = timestamp
    messages.push({
      id: idFactory(),
      threadId,
      role: roleOf(asString(entry.role)),
      content,
      createdAt: timestamp
    })
  }
  if (messages.length === 0) return { ok: false, reason: 'NO_MESSAGES' }

  const rawThread = (typeof doc.thread === 'object' && doc.thread !== null ? doc.thread : {}) as RawImportThread
  const first = messages[0]
  const last = messages[messages.length - 1]
  const title =
    asString(rawThread.title).trim().slice(0, TITLE_MAX) ||
    first.content.slice(0, TITLE_MAX).trim() ||
    DEFAULT_TITLE
  const created = asNumber(rawThread.createdAt) > 0 ? asNumber(rawThread.createdAt) : first.createdAt
  const updated = Math.max(asNumber(rawThread.updatedAt), last.createdAt, created)
  return {
    ok: true,
    thread: {
      id: threadId,
      title,
      createdAt: created,
      updatedAt: updated,
      collapsed: false,
      mode: ChatMode.fromWire(asString(rawThread.mode)),
      starred: false,
      draft: '',
      contextNotes: '',
      notesThroughMessageId: ''
    },
    messages
  }
}
