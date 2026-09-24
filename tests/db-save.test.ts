import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('electron', async () => {
  const os = await vi.importActual<typeof import('node:os')>('node:os')
  const path = await vi.importActual<typeof import('node:path')>('node:path')
  const dir = path.join(os.tmpdir(), 'cobaltium-gatetest')
  return {
    app: {
      getPath: vi.fn(() => dir),
      getAppPath: vi.fn(() => process.cwd()),
      getVersion: vi.fn(() => '0.0.0-test'),
      getLocale: vi.fn(() => 'en-US'),
      isPackaged: false,
      on: vi.fn(),
      quit: vi.fn(),
      relaunch: vi.fn()
    },
    ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn() },
    shell: { openExternal: vi.fn() },
    dialog: { showSaveDialog: vi.fn(), showOpenDialog: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false },
    BrowserWindow: vi.fn(),
    Notification: vi.fn()
  }
})

const { initDatabase, closeDatabase } = await import('../src/main/db/index')
const { saveWord, listWords } = await import('../src/main/db/repositories/lexicon')

let seq = 0
function word(overrides: Record<string, unknown> = {}): Parameters<typeof saveWord>[0] {
  seq += 1
  return {
    id: `id-${Date.now()}-${seq}`,
    word: `talo-${seq}`,
    lang: 'fi',
    otherLang: 'en',
    translation: 'house',
    hoverType: 'manual',
    pos: null,
    definitions: [],
    analysis: null,
    savedAt: Date.now(),
    folderId: null,
    ...overrides
  } as Parameters<typeof saveWord>[0]
}

beforeAll(() => {
  // process.resourcesPath only exists inside Electron; the migration
  // resolver touches it before checking isPackaged.
  ;(process as unknown as Record<string, unknown>).resourcesPath ??= process.cwd()
  initDatabase()
})

afterAll(() => {
  closeDatabase()
})

describe('main saveWord (real DB)', () => {
  it('persists a fresh word and lists it back', () => {
    const before = listWords().length
    saveWord(word({ word: `kissa-${Date.now()}`, translation: 'cat' }))
    const after = listWords()
    expect(after.length).toBe(before + 1)
  })

  it('re-saving the same (word, lang) never throws and keeps one row', () => {
    const tag = `vesi-${Date.now()}`
    const first = word({ word: tag, translation: 'water' })
    saveWord(first)
    expect(() =>
      saveWord(word({ word: tag, translation: 'water-again', otherLang: 'fi' }))
    ).not.toThrow()
    const rows = listWords().filter((w) => w.word === tag)
    expect(rows).toHaveLength(1)
  })

  it('dedups by (word, lang): stable id, absorbs newer metadata', () => {
    const tag = `sana-${Date.now()}`
    const first = word({ word: tag, translation: '' })
    saveWord(first)
    saveWord(word({ word: tag, translation: 'word!', pos: 'noun' }))
    const rows = listWords().filter((w) => w.word === tag && w.lang === 'fi')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(first.id)
    expect(rows[0].translation).toBe('word!')
    expect(rows[0].pos).toBe('noun')
  })

  it('keeps the existing folder on re-save', () => {
    const tag = `kansio-${Date.now()}`
    saveWord(word({ word: tag, translation: 'folder', folderId: 'folder-1' }))
    saveWord(word({ word: tag, translation: 'folder!', folderId: null }))
    const rows = listWords().filter((w) => w.word === tag)
    expect(rows).toHaveLength(1)
    expect(rows[0].folderId).toBe('folder-1')
    expect(rows[0].translation).toBe('folder!')
  })
})
