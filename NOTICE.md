# Notices

Cobaltium Desktop — Copyright (c) 2026 Cobaltium contributors.
Licensed under the GNU General Public License v3.0 or later (see `LICENSE`).

This product bundles data and code from the following upstream projects, in
addition to the components listed in `THIRD_PARTY_NOTICES.md`:

- **espeak-ng** (https://github.com/espeak-ng/espeak-ng) — GPLv3.
  Text-to-phoneme engine, statically linked into `vendor/espeak-bridge`;
  voice/lexicon data ships under `resources/espeak-ng-data/`.
- **jpreprocess / OpenJTalk / Lindera** — BSD-3-Clause.
  Japanese text processing in `vendor/ja-bridge` (crate `jpreprocess@0.15.0`
  with the `naist-jdic` feature). Includes code from OpenJTalk, Copyright (c)
  2008-2016 Nagoya Institute of Technology.
- **NAIST-JDIC** — distributed under the NAIST-JDIC terms (see the
  `jpreprocess-naist-jdic` crate). Dictionary data embedded via the Japanese
  bridge for morphological analysis.
- **kuromoji dictionary data** (`resources/kuromoji-dict/`) — Apache-2.0.
- **whisper.cpp** (https://github.com/ggml-org/whisper.cpp) — MIT. Built into
  the `whisper-server` sidecar (`resources/stt/`); models are downloaded on
  demand and keep whisper.cpp's MIT terms.
- **Piper VITS voices** (https://huggingface.co/rhasspy/piper-voices) —
  per-voice licenses (see each voice's MODEL_CARD). Downloaded on demand, not
  redistributed.
