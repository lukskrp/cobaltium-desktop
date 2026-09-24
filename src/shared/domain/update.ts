/**
 * Pure auto-update domain: the channel mapping and the event -> status state
 * machine. Kept free of Electron so it can be unit-tested and reused anywhere.
 */

export const UPDATE_CHANNELS = ['stable', 'beta', 'alpha'] as const
export type UpdateChannel = (typeof UPDATE_CHANNELS)[number]

export const UpdateChannel = {
  fromWire: (value: unknown): UpdateChannel =>
    typeof value === 'string' && (UPDATE_CHANNELS as readonly string[]).includes(value)
      ? (value as UpdateChannel)
      : 'stable'
} as const

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'none'
  | 'error'

export interface UpdateStatus {
  state: UpdateState
  version?: string
  percent?: number
  message?: string
}

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export const INITIAL_UPDATE_STATUS: UpdateStatus = { state: 'idle' }

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Advances the update status for a single event (pure; returns a new object). */
export function reduceUpdate(current: UpdateStatus, event: UpdateEvent): UpdateStatus {
  switch (event.type) {
    case 'checking':
      return { state: 'checking' }
    case 'available':
      return { state: 'available', version: event.version }
    case 'not-available':
      return { state: 'none' }
    case 'progress':
      return { state: 'downloading', version: current.version, percent: clampPercent(event.percent) }
    case 'downloaded':
      return { state: 'downloaded', version: event.version }
    case 'error':
      return { state: 'error', message: event.message }
  }
}

export interface UpdateChannelConfig {
  /** electron-updater channel name, or null to use the default `latest`. */
  channel: string | null
  allowPrerelease: boolean
}

/** Maps a UI channel to electron-updater's channel + prerelease settings. */
export function channelConfig(channel: UpdateChannel): UpdateChannelConfig {
  switch (channel) {
    case 'beta':
      return { channel: 'beta', allowPrerelease: true }
    case 'alpha':
      return { channel: 'alpha', allowPrerelease: true }
    default:
      return { channel: null, allowPrerelease: false }
  }
}
