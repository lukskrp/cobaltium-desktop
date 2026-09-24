# Cobaltium Desktop architecture

Electron + React 19 + Tailwind v4. Three processes, one IPC contract.

## Process model

```
main (Node) ── IPC (ipcMain.handle / webContents.send) ── preload (bridge) ── renderer (React)
```

- **main** (`src/main/`): all privileged work — SQLite (better-sqlite3 +
  drizzle), LLM clients, translation tiers, TTS/STT engines, EPUB/scenario
  IO, secure keys, updater, tray + notifications, backup/restore.
- **preload** (`src/preload/`): `contextBridge` exposing the typed
  `CobaltiumApi` only. No logic.
- **renderer** (`src/renderer/src/`): React + react-router + zustand stores.
  Never touches Node/Electron APIs except through `getApi()`.
- **shared** (`src/shared/`): framework-free code bundled into *both* main
  and renderer — the ported language engine (`lang/`, ~12.5K LOC), domain
  models, prompts, EPUB parse/build, TTS helpers, and the `ipc.ts` contract.
  Must stay free of `electron`, `node:*`, and DOM imports.

The contract lives in `src/shared/ipc.ts` (`IPC` channel constants +
`CobaltiumApi`). Handlers in `src/main/ipc.ts`, bridge in
`src/preload/index.ts`.

## Database

better-sqlite3 (WAL mode) at `userData/cobaltium.db`, drizzle-orm access,
migrations in `drizzle/` (code-generated via `pnpm db:generate`).

Tables (schema in `src/main/db/schema.ts`): `threads` (mode, starred, draft,
contextNotes, notesThroughMessageId), `messages` (immersive JSON, cascade),
`saved_words` (unique `(word, lang)`, folder FK), `glossary_cache`,
`saved_folders` (nestable, unique `(parentId, name)`), `saved_phrases`,
`srs_cards` (PK `(deckId, cardId)` — per-deck scheduling), `srs_decks`
(unique name), `srs_deck_cards` (cascade), plus desktop-only `settings`
(generic KV + `app_settings` JSON), `app_meta`, `secure_keys` (ciphertext).

Schema parity with Android Room v11 was verified column-by-column
(see `docs/PARITY.md`): all 9 shared tables match; the 3 extra tables are
desktop-only. `foreign_keys = ON` matches Room's cascade behavior; Room
`Boolean`/`Float` map to drizzle integer-boolean/`real`.

Repositories in `src/main/db/repositories/` are thin sync wrappers;
`patchAppSettings` round-trips through `normalizeAppSettings`, so unknown
persisted keys are dropped and bad values coerced to defaults.

## Chat / LLM

`chat-store.send()` builds the system prompt per mode
(`PromptBuilder.buildSystemPrompt`, plus `buildVoiceSystemPrompt` for voice),
plans the context window (`planContext` with persisted `contextNotes`),
streams via `llm:start` + `llm:event`, sanitizes template markers, saves the
reply, and — in voice mode — speaks it. Chat modes: conversation,
corrective, immersive, reflective, voice. Voice threads render raw text and
never translate (Android parity).

LLM backends are OpenAI-compatible endpoints (`manager.ts` +
`openai-compatible.ts`), including local Ollama / llama.cpp server /
custom (e.g. Tailscale) presets, with `disableThinking` negotiation and a
400-retry. API keys live encrypted in `secure_keys`.

## Translation tiers

`src/main/translation/tiered.ts` dispatches fast → external → LLM, each
time-bounded with fall-through on failure or useless results
(`isUsefulTranslation` rejects empty/source-identical output):

1. **Fast**: user-configured OpenAI-compatible endpoint (e.g. Qwen over
   Tailscale), thinking disabled, short budget. `FastTranslator` slot
   reserved for an in-process NLLB ONNX tier (mirrors Android's design).
2. **External**: DeepL / Google when keyed.
3. **LLM fallback**: structured JSON translation + gloss map, retried once.

`GlossFilter` drops gloss pairs absent from the translation; the UI applies
`filterGlossMap` again at render so pre-filter persisted maps are safe.

## Speech

- **TTS** (`src/main/tts/`): espeak-ng bridge (C, koffi FFI) or ja_bridge
  (Rust, OpenJTalk) → phonemes → Piper VITS ONNX (`onnxruntime-node`) →
  WAV. Voice packs provisioned at runtime to `userData/tts/`
  (`docs/tts.md`).
- **STT** (`src/main/stt/`): bundled `whisper-server` sidecar on
  localhost:19047 (`docs/stt.md`). Renderer records push-to-talk audio,
  resamples to 16 kHz mono, and posts WAV over `stt:transcribe`. ggml
  models provisioned at runtime to `userData/stt/`. Voice mode sends the
  transcript through the normal chat flow.

## SRS

Simplified SM-2 in `src/shared/domain/srs.ts` (`SrsScheduler`,
per-deck state, colored buckets); persistence in `srs.ts` repository.
Due count (`countDueCards`) drives the once-a-day desktop notification +
tray tooltip (`src/main/notify.ts`, `src/main/tray.ts`).

## Settings, keys, backup

`AppSettings` (`src/shared/domain/settings.ts`) with defensive
normalization; 21 UI locales with English fallback (`lib/i18n.ts`);
per-message content direction from the language profile's script.
`secure-keys.ts` encrypts API keys. Full backup = DB snapshot (WAL-safe
`sqlite.backup`) + settings JSON + manifest in a zip (`src/main/data/`),
restored with relaunch; `cobaltium.chat` v1 import creates a fresh thread
(Android cross-device parity).

## Native bridges

| Binary | Source | Build | Ships in |
|---|---|---|---|
| `espeak_bridge` | espeak-ng 1.52.0 + `vendor/espeak-bridge` | `pnpm build:espeak` | `resources/tts/<platform>/` |
| `ja_bridge` | `vendor/ja-bridge` (Rust) | `pnpm build:ja-bridge` | `resources/tts/<platform>/` |
| `whisper-server` (+ ggml DLLs on win) | whisper.cpp v1.9.2 | `pnpm build:whisper` | `resources/stt/<platform>/` |

`pnpm build:native` builds all three. Self-contained flags
(`GGML_OPENMP=OFF`, static CRT on Windows) so shipped binaries run without
a toolchain or redist on user machines. `pnpm smoke:native` verifies the
current platform's artifacts. The CI `tts-native` matrix builds + smokes
all three OSes; release rebuilds in-job via `pnpm build:native`.
`COBALTIUM_ESPEAK_LIB` / `COBALTIUM_JA_LIB` / `COBALTIUM_WHISPER_BIN`
override with prebuilts.

## Known platform limitations

- Main-process notifications and tray strings are English-only (no i18n
  bundle in main); all renderer UI is localized.
- Microphone permission is denied by default and granted only when
  Settings → Speech → microphone is enabled.
- Monetization (credits/Pro/ads) is intentionally absent on desktop.
