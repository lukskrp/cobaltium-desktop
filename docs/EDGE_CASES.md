# Desktop edge cases (derived from Android ↔ Desktop audit)

Behavioral bugs and polish items found by comparing the two codebases on
2026-09-22. Cross-reference: `docs/PARITY.md` gap numbers.

Check items off as they land; add new findings at the bottom of the relevant
section. Each item should get a regression test where the fix lives in
`src/shared/` (unit-testable) or a manual-check note for renderer work.

## Glossing & translation

- [x] **E1 — Gloss must render under the word (G10).** Done 2026-09-23 — see Done section.
- [x] **E2 — GlossFilter missing (G11).** Done 2026-09-22 — see Done section.
- [x] **E3 — Fast-result rejection (G12).** Done 2026-09-22 — see Done section.
- [x] **E4 — Korean gloss tokenization (G14).** Done 2026-09-23 — see Done section.

## Text direction & scripts

- [x] **E5 — Per-message content RTL (G13).** Done 2026-09-23 — see Done section.
- [x] **E6 — Hebrew proclitics (G9).** Done 2026-09-23 — see Done section.

## TTS / STT / audio

- [x] **E7 — espeak IPA parity (G8).** Done 2026-09-23 — see Done section.
- [ ] **E8 — mac/linux TTS from source builds (G15).** Only
      `resources/tts/win32-x64/` DLLs are committed. CI builds the rest —
      attach them as release artifacts so tarball installs speak without a
      local toolchain.
- [ ] **E9 — Piper catalog drift.** Verify Desktop's `shared/tts/catalog.ts`
      matches Android's `VOICE_BY_CODE` / bundled assets (Android audit found
      orphan `.onnx.json` entries without `.onnx` for de/fr/pt — confirm
      Desktop does not replicate dead entries; every catalog row must be
      downloadable via `provision.ts`).

## Chat & threads

- [ ] **E10 — Empty-thread cleanup vs drafts.** Desktop deletes threads with
      `draft = ''` and no messages at startup (`db/repositories/threads.ts:25-39`)
      and also clears `draft` on any empty thread. Android preserves drafts
      (migration 4→5 added `threads.draft` so drafts survive). Confirm
      intent: a draft-only thread must never be swept. Add a regression test.
- [x] **E11 — Voice mode absent (G2).** Done 2026-09-23 — see Done section.
- [x] **E12 — Mode list icons.** Done 2026-09-23 — `ChatHeader` MODES now
      covers all five modes; voice uses a lucide Mic icon (no PNG asset).

## Safety & platform

- [x] **E13 — Report sender (G6).** Done 2026-09-23 — see Done section.
- [x] **E14 — Microphone permission is globally denied.** Done 2026-09-23 —
      see Done section.

## Data

- [x] **E15 — No export/import (G4).** Done 2026-09-23 — see Done section.
- [x] **E16 — Migration-depth audit.** Done 2026-09-23 — see PARITY.md DB section.

## Done

- **E2 — GlossFilter ported (G11).** Done 2026-09-22. `GlossFilter` in
  `src/main/translation/tiered.ts` drops gloss pairs whose native key does
  not occur in the translation; applied to both the fast tier and the LLM
  tier in `translateText`. Tests: `tests/translation/gloss-filter.test.ts`.
  - Verified at UI 2026-09-23: `GlossFilter`/`isUsefulTranslation` moved to
    `src/shared/domain/translation.ts`; new `filterGlossMap` applied at
    render in `MessageBubble` and `ImmersiveCard` so pre-Phase-1 persisted
    maps are filtered too.
- **E3 — Fast-result rejection (G12).** Done 2026-09-22.
  `isUsefulTranslation` in `src/main/translation/tiered.ts` rejects empty
  or source-identical results and falls through to the next tier
  (fast → DeepL/Google → LLM). Timeout-bounded fast tier
  (`fastTranslateTimeoutMs`, default 10 s). Tests:
  `tests/translation/tiered.test.ts`.
- **E1 — Gloss under the word (G10).** Done 2026-09-23.
  `GlossableText.tsx` now renders each token as a flex-column: word on top,
  revealed gloss underneath (interlinear), matching the Android flip.
  Popups (`WordGlossaryPopup`, reader popover) were already word-on-top.
- **E4 — Korean gloss tokenization (G14).** Done 2026-09-23.
  `createSegmenterTokenizer(locale)` generalizes the `Intl.Segmenter`
  path; `KoreanTokenizer` uses `Intl.Segmenter('ko')` with whitespace
  fallback; `ko` routed in `GlossableText.tokenizeForGloss` and reader
  `tokenize`. Tests: `tests/segmenter.test.ts`.
- **E5 — Per-message content RTL (G13).** Done 2026-09-23.
  `contentDir(lang)` in `src/shared/domain/text-direction.ts` maps the
  language profile's script to ltr/rtl (port of `ui/TextDirection.kt`).
  Applied to `GlossableText`, message bubbles, immersive faces, reader
  content + popover, and the glossary popup — independent of the app `dir`.
  Tests: `tests/text-direction.test.ts`.
