import { ChatMode, MessageRole } from '@shared/domain/enums'
import type { ImmersiveData, Message, Thread } from '@shared/domain/models'
import type { MessageRow, NewMessageRow, NewThreadRow, ThreadRow } from './schema'

/** Defensively parse a JSON column. */
function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function threadRowToDomain(row: ThreadRow): Thread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    collapsed: row.collapsed,
    mode: ChatMode.fromWire(row.mode),
    starred: row.starred,
    draft: row.draft,
    contextNotes: row.contextNotes,
    notesThroughMessageId: row.notesThroughMessageId
  }
}

export function threadToRow(thread: Thread): NewThreadRow {
  return {
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    collapsed: thread.collapsed,
    mode: thread.mode,
    starred: thread.starred,
    draft: thread.draft,
    contextNotes: thread.contextNotes,
    notesThroughMessageId: thread.notesThroughMessageId
  }
}

export function messageRowToDomain(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.threadId,
    role: MessageRole.fromWire(row.role),
    content: row.content,
    createdAt: row.createdAt,
    immersive: parseJson<ImmersiveData>(row.immersiveJson)
  }
}

export function messageToRow(message: Message): NewMessageRow {
  return {
    id: message.id,
    threadId: message.threadId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    immersiveJson: message.immersive ? JSON.stringify(message.immersive) : null
  }
}
