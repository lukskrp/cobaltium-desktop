import { app, Menu, Tray, nativeImage, type BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let tray: Tray | null = null

function iconPath(): string | null {
  const candidate = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'resources', 'icon.png')
  return existsSync(candidate) ? candidate : null
}

function focusWindow(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  if (window.isMinimized()) window.restore()
  window.focus()
}

/** System tray with due-count tooltip (English-only strings, like reminders). */
export function initTray(window: BrowserWindow, checkNow: () => void): void {
  if (tray) return
  const icon = iconPath()
  if (!icon) return
  tray = new Tray(nativeImage.createFromPath(icon))
  tray.setToolTip('Cobaltium')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Cobaltium', click: () => focusWindow(window) },
      { label: 'Check reminders now', click: () => checkNow() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
  tray.on('click', () => focusWindow(window))
}

/** Refresh the tooltip with the current due count. */
export function setTrayDue(due: number): void {
  if (!tray || tray.isDestroyed()) return
  try {
    tray.setToolTip(due > 0 ? `Cobaltium · ${due} card(s) due` : 'Cobaltium')
  } catch {
    // ignore
  }
}