- **E11 — Voice mode (G2).** Done 2026-09-23. `'voice'` added to `ChatMode`;
  `VoicePanel` (language bar + push-to-talk) replaces the composer in voice
  mode; transcripts flow through `chat-store.send` with the ported
  `buildVoiceSystemPrompt`, replies are spoken when enabled, and voice
  threads persist with `mode: 'voice'` and never translate. Tests:
  `tests/stt.test.ts` (catalog, lang mapping, voice prompt, settings).
- **E12 — Mode list icons.** Done 2026-09-23. All five modes in
  `ChatHeader`; voice renders a lucide Mic (no PNG needed).
- **E13 — Report sender (G6).** Done 2026-09-23. Shared `report.ts`
  (body builder + length-capped mailto, port of `ReportBody`); `safety:report`
  IPC opens the URL via `shell.openExternal`; AppShell-level `ReportDialog`
  (port of `ReportConfirmDialog`) fed by per-surface transcripts for chat,
  lexicon, and reader (ports of the three `buildReport` builders). Entry
  Flag buttons in `ChatHeader`, `LexiconPage`, and `ReaderPage`. Tests:
  `tests/report.test.ts`.
- **E7 — espeak IPA parity (G8).** Done 2026-09-23. `main/lang/ipa.ts`
  transcribes via the engine the language profile names: `espeak` voice
  mapping ported to shared `lang/ipa.ts` + existing `espeakPhonemize`,
  `openjtalk` via existing `phonemizeJapanese`. Exposed as `lang:ipa` IPC
  (engine-level parity; Android surfaces no IPA UI either). Tests:
  `tests/lang/ipa.test.ts`.
- **E6 — Hebrew proclitics (G9).** Done 2026-09-23. Ported to shared
  `lang/hebrew.ts`; chat gloss lookups (`MessageBubble`, `ImmersiveCard`
  front/back with per-face language) fall back to the stripped stem, so
  tapping "הבית" finds glosses keyed under "בית". All Android test cases
  ported to `tests/lang/hebrew.test.ts`.
- **E15 — Export/import (G4).** Done 2026-09-23. Full-backup zip (WAL-safe
  DB snapshot + settings JSON + manifest) via save dialog; restore
  validates format/version, replaces the live DB, and relaunches;
  `cobaltium.chat` v1 import (port of `ChatImporter`, fresh ids) lands as a
  new thread. Settings → Backup section. Tests: `tests/chat-import.test.ts`
  (all Android cases ported), `tests/backup.test.ts`.
- **E16 — Migration-depth audit.** Done 2026-09-23. Column-by-column Room
  v11 `Entities.kt` vs `schema.ts` diff recorded in PARITY.md: full parity
  on all 9 shared tables, 3 desktop-only additions.
- **E17 — Select-save silently failed on re-save.** Found 2026-09-24 via an
  empty `saved_words` table in the installed app: main `saveWord` upserted
  on `id` (always a fresh UUID) so the `(word, lang)` unique index threw on
  any re-save, and the toolbar's `void saveSelection()` swallowed it while
  the button flashed false success. Fixed: `saveWord` dedups by
  `(word, lang)` (ports Android `SavedWordsRepository.save` — stable id,
  absorbs newer metadata, preserves folder); `saveSelection`/`saveGranular`
  return success, failures surface in `ChatToast` via `saveError`, and the
  toolbar only flashes success after the save lands. Tests:
  `tests/db-save.test.ts` (real DB), `tests/save-selection.test.ts`.
- **E19 — Reflective phrase saves miss the flip direction.** Done
  2026-09-24. Card bookmark saves stored `{phrase: original, lang: learn}`
  with no pair tag and no reverse entry, unlike Android's
  `saveMessageAsPhrase`. Fixed: shared `orientPhrasePair` (source→target
  orientation + helper-first pair tag, no ML Kit needed since both face
  languages are known) and lexicon `addPhrasePair` (forward pair-tagged
  row + flip-direction row so SRS decks quiz either way; single sound).
  `ImmersiveCard.savePhrase` uses both. Tests: `tests/phrase-pair.test.ts`
  + pair cases in `tests/save-selection.test.ts`.
- **E18 — SRS word list goes stale + select-save feels laggy.** Found
  2026-09-24. `srs-store` keeps its own words/phrases copies and only
  loaded once, so chat saves never reached open decks. Fixed: lexicon
  mutations bump a `rev` counter and `SrsPage` reloads on mount + on every
  rev change (zero extra IPC on the save path). Responsiveness: selection
  highlight now clears synchronously on save click (restored with an error
  toast on failure), and `warmupAudio()` pre-creates the AudioContext at
  startup + first gesture so the first bi-biip doesn't jank the click path.
  Tests: rev-bump + optimistic-clear cases in
  `tests/save-selection.test.ts`.
- **E14 — Microphone permission.** Done 2026-09-23. `main/index.ts`
  grants `media` only when Settings → Speech → microphone is enabled;
  denial/no-device surface typed `MicError` messages in `VoicePanel`
  instead of failing silently.
