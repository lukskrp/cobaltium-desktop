import { describe, it, expect } from 'vitest'
import { arrayBufferToBase64, resampleTo16k, STT_SAMPLE_RATE } from '../src/renderer/src/lib/mic'

describe('resampleTo16k', () => {
  it('passes 16 kHz audio through unchanged', () => {
    const samples = new Float32Array([0.1, 0.2, 0.3])
    expect(resampleTo16k(samples, STT_SAMPLE_RATE)).toBe(samples)
  })

  it('downsamples 48 kHz to 16 kHz', () => {
    const samples = new Float32Array(480).fill(0.5)
    const out = resampleTo16k(samples, 48_000)
    expect(out.length).toBe(160)
    expect(out[0]).toBeCloseTo(0.5, 5)
  })

  it('upsamples 8 kHz to 16 kHz', () => {
    const samples = new Float32Array([0, 1])
    const out = resampleTo16k(samples, 8000)
    expect(out.length).toBe(4)
    expect(out[0]).toBeCloseTo(0, 5)
    expect(out[out.length - 1]).toBeCloseTo(1, 5)
  })

  it('returns empty output for empty input', () => {
    expect(resampleTo16k(new Float32Array(0), 44_100).length).toBe(0)
  })
})

describe('arrayBufferToBase64', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255])
    const encoded = arrayBufferToBase64(bytes.buffer)
    const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
    expect([...decoded]).toEqual([...bytes])
  })
})
