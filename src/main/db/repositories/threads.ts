import { desc, eq, notInArray, sql } from 'drizzle-orm'
import type { Message, Thread } from '@shared/domain/models'
import { getDb } from '../index'
import { messageRowToDomain, messageToRow, threadRowToDomain, threadToRow } from '../mappers'
import { messages, threads } from '../schema'

export function listThreads(): Thread[] {
  return getDb().select().from(threads).orderBy(desc(threads.updatedAt)).all().map(threadRowToDomain)
}

export function getThread(id: string): Thread | null {
  const row = getDb().select().from(threads).where(eq(threads.id, id)).get()
  return row ? threadRowToDomain(row) : null
}

export function upsertThread(thread: Thread): void {
  const row = threadToRow(thread)
  getDb().insert(threads).values(row).onConflictDoUpdate({ target: threads.id, set: row }).run()
}

export function deleteThread(id: string): void {
  getDb().delete(threads).where(eq(threads.id, id)).run()
}

/** Remove persisted sessions that have no messages and no draft (startup cleanup). */
export function deleteEmptyThreads(): void {
  const usedThreadIds = getDb()
    .selectDistinct({ threadId: messages.threadId })
    .from(messages)
    .all()
    .map((row) => row.threadId)

  if (usedThreadIds.length > 0) {
    getDb()
      .delete(threads)
      .where(sql`${threads.draft} = '' AND ${notInArray(threads.id, usedThreadIds)}`)
      .run()
  } else {
    getDb().delete(threads).where(sql`${threads.draft} = ''`).run()
  }
}

export function setThreadCollapsed(id: string, collapsed: boolean): void {
  getDb().update(threads).set({ collapsed, updatedAt: Date.now() }).where(eq(threads.id, id)).run()
}

export function listMessagesForThread(threadId: string): Message[] {
  return getDb()
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt)
    .all()
    .map(messageRowToDomain)
}

export function messageCounts(): Record<string, number> {
  const rows = getDb()
    .select({ threadId: messages.threadId, count: sql<number>`count(*)` })
    .from(messages)
    .groupBy(messages.threadId)
    .all()
  const out: Record<string, number> = {}
  for (const row of rows) out[row.threadId] = row.count
  return out
}

export function getMessage(id: string): Message | null {
  const row = getDb().select().from(messages).where(eq(messages.id, id)).get()
  return row ? messageRowToDomain(row) : null
}

export function saveMessage(message: Message): void {
  const row = messageToRow(message)
  getDb().insert(messages).values(row).onConflictDoUpdate({ target: messages.id, set: row }).run()
}

export function deleteMessage(id: string): void {
  getDb().delete(messages).where(eq(messages.id, id)).run()
}

export function updateMessageImmersive(id: string, immersiveJson: string | null): void {
  getDb().update(messages).set({ immersiveJson }).where(eq(messages.id, id)).run()
}
