import { eq } from 'drizzle-orm'
import { normalizeAppSettings, type AppSettings } from '@shared/domain/settings'
import { getDb } from '../index'
import { settings } from '../schema'
import type { SettingValue } from '@shared/ipc'

const APP_SETTINGS_KEY = 'app_settings'

export function loadAppSettings(): AppSettings {
  const row = getDb().select().from(settings).where(eq(settings.key, APP_SETTINGS_KEY)).get()
  if (!row) return normalizeAppSettings({})
  try {
    return normalizeAppSettings(JSON.parse(row.value))
  } catch {
    return normalizeAppSettings({})
  }
}

export function saveAppSettings(next: AppSettings): AppSettings {
  const normalized = normalizeAppSettings(next)
  getDb()
    .insert(settings)
    .values({ key: APP_SETTINGS_KEY, value: JSON.stringify(normalized), updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(normalized), updatedAt: Date.now() }
    })
    .run()
  return normalized
}

export function patchAppSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadAppSettings()
  return saveAppSettings({ ...current, ...patch })
}

/** Generic settings read/write used by the Phase 1 theme plumbing. */
export function readSetting(key: string): SettingValue | null {
  const row = getDb().select().from(settings).where(eq(settings.key, key)).get()
  if (!row) return null
  try {
    return JSON.parse(row.value) as SettingValue
  } catch {
    return row.value
  }
}

export function writeSetting(key: string, value: SettingValue): void {
  const serialised = JSON.stringify(value)
  getDb()
    .insert(settings)
    .values({ key, value: serialised, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: serialised, updatedAt: Date.now() }
    })
    .run()
}

export function readAllSettings(): Record<string, SettingValue> {
  const rows = getDb().select().from(settings).all()
  const out: Record<string, SettingValue> = {}
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value) as SettingValue
    } catch {
      out[row.key] = row.value
    }
  }
  return out
}
