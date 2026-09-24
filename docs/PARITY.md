# Cobaltium Desktop ↔ Android feature parity

Living gap matrix. Update a row's status when the gap closes; keep `EDGE_CASES.md`
for the behavioral-bug checklist derived from the same audit.

Baseline: Cobaltium Android v1.2.0 (versionCode 6) vs Cobaltium Desktop v0.2.0.
Audit date: 2026-09-22.

## Locked product decisions

| Decision | Choice |
| --- | --- |
| Fast translation tier | No Laya. Tiered dispatcher: fast neural (Tailscale Qwen preset) → DeepL/Google → LLM. Optional NLLB-200 ONNX as in-process fast tier (slot mirrors Android's `FastTranslator`). |
| Local LLM | External servers only (Ollama / llama.cpp server / remote OpenAI-compatible). No bundled GGUF. |
| Monetization | Skipped entirely on desktop (no credits, no Pro gate, no ads). |
| STT / voice mode | whisper.cpp binding (provisioned at runtime, not bundled). |
| Edge cases | Derived from code audit — tracked in `docs/EDGE_CASES.md`. |

## Deliberate non-goals (reconciled platform differences)

These Android behaviors are not replicated because the platform does not apply.
Do not treat them as gaps.

- Play Billing, AdMob, UMP consent, Play in-app review
- Play Asset Delivery (desktop uses runtime provisioning — `src/main/tts/provision.ts`)
- Room migration history (desktop schema was created at Android's v11 shape)
- Foreground service / Android audio-focus stack (desktop uses the Electron media pipeline)
- Bundled GGUF model (external servers only, see above)

## Gap matrix

Status: ✅ parity · ⬜ gap · ▶ planned phase.

| # | Feature | Android reference | Desktop status | Phase |
| --- | --- | --- | --- | --- |
| G1 | Fast translation tier (ML Kit role) | `translation/TranslationEngine.kt` (`FastTranslator`, `TieredTranslator`), comment: "NLLB ONNX lands here" | ✅ done 2026-09-22 — `TieredTranslator` ported in `src/main/translation/tiered.ts` (fast → DeepL/Google → LLM, timeout-bounded) with `FastTranslator` slot; fast endpoint configured via new settings fields + Settings UI. Optional NLLB-200 ONNX implementation of the slot remains future work | 1 |
| G2 | STT / VOICE chat mode | `service/SherpaOnnxService.kt`, `voice/WhisperSpeechRecognizer.kt`, `ui/chat/VoicePanel.kt` | ✅ done 2026-09-23 — whisper.cpp sidecar (`src/main/stt/`: provision/engine/server, `stt:*` IPC) + push-to-talk `VoicePanel` + `voice` chat mode (voice prompt, spoken replies, raw-text threads). See `docs/stt.md` | 2 |
| G3 | Monetization (CreditGate / Pro / ads) | `data/moneti/*`, `domain/moneti/CreditGate.kt` | ⬜ skipped by decision | — |
| G4 | Export / import / backup | `data/export/ExportShare.kt`, `data/export/ChatImporter.kt` | ✅ done 2026-09-23 — full-backup zip (DB snapshot + settings + manifest) with relaunch restore, plus `cobaltium.chat` v1 import as a fresh thread (Android cross-device parity); Settings → Backup section | 4 |
| G5 | SRS due notifications / tray | FGS notifications | ✅ done 2026-09-23 — once-a-day due-card `Notification` (click opens SRS) + tray icon with due-count tooltip/menu; `remindersEnabled` setting (Play billing/review have no desktop equivalent and stay out by decision) | 4 |
| G6 | Safety report sender | `safety/ReportSender.kt` (mailto) + `ui/components/ReportConfirmDialog.kt` | ✅ done 2026-09-23 — shared `report.ts` (body builder + mailto), `safety:report` IPC → `shell.openExternal`, AppShell-level `ReportDialog` + per-surface transcripts (chat/lexicon/reader) | 3 |
| G7 | Local LLM out-of-box | Bundled GGUF (llama.cpp JNI) | ⬜ external servers only by decision | — |
| G8 | espeak IPA transcriber | `lang/ipa/EspeakIpaTranscriber.kt` | ✅ done 2026-09-23 — `main/lang/ipa.ts` transcribes via the engine the profile names (`espeak` voice mapping ported to shared `lang/ipa.ts`, `openjtalk` via existing `phonemizeJapanese`); exposed as `lang:ipa` IPC (engine-level parity; Android surfaces no IPA UI either) | 3 |
| G9 | Hebrew proclitics UI | `ui/components/HebrewProclitics.kt` (+ test) | ✅ done 2026-09-23 — ported to shared `lang/hebrew.ts` (`stripProclitics`/`lookupGloss`); wired into chat gloss lookups with per-face language; Android test cases ported to `tests/lang/hebrew.test.ts` | 3 |
| G10 | Interlinear gloss under the word | Android fix request (`ImmersiveCard.kt` GlossableText) | ✅ done 2026-09-23 — `GlossableText.tsx` renders word on top, gloss underneath (flex-column token) | 3 |
| G11 | GlossFilter (drop glosses not in translation) | `TranslationEngine.kt` `GlossFilter` | ✅ done 2026-09-22 — ported as `GlossFilter` in `src/main/translation/tiered.ts`, applied in fast + LLM tiers, `tests/translation/gloss-filter.test.ts` | 1 |
| G12 | Fast-result rejection (`isUsefulTranslation`) | `TranslationEngine.kt` | ✅ done 2026-09-22 — ported as `isUsefulTranslation` in `src/main/translation/tiered.ts`; time-bounded fast tier with fall-through, `tests/translation/tiered.test.ts` | 1 |
| G13 | Content-direction RTL per message | `ui/TextDirection.kt` | ✅ done 2026-09-23 — `contentDir(lang)` in `src/shared/domain/text-direction.ts` (profile script → direction); applied to `GlossableText`, message bubbles, immersive faces, reader content + popovers, glossary popup | 3 |
| G14 | Korean tokenizer in gloss path | `lang/tokenizer/KoreanTokenizer.kt` | ✅ done 2026-09-23 — `KoreanTokenizer` now uses `Intl.Segmenter('ko')` via generalized `createSegmenterTokenizer(locale)`; `ko` routed in `GlossableText` and reader `tokenize` | 3 |
| G15 | mac/linux prebuilt TTS bridges | n/a | ✅ done 2026-09-23 — `pnpm smoke:native` verifies the current platform's TTS + whisper artifacts (existence + server launch); wired into the CI native matrix; release rebuilds via `pnpm build:native`. Self-contained flags (`GGML_OPENMP=OFF`, static CRT) so shipped binaries need no redist. | 4 |

## Already at parity (verified 2026-09-22)

Chat with 4 text modes (conversation / corrective / immersive / reflective) ·
LLM via OpenAI-compatible endpoints incl. Ollama and llama.cpp server, with
`disableThinking` + retry (`src/main/llm/openai-compatible.ts:31-110`) ·
prompt builder · context-window planner using `contextNotes` /
`notesThroughMessageId` · auto title generation · markdown rendering ·
SRS with per-deck scheduling (Android v11 shape) · lexicon (words, phrases,
folders incl. nesting) · reader (EPUB parse + build, chapter gloss, edit
drafts) · 17 bundled inflectors · romanizers / transliterators · script
detection · tokenizers · scenarios (252 JSON) · dictionary (LLM tier) ·
TTS (espeak-ng bridge + Piper runtime provisioner + ja bridge) · translation
(DeepL / Google / LLM — but see G1) · content safety filter · settings,
themes, 21 UI locales + RTL · onboarding + guided tour · self-updater ·
secure key storage.

### Database schema

All 9 Room entities are reproduced at entity level in `src/main/db/schema.ts`
(`threads.mode/starred/draft/contextNotes/notesThroughMessageId`,
`saved_words (word, lang)` unique + `folderId`, `saved_phrases.translation`,
nested `saved_folders`, `srs_cards` keyed `(deckId, cardId)`, plus desktop-only
`settings`, `app_meta`, `secure_keys`). Two drizzle migrations vs Room v11 is
cosmetic: the desktop schema was born at v11 shape (fresh installs only).

E16 audit 2026-09-23 (Room `Entities.kt` vs `schema.ts`, column by column):
all 9 shared tables match exactly — same table/column names, same PKs
(`threads.id`, `messages.id` + `threadId` index, `saved_words` unique
`(word, lang)` + `folderId` index, `glossary_cache` `(word, lang)` index,
`saved_folders` unique `(parentId, name)` + `parentId` index,
`srs_cards`/`srs_deck_cards` composite PKs + `cardId` indexes,
`srs_decks` unique name), same nullability/defaults, cascade deletes on
`messages.threadId` and `srs_deck_cards.deckId`, `PRAGMA foreign_keys = ON`
matching Room enforcement, Room `Boolean`/`Float` ↔ drizzle
integer-boolean/`real`. Only additions are the 3 desktop-only tables.

## Phase plan

| Phase | Focus | Size |
| --- | --- | --- |
| 0 | This doc + `EDGE_CASES.md` + green baseline | 0.5 d |
| 1 | Fast translation tier (`TieredTranslator`, G1/G11/G12), Tailscale Qwen preset, optional NLLB ONNX | 4–6 d |
| 3a–d | Gloss under word, GlossFilter verify, content RTL, ko tokenizer | 2–3 d |
| 2 | whisper.cpp STT + VOICE mode (G2) | 5–8 d |
| 3e–g | Report sender, espeak IPA, Hebrew proclitics | 2–3 d |
| 4 | Export/import, notifications/tray, mac/linux TTS, architecture doc (G4/G5/G15) | 4–6 d |
| 5 | Test hardening + side-by-side parity gate | 3–4 d |

**Parity gate:** every ⬜ row ✅ or explicitly deferred, plus
`pnpm typecheck && pnpm lint && pnpm test && pnpm build` and 3-OS CI green.

## Phase 5 gate (2026-09-23)

Test hardening: `tests/ipc.test.ts` drives every new IPC channel through
the real `registerIpcHandlers` with a mocked electron surface (validation
paths, mailto composition, cancelled dialogs); `resolveFastConfig` cases
in `tiered.test.ts` (including a blank-URL fix they surfaced);
`parseTranscript` extracted to shared with unit tests; WAV encoder,
mic resample/base64, reminders policy, STT catalog, and chat-import
round-trip cases covered. Suite: 51 files / 381 tests, all green, plus
`pnpm build` (main + preload + renderer bundles).

Side-by-side surface walk (Android ↔ Desktop):

- **Lexicon**: conjugate/decline, speak, folders, LangDex lookup at parity.
  Gap found → fixed: Android's language filter dropdown had no desktop
  equivalent; added (`lexicon.filterLanguage`, folder + language combine).
- **Chat**: 5 modes, composer, tool rail, session sidebar, per-message
  copy/save/speak, immersive cards, voice panel at parity.
- **SRS**: decks, per-deck SM-2, buckets (naming differs cosmetically),
  due reminders at parity.
- **Reader**: EPUB parse/build, chapter gloss, edit drafts, word popover
  with gloss/speak/save at parity (pager-swipe lock is mobile-only).
- **Scenarios**: identical content — 21 `fi-*` pairs × 12 files on both.
- **Tour**: Android anchors ~55 granular steps (per-mode, per-LLM-field);
  Desktop covers all 5 surfaces + model + done in 10 page-level steps.
  Accepted platform difference (drawer-anchored vs page-level UI).

Gate status: all G-rows ✅ except G3/G7 (explicit decisions, not gaps).
Remaining deliberate non-goals: monetization, Play services, bundled GGUF,
FGS/audio-focus, Room migration history, NLLB ONNX slot (interface ships,
model does not). 3-OS CI green to be confirmed on push (matrix + release
jobs updated for `build:native` and `smoke:native`).
