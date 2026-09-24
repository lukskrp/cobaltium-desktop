# Third-party notices

Cobaltium Desktop bundles or links the components below. Cobaltium's own source
files are under the repository [LICENSE](LICENSE) (GNU General Public License
v3.0 or later). Because the offline speech stack links **espeak-ng (GPLv3)**,
the **combined application binary is distributed under GPLv3**; the source for
every GPL/LGPL component is available from the links below.

## Offline speech

### espeak-ng 1.52.0 — GPLv3

Used for text → IPA phonemization for all non-Japanese offline voices. Built from
source as a static library and linked into the vendored `espeak_bridge`
(`vendor/espeak-bridge/bridge.c`), which is loaded in-process via FFI. The
compiled voice/lexicon data ships under `resources/espeak-ng-data/`.

- Source: https://github.com/espeak-ng/espeak-ng (tag `1.52.0`)
- License: GNU General Public License v3.0
- Build: `pnpm build:espeak` (fetches the pinned source and builds the bridge)

### jpreprocess 0.15.0 — BSD-3-Clause

Japanese text preprocessor (an OpenJTalk rewrite) built as the `ja_bridge` Rust
library (`vendor/ja-bridge`). It embeds the NAIST-JDIC dictionary for
morphological analysis. The label → IPA + pitch-accent mapping follows Piper's
`phonemize_japanese`.

- Source: https://github.com/jpreprocess/jpreprocess (crate `jpreprocess@0.15.0`)
- License: BSD-3-Clause (includes code from OpenJTalk, Copyright (c) 2008-2016
  Nagoya Institute of Technology, and Lindera, Copyright (c) 2019 the project
  authors)
- Dictionary: NAIST-JDIC (see the NAIST-JDIC distribution terms)
- Build: `pnpm build:ja-bridge`

### Piper VITS voices — per-voice licenses

Voice models are downloaded on demand from `rhasspy/piper-voices` and keep their
own licenses (see each voice's MODEL_CARD). Voices are not redistributed with the
application; they are fetched from HuggingFace into the user data directory.

- Source: https://huggingface.co/rhasspy/piper-voices

### whisper.cpp — MIT

Offline speech recognition (`whisper-server` binary + ggml weights). The server
is built from pinned source into `resources/stt/<platform>/` and runs as a
localhost sidecar; models are downloaded on demand from HuggingFace into the
user data directory and keep whisper.cpp's MIT terms.

- Source: https://github.com/ggml-org/whisper.cpp (tag `v1.9.2`)
- License: MIT
- Build: `pnpm build:whisper` (fetches the pinned source and builds the server)

### onnxruntime-node — MIT

Runs the Piper VITS ONNX models. https://github.com/microsoft/onnxruntime

### koffi — MIT

FFI library used to load the native bridges. https://github.com/Koromix/koffi

## Other bundled dependencies

- kuromoji — Apache-2.0 (Japanese tokenization / readings)
- better-sqlite3 — MIT
- electron / electron-updater — MIT
- react, react-dom, react-router-dom — MIT
- lucide-react — ISC
- marked — MIT
- dompurify — Apache-2.0 OR MPL-2.0
- zustand — MIT
- drizzle-orm — Apache-2.0

## Source offer

If you received a binary distribution of Cobaltium and would like the
corresponding source for the GPL/LGPL components above, they are available at the
links provided, or on request. Cobaltium's own source is published at
https://github.com/ (see the repository `homepage`).
