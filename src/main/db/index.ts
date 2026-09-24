import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema> | null = null
let sqlite: Database.Database | null = null
let dbPath = ''

function resolveMigrationsFolder(): string {
  const packaged = join(process.resourcesPath, 'drizzle')
  if (app.isPackaged && existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'drizzle')
}

/**
 * Open (or create) the application database and apply pending migrations.
 * Safe to call once, after the `app` `ready` event.
 */
export function initDatabase(): BetterSQLite3Database<typeof schema> {
  if (db) return db

  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  dbPath = join(dir, 'cobaltium.db')

  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: resolveMigrationsFolder() })

  return db
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) throw new Error('Database has not been initialised yet')
  return db
}

export function getDbPath(): string {
  return dbPath
}

export function closeDatabase(): void {
  sqlite?.close()
  sqlite = null
  db = null
}

/** Write a consistent snapshot of the live database (WAL-safe) for backups. */
export async function exportDatabaseSnapshot(destPath: string): Promise<void> {
  if (!sqlite) throw new Error('Database has not been initialised yet')
  await sqlite.backup(destPath)
}

export interface RawDbHealth {
  path: string
  migrations: number
}

export function inspectDatabase(): RawDbHealth {
  if (!sqlite) throw new Error('Database has not been initialised yet')
  const row = sqlite
    .prepare('select count(*) as count from "__drizzle_migrations"')
    .get() as { count: number } | undefined
  return { path: dbPath, migrations: row?.count ?? 0 }
}

export { schema }
