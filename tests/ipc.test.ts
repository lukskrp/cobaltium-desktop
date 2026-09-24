import { describe, it, expect, vi, beforeAll } from 'vitest'
import { IPC } from '../src/shared/ipc'

/** Mock the whole electron surface with a Proxy so the main-process import
 *  graph (better-sqlite3, koffi, onnxruntime, electron-updater) loads under
 *  plain node. Dialogs resolve to "cancelled" unless overridden per test. */
vi.mock('electron', () => {
  const ipcMain = {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn()
  }
  const app = {
    getPath: vi.fn(() => '/tmp/cobaltium-test'),
    getVersion: vi.fn(() => '0.0.0-test'),
    getAppPath: vi.fn(() => process.cwd()),
    getLocale: vi.fn(() => 'en-US'),
    isPackaged: false,
    on: vi.fn(),
    quit: vi.fn(),
    relaunch: vi.fn(),
    whenReady: vi.fn(async () => undefined),
    requestSingleInstanceLock: vi.fn(() => true)
  }
  const dialog = {
    showSaveDialog: vi.fn(async () => ({ canceled: true })),
    showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] as string[] }))
  }
  const shell = { openExternal: vi.fn(async () => undefined) }
  const safeStorage = {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString()
  }
  const BrowserWindow = vi.fn()
  const Notification = vi.fn()
  const Tray = vi.fn()
  const Menu = { buildFromTemplate: vi.fn(() => ({})), setApplicationMenu: vi.fn() }
  const nativeImage = { createFromPath: vi.fn(() => ({})) }
  const webUtils = { getPathForFile: vi.fn(() => '') }
  return {
    ipcMain,
    app,
    dialog,
    shell,
    safeStorage,
    BrowserWindow,
    Notification,
    Tray,
    Menu,
    nativeImage,
    webUtils
  }
})

type Handler = (event: unknown, ...args: unknown[]) => unknown

async function handlers(): Promise<Map<string, Handler>> {
  const { registerIpcHandlers } = await import('../src/main/ipc')
  const { ipcMain } = await import('electron')
  registerIpcHandlers()
  const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls as Array<[string, Handler]>
  return new Map(calls)
}

let all: Map<string, Handler>

beforeAll(async () => {
  all = await handlers()
})

function on(channel: string): Handler {
  const handler = all.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return handler
}

describe('ipc input validation', () => {
  it('registers the safety, ipa, stt, data, and reminders channels', () => {
    for (const channel of [
      IPC.safetyReport,
      IPC.langIpa,
      IPC.sttTranscribe,
      IPC.sttStatus,
      IPC.sttProvision,
      IPC.sttRemove,
      IPC.sttCancel,
      IPC.dataExportBackup,
      IPC.dataImportBackup,
      IPC.dataImportChat,
      IPC.translationTranslate,
      IPC.ttsSynthesize
    ]) {
      expect(all.has(channel), channel).toBe(true)
    }
  })

  it('rejects non-string translation requests', async () => {
    await expect(on(IPC.translationTranslate)(null, 42, 'en', 'es')).rejects.toThrow(
      'Invalid translation request'
    )
  })

  it('returns null for empty TTS text', async () => {
    expect(await on(IPC.ttsSynthesize)(null, '   ', 'en')).toBeNull()
    expect(await on(IPC.ttsSynthesize)(null, 42, 'en')).toBeNull()
  })

  it('returns null for non-string language requests', async () => {
    expect(await on(IPC.langRomanize)(null, 42, 'en')).toBeNull()
    expect(await on(IPC.langIpa)(null, 'hello', 42)).toBeNull()
  })

  it('returns null for empty STT payloads without touching the engine', async () => {
    expect(await on(IPC.sttTranscribe)(null, '', 'en')).toBeNull()
    expect(await on(IPC.sttTranscribe)(null, 'aGVsbG8=', 42)).toBeNull()
  })

  it('rejects empty safety reports without opening mail', async () => {
    const { shell } = await import('electron')
    expect(await on(IPC.safetyReport)(null, '', 'body')).toBe(false)
    expect(await on(IPC.safetyReport)(null, 'subject', '   ')).toBe(false)
    expect(await on(IPC.safetyReport)(null, 42, 'body')).toBe(false)
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('opens the mail client for a valid safety report', async () => {
    const { shell } = await import('electron')
    expect(await on(IPC.safetyReport)(null, 'Spam', 'some content')).toBe(true)
    expect(shell.openExternal).toHaveBeenCalledTimes(1)
    const url = String((shell.openExternal as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(url.startsWith('mailto:')).toBe(true)
  })

  it('stt remove/cancel validate their inputs', async () => {
    expect(await on(IPC.sttRemove)(null, 42)).toBe(false)
    expect(await on(IPC.sttCancel)(null)).toBe(false)
  })

  it('cancelled dialogs resolve data actions as not-ok', async () => {
    expect(await on(IPC.dataExportBackup)(null)).toEqual({ ok: false })
    expect(await on(IPC.dataImportBackup)(null)).toEqual({ ok: false })
    expect(await on(IPC.dataImportChat)(null)).toEqual({ ok: false })
  })
})
