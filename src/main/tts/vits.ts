import { readFileSync } from 'node:fs'
import * as ort from 'onnxruntime-node'
import type { PhonemeIdMap } from '@shared/tts/phonemes'

/** Parsed Piper `.onnx.json` voice config. */
export interface VitsConfig {
  sampleRate: number
  phonemeIdMap: PhonemeIdMap
  noiseScale: number
  lengthScale: number
  noiseW: number
  /** espeak-ng voice name (e.g. "fi", "en-us", "cmn"). */
  espeakVoice: string
  /** Piper phoneme type: "espeak" (default), "japanese", "text", … */
  phonemeType: string
  numSpeakers: number
  defaultSpeakerId: number
}

export function parseVitsConfig(jsonText: string): VitsConfig {
  const json = JSON.parse(jsonText) as {
    audio?: { sample_rate?: number }
    espeak?: { voice?: string }
    phoneme_type?: string
    num_speakers?: number
    default_speaker_id?: number
    inference?: { noise_scale?: number; length_scale?: number; noise_w?: number }
    phoneme_id_map?: PhonemeIdMap
  }
  return {
    sampleRate: json.audio?.sample_rate ?? 22050,
    phonemeIdMap: json.phoneme_id_map ?? {},
    noiseScale: json.inference?.noise_scale ?? 0.667,
    lengthScale: json.inference?.length_scale ?? 1,
    noiseW: json.inference?.noise_w ?? 0.8,
    espeakVoice: json.espeak?.voice ?? 'en-us',
    phonemeType: json.phoneme_type ?? 'espeak',
    numSpeakers: json.num_speakers ?? 1,
    defaultSpeakerId: json.default_speaker_id ?? 0
  }
}

/** VITS inference via onnxruntime-node (port of the Android PiperSynthesizer). */
export class VitsSynthesizer {
  private constructor(
    private readonly session: ort.InferenceSession,
    readonly config: VitsConfig,
    private readonly inputNames: Set<string>
  ) {}

  static async load(onnxPath: string, configPath: string): Promise<VitsSynthesizer> {
    const config = parseVitsConfig(readFileSync(configPath, 'utf8'))
    const session = await ort.InferenceSession.create(onnxPath)
    return new VitsSynthesizer(session, config, new Set(session.inputNames))
  }

  /** Synthesize float PCM samples from a phoneme-id sequence. */
  async synthesizeIds(ids: number[], speakerId = this.config.defaultSpeakerId): Promise<Float32Array> {
    const input = new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length])
    const lengths = new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1])
    const scales = new ort.Tensor(
      'float32',
      Float32Array.from([
        Math.min(this.config.noiseScale, 0.333),
        this.config.lengthScale,
        Math.min(this.config.noiseW, 0.4)
      ]),
      [3]
    )
    const feeds: Record<string, ort.Tensor> = {
      input,
      input_lengths: lengths,
      scales
    }
    if (this.inputNames.has('sid')) {
      feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(speakerId)]), [1])
    }
    const results = (await this.session.run(feeds)) as Record<string, ort.Tensor>
    const output = results.output ?? Object.values(results)[0]
    return output.data as Float32Array
  }

  async close(): Promise<void> {
    await this.session.release()
  }
}
