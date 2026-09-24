import { app, dialog } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { strToU8, unzipSync, zipSync } from 'fflate'
import {
  BACKUP_DB_NAME,
  BACKUP_FORMAT,
  BACKUP_MANIFEST_NAME,
  BACKUP_SETTINGS_NAME,
  BACKUP_VERSION,
  parseBackupManifest
} from '@shared/domain/backup'
import { parseChatImport } from '@shared/domain/chat-import'
import { closeDatabase, exportDatabaseSnapshot, getDbPath, initDatabase, inspectDatabase } from '../db'
import { readAllSettings } from '../db/repositories/settings'
import { saveMessage, upsertThread } from '../db/repositories/threads'

function stamp(): string {
  const date = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export interface BackupOutcome {
  ok: boolean
  path?: string
  error?: string
}

export interface ChatImportOutcome {
  ok: boolean
  threadId?: string
  error?: string
}

/** Save-dialog export: DB snapshot + settings JSON + manifest in one zip. */
export async function exportBackup(): Promise<BackupOutcome> {
  const picked = await dialog.showSaveDialog({
    defaultPath: `cobaltium-backup-${stamp()}.zip`,
    filters: [{ name: 'Cobaltium backup', extensions: ['zip'] }]
  })
  if (picked.canceled || !picked.filePath) return { ok: false }
  const work = join(tmpdir(), `cobaltium-backup-${randomUUID()}`)
  try {
    mkdirSync(work, { recursive: true })
    const snapshot = join(work, BACKUP_DB_NAME)
    await exportDatabaseSnapshot(snapshot)
    const archive = zipSync({
      [BACKUP_DB_NAME]: readFileSync(snapshot),
      [BACKUP_SETTINGS_NAME]: strToU8(JSON.stringify(readAllSettings(), null, 2)),
      [BACKUP_MANIFEST_NAME]: strToU8(
        JSON.stringify(
          {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exportedAt: Date.now(),
            appVersion: app.getVersion(),
            files: [BACKUP_DB_NAME, BACKUP_SETTINGS_NAME]
          },
          null,
          2
        )
      )
    })
    writeFileSync(picked.filePath, archive)
    return { ok: true, path: picked.filePath }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

/**
 * Restore a backup zip, replacing the live database. The app relaunches on
 * success so every in-memory state (renderer stores included) is rebuilt
 * from the restored data.
 */
export async function importBackup(): Promise<BackupOutcome> {
  const picked = await dialog.showOpenDialog({
    filters: [{ name: 'Cobaltium backup', extensions: ['zip'] }],
    properties: ['openFile']
  })
  if (picked.canceled || picked.filePaths.length === 0) return { ok: false }
  const source = picked.filePaths[0]
  try {
    const entries = unzipSync(readFileSync(source))
    const manifestRaw = entries[BACKUP_MANIFEST_NAME]
    if (!manifestRaw) return { ok: false, error: 'Not a Cobaltium backup (missing manifest)' }
    const manifest = parseBackupManifest(JSON.parse(Buffer.from(manifestRaw).toString('utf8')))
    if (!manifest) return { ok: false, error: 'Unsupported backup format or version' }
    const dbBytes = entries[BACKUP_DB_NAME]
    if (!dbBytes) return { ok: false, error: 'Backup is missing the database file' }

    const target = getDbPath()
    const work = join(tmpdir(), `cobaltium-restore-${randomUUID()}`)
    mkdirSync(work, { recursive: true })
    const staged = join(work, BACKUP_DB_NAME)
    writeFileSync(staged, dbBytes)

    closeDatabase()
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${target}${suffix}`, { force: true })
    copyFileSync(staged, target)
    rmSync(work, { recursive: true, force: true })
    initDatabase()
    inspectDatabase()

    setTimeout(() => {
      app.relaunch()
      app.quit()
    }, 800)
    return { ok: true }
  } catch (error) {
    try {
      initDatabase()
    } catch {
      // leave the error below; the app stays on the pre-restore database
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Import a `cobaltium.chat` v1 JSON export as a new thread (fresh ids). */
export async function importChat(): Promise<ChatImportOutcome> {
  const picked = await dialog.showOpenDialog({
    filters: [{ name: 'Cobaltium chat export', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (picked.canceled || picked.filePaths.length === 0) return { ok: false }
  const source = picked.filePaths[0]
  try {
    if (!existsSync(source)) return { ok: false, error: `File not found: ${basename(source)}` }
    const parsed = parseChatImport(
      readFileSync(source, 'utf8'),
      () => randomUUID(),
      () => Date.now()
    )
    if (!parsed.ok) return { ok: false, error: `Import rejected: ${parsed.reason}` }
    upsertThread(parsed.thread)
    for (const message of parsed.messages) saveMessage(message)
    return { ok: true, threadId: parsed.thread.id }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
