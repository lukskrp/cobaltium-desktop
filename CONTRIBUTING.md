# Contributing to Cobaltium Desktop

## License

Cobaltium Desktop's own source code is licensed under the **GNU General Public
License v3.0 or later** (see [`LICENSE`](LICENSE)). By contributing, you agree
that your contribution is made under the same terms and that you hold the
copyright (or have permission) to do so.

Third-party components keep their own licenses — document any new bundled
dependency in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and, if it is
copyleft, flag it in your pull request. Do not add GPL/AGPL-incompatible or
proprietary dependencies without discussion.

## Workflow

- Requirements: Node 22, pnpm 11.
- Install: `pnpm install --frozen-lockfile`
- Checks (also run in CI): `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm build`
- Native speech bridges (espeak-ng, Japanese, whisper.cpp):
  `pnpm build:native`, then `node scripts/smoke-native.mjs`
- UI strings: `src/renderer/src/locales/en.json` is the source of truth.
  Add the key to `scripts/gen-locales.mjs` (`ENTRIES`, English fallback) and
  run `pnpm gen:locales` — never hand-edit the other 20 locale files. See
  `localizations-instruct.md` for the translator handoff.
- Packaging: `pnpm pack:dir` (unpacked) or `pnpm dist:<win|mac|linux>`.
  `LICENSE`, `THIRD_PARTY_NOTICES.md` and `NOTICE.md` must ship with the
  binary (wired in `electron-builder.yml`) — do not exclude them.
