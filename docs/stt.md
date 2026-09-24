# Offline speech recognition (whisper.cpp) architecture

Cobaltium transcribes voice-mode speech fully offline with a bundled
`whisper-server` sidecar (MIT):

```
mic ─┬─ MediaRecorder (renderer) ── decode + resample to 16 kHz mono ──┐
     └─ encodeWavPcm16 (`src/shared/tts/wav.ts`) ── base64 over IPC ───┤
                                                                      ▼
                                              whisper-server (localhost:19047)
                                              `/inference` multipart upload
                                              ggml model from userData/stt/
```

- **`src/main/stt/server.ts`** — `whisper-server` lifecycle: resolves the
  binary from `resources/stt/<platform>/` (or `COBALTIUM_WHISPER_BIN`),
  spawns it lazily per model + language (`-m … --language …`), waits until
  it answers HTTP, and kills it on quit. One server at a time; a language or
  model switch respawns it.
- **`src/main/stt/engine.ts`** — `transcribeWav` posts the WAV to
  `/inference`, parses `{text, language}` (falling back to joined segments),
  strips bracketed non-speech markers (`[music]`…), and supports cancel via
  `AbortController` (`stt:cancel`).
- **`src/main/stt/provision.ts`** — downloads ggml weights
  (tiny/base/small) into `userData/stt/` with progress IPC, mirroring
  `tts/provision.ts`. Models are ~75/150/500 MB and are never bundled.
- **`src/main/stt/index.ts`** — `transcribe` / `sttStatus` / `provision` /
  `remove` / `cancel` / `disposeStt`, wired to `stt:*` IPC channels.
- **`src/renderer/src/lib/mic.ts`** — push-to-talk capture: `getUserMedia`
  with echo cancellation → `MediaRecorder` → `AudioContext` decode →
  `OfflineAudioContext` resample to 16 kHz mono → shared WAV encoder.
  Failures surface as typed `MicError`s (`denied` / `no-device` / …) so the
  UI can explain instead of failing silently.
- **`src/renderer/src/features/chat/VoicePanel.tsx`** — port of Android's
  `VoiceInputPanel` + `VoiceLanguageBar`: input/output language selects,
  a big record button (tap to start, tap again to send), transcribing /
  thinking status, and a cancel button while recording.

## Native binary

| Piece | Source | Build | Output |
|---|---|---|---|
| `whisper-server` | whisper.cpp `v1.9.2` (fetched to `vendor/whisper.cpp`) | `pnpm build:whisper` | `resources/stt/<platform>/whisper-server[.exe]` |

`pnpm build:native` builds TTS bridges + whisper-server. The
`tts-native` CI matrix builds all three per OS. Microphone permission is
denied by default and granted only when Settings → Speech → microphone is
enabled (`main/index.ts` permission handler).
