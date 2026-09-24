import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import { buildEpub, escXml } from '@shared/epub/builder'
import { getThread, listMessagesForThread } from '../db/repositories/threads'

/** Export a chat thread as an EPUB (port of Android's `exportThreadEpub`). */
export async function exportThreadEpub(threadId: string): Promise<boolean> {
  const thread = getThread(threadId)
  if (!thread) return false
  const messages = listMessagesForThread(threadId)
  if (messages.length === 0) return false

  const chapters = messages.map((message, index) => ({
    title: `${message.role === 'user' ? 'You' : 'Tutor'} ${index + 1}`,
    content: `<p>${escXml(message.content)}</p>`
  }))
  const bytes = buildEpub(thread.title || 'Chat', 'Cobaltium', chapters)

  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(window, {
    title: 'Export EPUB',
    defaultPath: `${thread.title || 'chat'}.epub`,
    filters: [{ name: 'EPUB', extensions: ['epub'] }]
  })
  if (result.canceled || !result.filePath) return false
  writeFileSync(result.filePath, bytes)
  return true
}
