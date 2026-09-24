import { describe, it, expect } from 'vitest'
import {
  BACKUP_DB_NAME,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  parseBackupManifest
} from '../src/shared/domain/backup'

describe('parseBackupManifest', () => {
  it('accepts a well-formed manifest', () => {
    const manifest = parseBackupManifest({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: 123,
      appVersion: '0.2.0',
      files: [BACKUP_DB_NAME, 'settings.json']
    })
    expect(manifest).not.toBeNull()
    expect(manifest?.files).toContain(BACKUP_DB_NAME)
  })

  it('rejects wrong formats, newer versions, and missing db entries', () => {
    expect(parseBackupManifest({ format: 'other', version: 1, files: [BACKUP_DB_NAME] })).toBeNull()
    expect(
      parseBackupManifest({ format: BACKUP_FORMAT, version: 99, files: [BACKUP_DB_NAME] })
    ).toBeNull()
    expect(
      parseBackupManifest({ format: BACKUP_FORMAT, version: 1, files: ['settings.json'] })
    ).toBeNull()
    expect(parseBackupManifest(null)).toBeNull()
    expect(parseBackupManifest('nope')).toBeNull()
  })
})
