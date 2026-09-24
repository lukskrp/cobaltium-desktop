import { app, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import { createMainWindow } from './window'
import { closeDatabase, initDatabase } from './db'
import { registerIpcHandlers } from './ipc'
import { openPath } from './reader'
import { initLanguageEngine } from './lang'
import { initUpdater } from './updater'
import { disposeEspeak, disposeTts } from './tts'
import { disposeStt } from './stt'
import { loadAppSettings } from './db/repositories/settings'
import { checkReminders, disposeReminders, initReminders } from './notify'
import { initTray, setTrayDue } from './tray'

if (process.platform === 'win32') {
  app.setAppUserModelId('org.cobaltium.desktop')
}

function focusMainWindow(): BrowserWindow | null {
  const [window] = BrowserWindow.getAllWindows()
  if (!window) return null
  if (window.isMinimized()) window.restore()
  window.focus()
  return window
}

let rendererLoaded = false
let pendingOpened: unknown = null

function pushOpened(payload: unknown): void {
  const window = focusMainWindow()
  if (window && !window.webContents.isDestroyed()) {
    window.webContents.send(IPC.readerOpened, payload)
  }
}

function openEpubPath(path: string): void {
  try {
    const opened = openPath(path)
    if (!opened) return
    if (rendererLoaded) pushOpened(opened)
    else pendingOpened = opened
  } catch {
    // ignore unreadable files
  }
}

function findEpubArg(argv: string[]): string | null {
  return argv.find((arg) => /\.epub$/i.test(arg)) ?? null
}

// macOS delivers file-open events before and after `ready`.
app.on('open-file', (event, path) => {
  event.preventDefault()
  openEpubPath(path)
})

// Only one instance of Cobaltium should run at a time.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    focusMainWindow()
    const epub = findEpubArg(argv)
    if (epub) openEpubPath(epub)
  })

  app.whenReady().then(async () => {
    initDatabase()
    registerIpcHandlers()
    await initLanguageEngine()
    const window = createMainWindow()
    initTray(window, () => void checkReminders())
    initReminders(window, (due) => setTrayDue(due))
    window.webContents.on('did-finish-load', () => {
      rendererLoaded = true
      if (pendingOpened) {
        pushOpened(pendingOpened)
        pendingOpened = null
      }
    })

    const fromArgs = findEpubArg(process.argv)
    if (fromArgs) openEpubPath(fromArgs)

    initUpdater()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', () => {
    void disposeTts()
    disposeEspeak()
    disposeStt()
    disposeReminders()
    closeDatabase()
  })

  // Security: deny all permission requests by default. Microphone access is
  // granted only when the user explicitly enabled it in Settings → Speech.
  app.on('web-contents-created', (_event, contents) => {
    contents.session.setPermissionRequestHandler((_wc, permission, callback) => {
      if (permission === 'media') {
        try {
          callback(loadAppSettings().micEnabled === true)
        } catch {
          callback(false)
        }
        return
      }
      callback(false)
    })
  })
}
