/** Minimal 16-bit PCM mono WAV encoder (pure). Normalizes the peak to full scale. */
export function encodeWavPcm16(samples: Float32Array, sampleRate: number): Uint8Array {
  const count = samples.length
  let peak = 0.01
  for (let i = 0; i < count; i++) {
    const value = Math.abs(samples[i])
    if (value > peak) peak = value
  }
  const scale = 32767 / peak

  const bytes = new Uint8Array(44 + count * 2)
  const view = new DataView(bytes.buffer)
  const writeAscii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + count * 2, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, count * 2, true)

  for (let i = 0; i < count; i++) {
    const clamped = Math.max(-32768, Math.min(32767, Math.round(samples[i] * scale)))
    view.setInt16(44 + i * 2, clamped, true)
  }
  return bytes
}
