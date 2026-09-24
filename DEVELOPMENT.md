# Cobaltium Desktop

Cross-platform desktop edition of Cobaltium — a language-learning workspace with
chat, a personal lexicon, spaced-repetition review, an interlinear EPUB reader,
and scenario practice.

Built with **Electron + React + TypeScript + Tailwind**, with all AI features
routed through user-configured providers (local or cloud). No bundled models, no
telemetry, fully open source.

## Requirements

- Node.js 22+ (tested on 24)
- pnpm 11+ (`corepack enable pnpm`)
- Git, CMake, the Rust toolchain and the MSVC C++ build tools — only needed to
  build the offline speech bridges (`pnpm build:tts`)

## Getting started

On Windows, a helper script checks the prerequisites (and can install missing
ones with `winget`), installs the JavaScript dependencies and builds the native
TTS bridges:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1 -InstallDeps
```

Or manually:

```bash
pnpm install
pnpm build:tts   # native TTS bridges (espeak-ng + Japanese)
pnpm dev
```

`pnpm dev` launches the Electron app with hot reload for the renderer. The app
runs without the native bridges, but offline speech is unavailable (it falls back
to OS voices) until `pnpm build:tts` succeeds.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Run the app in development |
| `pnpm build` | Typecheck and build for production (`out/`) |
| `pnpm build:tts` | Build the native TTS bridges (espeak-ng + Japanese) |
| `pnpm typecheck` | Typecheck main/preload and renderer |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm db:generate` | Generate SQLite migrations from `src/main/db/schema.ts` |
| `pnpm pack:dir` | Build an unpacked app directory |
| `pnpm dist:win` / `dist:mac` / `dist:linux` | Build installers |

## Architecture

```
src/
  main/      Electron main process — windows, IPC, SQLite (Drizzle), secure key storage
  preload/   Context-isolated bridge exposing the typed `window.cobaltium` API
  renderer/  React UI (features, components, theming)
  shared/    IPC contract shared by all three targets
```

Security defaults: `contextIsolation` on, `sandbox` on, `nodeIntegration` off,
all permission requests denied by default, external links opened in the OS
browser.

## Status

Phase 1 complete: Electron/Vite/React/Tailwind scaffold, hardened IPC bridge,
SQLite + Drizzle migration pipeline, theme system, and the application shell.

Phase 2 complete: the shared domain core (prompts, enums, context-window
planner, LLM JSON parser, title generator, content-safety filter), the full
Room-v11-equivalent database schema with repositories, secure API-key storage
via Electron `safeStorage`, and an OpenAI-compatible streaming provider layer.

Phase 3 complete: the chat workspace — session sidebar, streaming message list
with sanitized Markdown, the four chat modes (conversation, corrective,
immersive, reflective), debounced drafts, auto session titles, sliding-window
context folding, and an LLM-backed translation tier powering the immersive flip
cards. A functional Settings page configures the provider, key, model and
languages.

Phase 4 complete: the ported language engine (`src/shared/lang`) — script
detection, grapheme splitting, tokenizers, 10 romanization schemes (ISO 9,
ELOT 743, Hepburn, Revised Romanization, IAST, DIN 31635, UniPers, Urdu, ALA-LC,
Pinyin), 8 script-to-script transliterators, the profile registry, and the
LangDex inflection framework with per-language specs. The Lexicon is wired with
saved words, folders and phrases, romanization, morphological analysis,
inflection tables and dictionary lookup.

Phase 4b complete: all 17 bundled rule-based inflection engines are ported to
TypeScript (Spanish, French, German, Italian, Russian, Polish, Turkish, Arabic,
Persian, Hindi, Korean, Chinese, Dutch, Danish, Swedish, Indonesian, Finnish),
with their Android tests ported to Vitest. `TieredInflectionEngine` serves these
offline first and only falls back to the LLM for unsupported languages.

Phase 5 complete: spaced repetition — the SM-2-style scheduler and deck bucketing
(ported + tested), deck/membership/state persistence and IPC, and a review UI
with decks, due cards, grading, deck contents and an add-saved-items panel.

