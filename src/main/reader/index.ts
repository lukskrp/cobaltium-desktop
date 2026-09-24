import { app, dialog, BrowserWindow } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { unzipSync } from 'fflate'
import { buildEpub, escXml } from '@shared/epub/builder'
import { parseEpubEntries } from '@shared/epub/parser'
import {
  createReaderState,
  type ReaderBook,
  type ReaderBookMeta,
  type ReaderState
} from '@shared/epub'

function readerRoot(): string {
  const dir = join(app.getPath('userData'), 'reader')
  mkdirSync(dir, { recursive: true })
  return dir
}

function bookDir(id: string): string {
  return join(readerRoot(), id)
}

function decodeEpub(bytes: Uint8Array): Map<string, string> {
  const files = unzipSync(bytes)
  const decoder = new TextDecoder()
  const entries = new Map<string, string>()
  for (const [name, data] of Object.entries(files)) {
    if (name.endsWith('/')) continue
    if (!/\.(xhtml|html|xml|opf|ncx|txt)$/i.test(name) && name !== 'mimetype') continue
    entries.set(name, decoder.decode(data))
  }
  return entries
}

function readMeta(id: string): ReaderBookMeta | null {
  const path = join(bookDir(id), 'meta.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ReaderBookMeta
  } catch {
    return null
  }
}

export function listBooks(): ReaderBookMeta[] {
  const root = readerRoot()
  const metas: ReaderBookMeta[] = []
  for (const id of readdirSync(root)) {
    const meta = readMeta(id)
    if (meta) metas.push(meta)
  }
  return metas.sort((a, b) => b.addedAt - a.addedAt)
}

function importEpubFile(sourcePath: string): { book: ReaderBook; meta: ReaderBookMeta } | null {
  const id = randomUUID()
  const dir = bookDir(id)
  mkdirSync(dir, { recursive: true })
  const bytes = readFileSync(sourcePath)
  const entries = decodeEpub(new Uint8Array(bytes))
  const parsed = parseEpubEntries(entries)
  if (!parsed) {
    rmSync(dir, { recursive: true, force: true })
    return null
  }
  const book: ReaderBook = {
    ...parsed,
    id,
    title: parsed.title || basename(sourcePath).replace(/\.epub$/i, '')
  }
  writeFileSync(join(dir, 'book.epub'), bytes)
  const meta: ReaderBookMeta = {
    id,
    title: book.title,
    author: book.author,
    chapterCount: book.chapters.length,
    addedAt: Date.now()
  }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta))
  writeFileSync(join(dir, 'state.json'), JSON.stringify(createReaderState()))
  return { book, meta }
}

export async function openViaDialog(): Promise<{ book: ReaderBook; state: ReaderState } | null> {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showOpenDialog(window, {
    title: 'Open EPUB',
    properties: ['openFile'],
    filters: [{ name: 'EPUB', extensions: ['epub'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const imported = importEpubFile(result.filePaths[0])
  if (!imported) throw new Error('Not a readable EPUB')
  return { book: imported.book, state: createReaderState() }
}

export function openPath(sourcePath: string): { book: ReaderBook; state: ReaderState } | null {
  const imported = importEpubFile(sourcePath)
  return imported ? { book: imported.book, state: createReaderState() } : null
}

export function loadBook(id: string): { book: ReaderBook; state: ReaderState } | null {
  const epubPath = join(bookDir(id), 'book.epub')
  if (!existsSync(epubPath)) return null
  const entries = decodeEpub(new Uint8Array(readFileSync(epubPath)))
  const parsed = parseEpubEntries(entries)
  if (!parsed) return null
  return { book: { ...parsed, id }, state: loadState(id) }
}

export function loadState(id: string): ReaderState {
  const path = join(bookDir(id), 'state.json')
  if (!existsSync(path)) return createReaderState()
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ReaderState>
    return { ...createReaderState(), ...parsed, editedBlocks: parsed.editedBlocks ?? {} }
  } catch {
    return createReaderState()
  }
}

export function saveState(id: string, state: ReaderState): void {
  writeFileSync(join(bookDir(id), 'state.json'), JSON.stringify(state))
}

export function deleteBook(id: string): void {
  rmSync(bookDir(id), { recursive: true, force: true })
}

export async function exportBook(id: string, state: ReaderState): Promise<boolean> {
  const loaded = loadBook(id)
  if (!loaded) return false
  const { book } = loaded
  const chapters = book.chapters.map((chapter) => {
    const blocks = state.editedBlocks[chapter.id] ?? chapter.blocks
    const body = blocks.map((block) => `<p>${escXml(block)}</p>`).join('\n')
    return { title: chapter.title || chapter.href, content: body }
  })
  const bytes = buildEpub(book.title || 'Book', book.author, chapters)

  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(window, {
    title: 'Export EPUB',
    defaultPath: `${book.title || 'book'}.epub`,
    filters: [{ name: 'EPUB', extensions: ['epub'] }]
  })
  if (result.canceled || !result.filePath) return false
  writeFileSync(result.filePath, bytes)
  return true
}
