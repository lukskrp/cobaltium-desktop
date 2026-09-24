# cobaltium-desktop
A Comprehensive Input based desktop software for learning human languages, paired with machine translation and LLMs, text and voice based modes + spaced repetition (anki-style, ease of making flashcards)

My inspiration for making this, is I always wanted to read Finnish interlinearly with English, but no company ever made interlinear books with Finnish to English, and I did not know Finnish fluently, I'm still learning towards that.

So, niche languages never get full attention, focus or support, but that changes with this software. LLMs are smart enough for human languages especially, and this software combines both machine language translators, with
Large Language Models, for most effective computational use.

One can use OpenAI compatible API, that is, one can use one's OWN local LLMs for chat and voice is dealt with a STT, TTS pipeline, no need for specific ComfyUI setup (of course the latency is not near instant like with a direct voice model, but its fast enough especially PiperTTS, eSpeak, Whisper are very effective libraries)

Enjoy learning Japanese, Chinese, Polish, German etc, feel free to make pull requests on improvements on these languages I do not know much about myself.

**"Cobaltium Shine, The Light of Understanding"** (no worries I came up with this myself, my mother likes Cobalt stained glass and was the inspiration for the name and icon and this slogan, the light being an allegory for the mind to shine the understanding of languages into it.

Most of the code on this repository will be GPLv3 and some of it will be MIT as it was originally designed.

Below this line, I will let an LLM generate more elaborate, technical descriptions that may be useful for somebody, this upper top part is my personal notes and thoughts:

____ LLM generated README.md starts here below ____

## Overview

Cobaltium Desktop (v1.0.0) is a cross-platform desktop workspace for learning
human languages through **comprehensible input**, paired with machine
translation and large language models. It is built with **Electron + React 19
+ TypeScript + Tailwind**, with all AI features routed through
**user-configured providers** (local or cloud). No bundled models, no
telemetry.

What is inside:

- **Chat tutor, 5 modes** — conversation, corrective, immersive, reflective
  and voice. Streaming replies rendered as sanitized Markdown; per-mode system
  prompts, sliding-window context folding with persisted summaries, debounced
  drafts and auto session titles.
- **Personal lexicon** — saved words, phrases and nestable folders, with
  romanization, morphological analysis, inflection tables (17 bundled
  rule-based engines + LangDex framework) and dictionary lookup.
- **Spaced repetition (Anki-style)** — SM-2-style scheduler, per-deck
  scheduling state, colored buckets, due-card review with grading, and a
  once-a-day desktop reminder with tray tooltip.
- **Interlinear EPUB reader** — dependency-light EPUB parser and EPUB2
  builder, chapter navigation, tap-a-word gloss, save-to-lexicon, draft
  editing and export.
- **Scenario practice** — bundled Finnish-based packs (21 language pairs)
  with vocabulary / phrases / dialogues tabs and save-to-lexicon.
- **Translation tiers** — fast local endpoint → DeepL / Google Translate
  (own keys) → LLM structured translation with gloss maps, each time-bounded
  with fall-through.
- **Speech pipeline** — offline TTS (espeak-ng 1.52.0 phonemizer + Piper VITS
  voices via onnxruntime, Japanese via jpreprocess/OpenJTalk bridge) with
  optional user-supplied native Piper tier and OS-voice fallback; offline STT
  via a bundled whisper.cpp `whisper-server` sidecar (models downloaded on
  demand). No ComfyUI setup needed.
- **21 UI languages** (English, Finnish, Hebrew, Japanese, Korean, German,
  French, Portuguese, Spanish, Russian, Italian, Swedish, Danish, Dutch,
  Indonesian, Polish, Turkish, Arabic, Hindi, Persian, Chinese), RTL layout
  for Arabic/Persian/Hebrew, and per-message text direction from the language
  profile. `Auto` follows the OS locale with English fallback.
- **Local-first data** — SQLite (better-sqlite3 + Drizzle, WAL mode),
  API keys encrypted in the OS keychain, full backup/restore to zip, and
  `cobaltium.chat` v1 import.

## Use cases

- Read Finnish (or Japanese, Polish, German, …) **interlinearly** with
  English: open an EPUB, tap words for glosses, save them, review as
  flashcards.
- Chat with a tutor that **corrects** your sentences, **immerses** you in the
  target language, or **reflects** your native text back via flip cards.
- Build Anki-style decks **without manual card creation** — everything you
  save becomes reviewable.
- Run **fully offline-capable speech** with your own local LLM
  (Ollama / LM Studio / llama.cpp over an OpenAI-compatible endpoint).

## How to use

1. Install the app (Windows installer below, or build from source).
2. Open **Settings → UI options and model**: pick a provider (cloud vendor or
   local endpoint), paste the API key (encrypted on-device), choose the model
   and press **Enable LLM**.
3. Set the **learning** and **helping** languages (Settings → Languages).
4. Chat: type, or use voice mode (enable the microphone under Settings →
   Speech). Click words to gloss, select spans to save phrases, use the
   speaker button to hear them.
5. Review saved words under **Review**, read books under **Reader**, drill
   situations under **Scenarios**. A first-run guided tour covers all of this
   in-app (reopen it from Settings).

## Platforms and requirements

| Platform | Status |
| --- | --- |
| Windows 10/11 x64 | Official installer published under GitHub Releases |
| Linux x64 | Build from source (guide below, no binaries published) |
| macOS | Build from source (`pnpm dist:mac`), no binaries published |

Developer requirements: **Node.js 22+** (tested on 24), **pnpm 11+**
(`corepack enable pnpm`), Git, CMake, a C/C++ toolchain and the Rust
toolchain — the last three only for the native speech bridges
(`pnpm build:native`). The app runs without the bridges (OS voices only).

## Install on Windows

1. Go to **Releases** on this repository and download
   `Cobaltium-1.0.0-setup.exe`.
2. Run the installer (NSIS). The 1.0.0 build is unsigned, so Windows
   SmartScreen may ask for confirmation — click *More info → Run anyway*.
3. Launch Cobaltium and configure your provider as described above.

To cut the release yourself from source on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1 -InstallDeps
pnpm dist:win
```

The installer lands under `dist/`. For a published release instead, push the
`v1.0.0` tag — the `Release` GitHub Action builds and attaches installers
automatically (see `CONTRIBUTING.md`).

## Building on Linux (Debian, Devuan, Gentoo, Arch)

No Linux binaries are published — building takes ~10 minutes and needs the
same toolchain on every distribution: Node 22, pnpm 11, Git, CMake, GCC/G++,
Rust/cargo, Python 3 (for native Node modules), pkg-config, plus the
Electron runtime libs (GTK 3, NSS, ALSA, libsecret for the keychain, FUSE
for AppImage). The app itself needs **no systemd unit** — it runs identically
under systemd, OpenRC and sysvinit.

Common steps on every distro (after installing the packages below):

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm build:native   # espeak-ng bridge + Japanese bridge + whisper-server
pnpm build          # typecheck + production bundle into out/
pnpm dist:linux     # AppImage + .deb under dist/
```

If a native bridge fails, each can be skipped with a prebuilt override:
`COBALTIUM_ESPEAK_LIB`, `COBALTIUM_JA_LIB`, `COBALTIUM_WHISPER_BIN`.
Without the bridges the app still runs (OS voices only).

### Debian 12/13 (bookworm/trixie)

```bash
sudo apt update
sudo apt install -y build-essential cmake git curl python3 pkg-config \
  libsecret-1-dev libgtk-3-0 libnss3 libasound2 fuse3
# Node.js 22 (pick one):
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable pnpm
```

### Devuan (OpenRC, e.g. Daedalus/Excalibur)

Same set as Debian — nothing here depends on systemd or snapd:

```bash
sudo apt update
sudo apt install -y build-essential cmake git curl python3 pkg-config \
  libsecret-1-dev libgtk-3-0 libnss3 libasound2 fuse3
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable pnpm
```

If FUSE is unavailable, run the AppImage via
`./Cobaltium-*.AppImage --appimage-extract` or install the `.deb` instead.

### Gentoo

```bash
sudo emerge --ask --noreplace dev-lang/rust-bin dev-vcs/git dev-build/cmake \
  sys-devel/gcc dev-lang/python sys-devel/pkgconf dev-libs/libsecret \
  x11-libs/gtk+:3 dev-libs/nss media-libs/alsa-lib sys-fs/fuse:3 \
  net-libs/nodejs
sudo corepack enable pnpm
```

Tip: set `MAKEOPTS="-j$(nproc)"` — the espeak-ng and whisper.cpp builds are
the slow part. Alternatively `dev-lang/rust` instead of `rust-bin` if you
prefer a source bootstrap.

### Arch Linux (+ PKGBUILD sketch)

```bash
sudo pacman -Syu --needed base-devel cmake git nodejs pnpm rust python \
  pkgconf libsecret gtk3 nss alsa-lib fuse3
```

Community `PKGBUILD` sketch (untested — offered as a starting point, not an
official package):

```bash
pkgname=cobaltium-desktop
pkgver=1.0.0
pkgrel=1
pkgdesc="Language-learning workspace: chat tutor, lexicon, SRS review, EPUB reader"
arch=('x86_64')
url="https://github.com/lukskrp/cobaltium-desktop"
license=('GPL3')
depends=('gtk3' 'nss' 'alsa-lib' 'libsecret')
makedepends=('nodejs' 'pnpm' 'git' 'cmake' 'rust' 'python' 'base-devel' 'pkgconf')
source=("git+https://github.com/lukskrp/cobaltium-desktop.git#tag=v$pkgver")
sha256sums=('SKIP')

build() {
  cd "$pkgname"
  pnpm install --frozen-lockfile
  pnpm build:native
  pnpm build
  pnpm dist:linux
}

package() {
  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
  install -Dm644 THIRD_PARTY_NOTICES.md NOTICE.md -t "$pkgdir/usr/share/doc/$pkgname/"
  install -Dm755 dist/*.AppImage "$pkgdir/opt/$pkgname/"  # or the unpacked dir
}
```

## Versioning

`1.0.0` is the first public release. The version lives in `package.json`
(`app.getVersion()` and the installer filename derive from it).

## License

Cobaltium Desktop's own source code is **GPLv3-or-later** (see `LICENSE`).
The offline speech stack links **espeak-ng (GPLv3)**, so the combined binary
is likewise GPLv3. See `THIRD_PARTY_NOTICES.md` + `NOTICE.md` for components
and source links; Piper voice models keep their own licenses (see each
voice's MODEL_CARD).
