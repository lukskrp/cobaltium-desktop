import { describe, expect, it } from 'vitest'
import {
  INITIAL_UPDATE_STATUS,
  UpdateChannel,
  channelConfig,
  reduceUpdate,
  type UpdateStatus
} from '@shared/domain/update'

function run(events: Parameters<typeof reduceUpdate>[1][]): UpdateStatus {
  return events.reduce(reduceUpdate, INITIAL_UPDATE_STATUS)
}

describe('UpdateChannel', () => {
  it('accepts known channels and falls back to stable', () => {
    expect(UpdateChannel.fromWire('beta')).toBe('beta')
    expect(UpdateChannel.fromWire('alpha')).toBe('alpha')
    expect(UpdateChannel.fromWire('stable')).toBe('stable')
    expect(UpdateChannel.fromWire('nightly')).toBe('stable')
    expect(UpdateChannel.fromWire(undefined)).toBe('stable')
  })

  it('maps channels to electron-updater settings', () => {
    expect(channelConfig('stable')).toEqual({ channel: null, allowPrerelease: false })
    expect(channelConfig('beta')).toEqual({ channel: 'beta', allowPrerelease: true })
    expect(channelConfig('alpha')).toEqual({ channel: 'alpha', allowPrerelease: true })
  })
})

describe('update state machine', () => {
  it('starts idle', () => {
    expect(INITIAL_UPDATE_STATUS).toEqual({ state: 'idle' })
  })

  it('walks checking -> available -> downloading -> downloaded', () => {
    const status = run([
      { type: 'checking' },
      { type: 'available', version: '1.2.3' },
      { type: 'progress', percent: 42 },
      { type: 'downloaded', version: '1.2.3' }
    ])
    expect(status).toEqual({ state: 'downloaded', version: '1.2.3' })
  })

  it('keeps the version while downloading and rounds the percent', () => {
    const status = run([
      { type: 'checking' },
      { type: 'available', version: '2.0.0' },
      { type: 'progress', percent: 33.6 }
    ])
    expect(status).toEqual({ state: 'downloading', version: '2.0.0', percent: 34 })
  })

  it('clamps out-of-range progress', () => {
    expect(run([{ type: 'progress', percent: 250 }]).percent).toBe(100)
    expect(run([{ type: 'progress', percent: -10 }]).percent).toBe(0)
    expect(run([{ type: 'progress', percent: Number.NaN }]).percent).toBe(0)
  })

  it('reports no update available', () => {
    expect(run([{ type: 'checking' }, { type: 'not-available' }])).toEqual({ state: 'none' })
  })

  it('captures the error message and drops stale fields', () => {
    const status = run([
      { type: 'available', version: '1.0.0' },
      { type: 'progress', percent: 50 },
      { type: 'error', message: 'network down' }
    ])
    expect(status).toEqual({ state: 'error', message: 'network down' })
  })

  it('is pure (does not mutate the previous status)', () => {
    const before: UpdateStatus = { state: 'available', version: '1.0.0' }
    reduceUpdate(before, { type: 'progress', percent: 10 })
    expect(before).toEqual({ state: 'available', version: '1.0.0' })
  })
})
