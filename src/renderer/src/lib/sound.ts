import { useSettingsStore } from '@renderer/features/settings/settings-store'

/**
 * Synthesized two-note "pling" played on a successful save, ported from
 * Android's `PlingPlayer` (A5 -> E6 sine notes with an exponential decay).
 */
let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  return context
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function scheduleTone(
  ctx: AudioContext,
  destination: AudioNode,
  when: number,
  frequency: number,
  duration: number,
  tau: number
): void {
  const sampleRate = ctx.sampleRate
  const length = Math.max(1, Math.floor(duration * sampleRate))
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  const attack = Math.min(200, length)
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate
    let envelope = Math.exp(-time / tau) * 0.7
    if (i < attack) envelope *= i / attack
    data[i] = Math.sin(2 * Math.PI * frequency * time) * envelope
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(destination)
  source.start(when)
}

export function playSaveBleep(volume: number): void {
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const gain = ctx.createGain()
  gain.gain.value = clamp01(volume)
  gain.connect(ctx.destination)
  const start = ctx.currentTime + 0.01
  scheduleTone(ctx, gain, start, 880, 0.11, 0.05)
  scheduleTone(ctx, gain, start + 0.11 + 0.03, 1318.51, 0.22, 0.09)
}

/**
 * Pre-create the shared AudioContext so the first real sound doesn't pay
 * construction cost on the click path. Safe to call repeatedly; call once
 * at startup and again on the first user gesture (autoplay policy).
 */
export function warmupAudio(): void {
  try {
    const ctx = audioContext()
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  } catch {
    // audio is best-effort
  }
}

/** Plays the save bleep at the user's configured volume (0 disables it). */
export function playSaveSound(): void {
  const volume = useSettingsStore.getState().settings.saveVolume
  if (volume <= 0) return
  try {
    playSaveBleep(volume)
  } catch {
    // audio is best-effort
  }
}
