import { describe, it, expect } from 'vitest'
import { encodeWavPcm16 } from '../src/shared/tts/wav'

describe('encodeWavPcm16', () => {
  it('writes a valid 16 kHz mono PCM header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1])
    const wav = encodeWavPcm16(samples, 16_000)
    const view = new DataView(wav.buffer)
    const ascii = (offset: number, length: number): string =>
      String.fromCharCode(...wav.subarray(offset, offset + length))
    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(ascii(12, 4)).toBe('fmt ')
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(16_000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(ascii(36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(samples.length * 2)
    expect(wav.length).toBe(44 + samples.length * 2)
  })

  it('normalizes the peak to full scale', () => {
    const wav = encodeWavPcm16(new Float32Array([0.25, -0.25]), 16_000)
    const view = new DataView(wav.buffer)
    expect(Math.abs(view.getInt16(44, true))).toBe(32767)
    expect(Math.abs(view.getInt16(46, true))).toBe(32767)
  })
})
