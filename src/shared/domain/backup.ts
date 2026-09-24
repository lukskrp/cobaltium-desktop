/** Full-backup (`cobaltium.backup` v1) manifest validation. Pure. */

export const BACKUP_FORMAT = 'cobaltium.backup'
export const BACKUP_VERSION = 1
export const BACKUP_DB_NAME = 'cobaltium.db'
export const BACKUP_SETTINGS_NAME = 'settings.json'
export const BACKUP_MANIFEST_NAME = 'manifest.json'

export interface BackupManifest {
  format: string
  version: number
  exportedAt: number
  appVersion: string
  files: string[]
}

/** Validate a parsed manifest; null when it is not a supported backup. */
export function parseBackupManifest(raw: unknown): BackupManifest | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const doc = raw as Record<string, unknown>
  if (doc.format !== BACKUP_FORMAT) return null
  if (typeof doc.version !== 'number' || doc.version > BACKUP_VERSION) return null
  if (!Array.isArray(doc.files) || !doc.files.includes(BACKUP_DB_NAME)) return null
  return {
    format: BACKUP_FORMAT,
    version: doc.version,
    exportedAt: typeof doc.exportedAt === 'number' ? doc.exportedAt : 0,
    appVersion: typeof doc.appVersion === 'string' ? doc.appVersion : '',
    files: doc.files.filter((file): file is string => typeof file === 'string')
  }
}
