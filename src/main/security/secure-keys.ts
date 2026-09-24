import { safeStorage } from 'electron'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { secureKeys } from '../db/schema'

const ENC_PREFIX = 'enc:v1:'
const PLAIN_PREFIX = 'plain:'

/**
 * Secure per-vendor API key storage.
 *
 * When Electron's `safeStorage` is available the key is encrypted with the OS
 * keychain (DPAPI on Windows, Keychain on macOS, libsecret on Linux) and only
 * the Base64 ciphertext is persisted. When unavailable (headless Linux without
 * a keyring) we fall back to an obfuscated plaintext record and the UI warns.
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

function assertId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[a-z0-9._-]{1,64}$/i.test(id)) {
    throw new Error('Invalid key id')
  }
}

function encrypt(plaintext: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return ENC_PREFIX + safeStorage.encryptString(plaintext).toString('base64')
  }
  return PLAIN_PREFIX + Buffer.from(plaintext, 'utf8').toString('base64')
}

function decrypt(stored: string): string | null {
  try {
    if (stored.startsWith(ENC_PREFIX)) {
      return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64'))
    }
    if (stored.startsWith(PLAIN_PREFIX)) {
      return Buffer.from(stored.slice(PLAIN_PREFIX.length), 'base64').toString('utf8')
    }
    return null
  } catch {
    return null
  }
}

export function getKey(id: string): string | null {
  assertId(id)
  const row = getDb().select().from(secureKeys).where(eq(secureKeys.id, id)).get()
  return row ? decrypt(row.ciphertext) : null
}

export function hasKey(id: string): boolean {
  assertId(id)
  const row = getDb().select().from(secureKeys).where(eq(secureKeys.id, id)).get()
  return Boolean(row && decrypt(row.ciphertext))
}

export function setKey(id: string, plaintext: string): void {
  assertId(id)
  if (plaintext.trim() === '') {
    clearKey(id)
    return
  }
  const now = Date.now()
  const ciphertext = encrypt(plaintext)
  getDb()
    .insert(secureKeys)
    .values({ id, ciphertext, updatedAt: now })
    .onConflictDoUpdate({ target: secureKeys.id, set: { ciphertext, updatedAt: now } })
    .run()
}

export function clearKey(id: string): void {
  assertId(id)
  getDb().delete(secureKeys).where(eq(secureKeys.id, id)).run()
}

/** Map of key id -> whether a usable key is stored. */
export function listKeyPresence(): Record<string, boolean> {
  const rows = getDb().select().from(secureKeys).all()
  const out: Record<string, boolean> = {}
  for (const row of rows) out[row.id] = decrypt(row.ciphertext) != null
  return out
}
