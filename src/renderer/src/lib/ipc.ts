import type { CobaltiumApi } from '@shared/ipc'

/**
 * Returns the preload bridge when running inside Electron, or `null` when the
 * renderer is opened in a plain browser (useful for component development).
 */
export function getApi(): CobaltiumApi | null {
  if (typeof window === 'undefined') return null
  return window.cobaltium ?? null
}