Phase 6 complete: the EPUB reader — a dependency-light EPUB parser and stored-ZIP
EPUB2 builder (ported + tested), a main-process reader service (library, import,
state, export), and a reading UI with chapter navigation, word tap-to-gloss,
save-to-lexicon, draft editing and export.

Phase 7 complete: scenario practice — the bundled Finnish-based scenario packs
(21 language pairs) with vocabulary/phrases/dialogues tabs, save-to-lexicon and
speak.

Phase 8 complete: external translation providers (DeepL / Google) ahead of the
LLM tier with securely stored keys; text-to-speech with a Piper seam and OS-voice
fallback; a first-run onboarding dialog; and an i18n scaffold wired into the app
shell.

## Internationalization

The UI ships in **21 languages**: English, Finnish, Hebrew, Japanese, Korean,
German, French, Portuguese, Spanish, Russian, Italian, Swedish, Danish, Dutch,
Indonesian, Polish, Turkish, Arabic, Hindi, Persian and Chinese. Selecting a
language in Settings → Interface re-renders the whole app and sets the document
direction (RTL for Arabic, Persian and Hebrew).

All component strings are extracted into semantic keys resolved by
`src/renderer/src/lib/i18n.ts`. The locale files under
`src/renderer/src/locales/*.json` are **generated** from the Cobaltium Android
app's human-reviewed `res/values-*/strings.xml` translations via:

```bash
pnpm gen:locales
```

`scripts/gen-locales.mjs` maps each desktop key to an Android string key, so most
labels/actions use authoritative translations. Desktop-only strings without an
Android source are authored directly in the script; long descriptive paragraphs
and brand names (DeepL, LangDex) fall back to English. To localize a new string:
add a `t('key')` call, add the key to the script's `ENTRIES` (or `SUPPLEMENTAL`),
and re-run `pnpm gen:locales`.

Feature work remaining: additional polish and filling the handful of remaining
English-only descriptive strings.

## Speech (offline TTS)

Cobaltium speaks fully offline: **espeak-ng** converts text to IPA phonemes and
**Piper VITS** voices synthesize the audio through `onnxruntime-node`.

- **espeak-ng 1.52.0** (GPLv3) — phonemizer, statically linked into the vendored
  `espeak_bridge` shared library (`vendor/espeak-bridge`, built with
  `pnpm build:espeak`). The pre-compiled `espeak-ng-data` ships under
  `resources/espeak-ng-data`.
- **jpreprocess 0.15.0** (BSD-3-Clause, an OpenJTalk rewrite) — Japanese G2P via
  the vendored `ja_bridge` (`vendor/ja-bridge`, `pnpm build:ja-bridge`), which
  embeds the NAIST-JDIC dictionary. The label → IPA + pitch-accent mapping follows
  Piper's `phonemize_japanese`.
- **Piper VITS voices** (per-voice licenses) via `onnxruntime-node` (MIT).

Tiering: **offline espeak-ng/jpreprocess + VITS → optional native Piper
(user-supplied) → operating-system voices.** Nineteen languages have an offline
voice pack (English, Spanish, French, German, Italian, Portuguese, Russian,
Swedish, Danish, Dutch, Indonesian, Turkish, Arabic, Hindi, Persian, Finnish,
Korean, Mandarin Chinese and Japanese). Settings → **Offline voices** downloads
and removes packs (~60–75 MB each) into the app data directory.

### Licensing

Cobaltium Desktop's own source code is licensed under the **GNU General Public
License v3.0 or later** — see the repository [`LICENSE`](LICENSE). The offline
speech stack links **espeak-ng (GPLv3)** and the Japanese bridge embeds the
NAIST-JDIC dictionary, so the combined application binary is likewise
distributed under **GPLv3**. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
for components, licenses and source links. Piper voice models keep their own
licenses (see each voice's MODEL_CARD on HuggingFace).

