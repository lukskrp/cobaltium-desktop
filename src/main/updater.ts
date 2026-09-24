import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC, type UpdateStatus } from '@shared/ipc'
import {
  INITIAL_UPDATE_STATUS,
  UpdateChannel,
  channelConfig,
  reduceUpdate,
  type UpdateEvent
} from '@shared/domain/update'
import { loadAppSettings } from './db/repositories/settings'

let started = false
let status: UpdateStatus = INITIAL_UPDATE_STATUS

function broadcast(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.webContents.isDestroyed()) window.webContents.send(IPC.updateStatus, status)
  }
}

function apply(event: UpdateEvent): void {
  status = reduceUpdate(status, event)
  broadcast()
}

function applyChannel(channel: string): void {
  const { channel: name, allowPrerelease } = channelConfig(UpdateChannel.fromWire(channel))
  autoUpdater.allowPrerelease = allowPrerelease
  autoUpdater.channel = name ?? 'latest'
}

/**
 * Wires auto-update events to the renderer. Only runs in a packaged build —
 * in development there is no update feed, so this is a no-op.
 */
export function initUpdater(): void {
  if (started || !app.isPackaged) return
  started = true

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  applyChannel(loadAppSettings().updateChannel)

  autoUpdater.on('checking-for-update', () => apply({ type: 'checking' }))
  autoUpdater.on('update-available', (info) => apply({ type: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => apply({ type: 'not-available' }))
  autoUpdater.on('download-progress', (progress) => apply({ type: 'progress', percent: progress.percent }))
  autoUpdater.on('update-downloaded', (info) => apply({ type: 'downloaded', version: info.version }))
  autoUpdater.on('error', (error) => apply({ type: 'error', message: error.message }))

  void autoUpdater.checkForUpdates().catch(() => undefined)
}

/** Manually triggers an update check. Resolves false outside a packaged build. */
export function checkForUpdates(): Promise<boolean> {
  if (!app.isPackaged) return Promise.resolve(false)
  applyChannel(loadAppSettings().updateChannel)
  return autoUpdater
    .checkForUpdates()
    .then(() => true)
    .catch(() => false)
}

/** Quits and installs a downloaded update. */
export function quitAndInstall(): void {
  if (!app.isPackaged) return
  autoUpdater.quitAndInstall()
}
