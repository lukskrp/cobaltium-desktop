# Offline speech (TTS) architecture

Cobaltium synthesizes speech fully offline with two small native bridges plus
`onnxruntime-node`:

```
text ─┬─ espeak_bridge (C, statically links espeak-ng 1.52.0) ── IPA ──┐
      └─ ja_bridge (Rust, jpreprocess/OpenJTalk) ── IPA + prosody ────┤
                                                                     └─ phonemesToIds → Piper VITS ONNX → WAV (22050 Hz)
```

- **`src/main/tts/espeak.ts`** — loads `espeak_bridge`, initialises it with the
  data directory, and phonemizes text with the voice from the voice config
  (`espeak.voice`). espeak-ng owns process-global state but the Electron main
  process is single-threaded and the calls are synchronous, so no locking is
  needed.
- **`src/main/tts/japanese.ts`** — loads `ja_bridge`, extracts OpenJTalk
  full-context labels, and maps them to IPA + prosody symbols (`↑ ↓ # , . ?`).
  The mapping is a port of piper1-gpl's `src/piper/phonemize_japanese.py`.
- **`src/main/tts/engine.ts`** — chooses the phonemizer by the voice config's
  `phoneme_type` (`espeak` or `japanese`), builds the Piper id sequence
  (`src/shared/tts/phonemes.ts` → `phonemesToIds`) and runs the VITS model.
- **`src/main/tts/vits.ts`** — ONNX session + inference. Reads `sample_rate`,
  `inference.{noise_scale,length_scale,noise_w}`, `phoneme_id_map`,
  `espeak.voice`, `num_speakers` and `default_speaker_id` from the voice config;
  the `sid` input is set for multi-speaker voices.

## Native bridges

| Bridge | Source | Build | Output |
| --- | --- | --- | --- |
| `espeak_bridge` | `vendor/espeak-bridge/` (+ espeak-ng source) | `pnpm build:espeak` | `resources/tts/<platform>/espeak_bridge.<dll/so/dylib>` |
| `ja_bridge` | `vendor/ja-bridge/` | `pnpm build:ja-bridge` | `resources/tts/<platform>/ja_bridge.<dll/so/dylib>` |

`pnpm build:tts` builds both. `scripts/build-espeak.mjs` fetches espeak-ng
`1.52.0` into `vendor/espeak-ng/` (git-ignored) on first run; set
`COBALTIUM_ESPEAK_LIB` / `COBALTIUM_JA_LIB` to a prebuilt library to skip the
build. Both bridges are built by the `tts-native` CI job for Linux/Windows/macOS.

The compiled `espeak-ng-data/` (17.5 MB, from espeak-ng 1.52.0) is committed under
`resources/espeak-ng-data/` and shipped alongside the app. The Japanese bridge
embeds the NAIST-JDIC dictionary (~78 MB library).

## Voice packs

`resources`/`src/shared/tts/catalog.ts` lists the Piper voices. Provisioning
(`src/main/tts/provision.ts`) downloads only the voice `.onnx` and `.onnx.json`
into `<userData>/tts/<lang>/`. There is no separate lexicon download: phonemes
come from espeak-ng or the Japanese bridge.

Nineteen languages are covered offline; the voice's `phoneme_type` selects the
phonemizer. Japanese uses the `japanese` type (espeak's Japanese voice has no
kanji coverage and no pitch accent).

## Licensing

espeak-ng is GPLv3 and the Japanese bridge embeds NAIST-JDIC, so the combined
binary is distributed under GPLv3 (Cobaltium's own files remain MIT). See
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Verification

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`, then synthesize through
the app for a single word and a phrase per language. Historically the Finnish
voice mis-segmented with the previous grapheme phonemizer; espeak-ng supplies
stress marks and correct word boundaries, so both single words and phrases now
have natural timing.
