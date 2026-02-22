# Contributing to ReflexFiles

Thanks for taking the time to contribute.

## How to Contribute
1. Fork the repository and create your branch from `main`.
2. Make your changes with clear, focused commits.
3. Ensure tests and linters pass (see below).
4. Open a Pull Request with a clear description and steps to verify.

## PR Description Template
Use this structure when opening a PR:
```md
## Summary
- What changed in this PR

## Why
- Why this change is needed

## Changes
- Main implementation points

## Verification
- [x] npm run test:keys (when changing keyboard/focus/shortcut behavior)
- [x] npm run check
- [x] cargo test --manifest-path app/src-tauri/Cargo.toml --locked
- [x] npm run e2e:full (or targeted E2E commands)

## Risks and Rollback
- Known risks
- Rollback plan
```

### Example (E2E stability + Rust tests)
- Fixed E2E suite instability caused by Vite port `1422` conflicts between cases.
- Hardened process cleanup/readiness handling in `app/scripts/e2e/run-tauri-selenium.mjs`.
- Fixed Rust test compile errors by adding `Debug` derive to `StorageProvider` and adjusting assertions in `app/src-tauri/src/storage_provider.rs`.
- Verified with:
  - `npm run e2e:full`
  - `cargo test --manifest-path app/src-tauri/Cargo.toml --locked`

## Development Setup (Windows)
```bash
cd app
npm install
npm run tauri dev
```

## Tests
```bash
cd app
npm run test:keys   # run first for keyboard/focus/shortcut changes
npm run docs:keymap-main  # refresh generated main-screen keyboard behavior doc
npm run check
npm run e2e:tauri
```

Recommended order for keyboard-related changes:
1. `npm run test:keys` (lightweight / fast)
2. `npm run docs:keymap-main` (regenerate internal doc `development_documents/ja/KEYBOARD_BEHAVIOR_MAIN.ja.md`)
3. `npm run build`
4. Targeted E2E for impacted areas (`e2e:tauri` / `e2e:viewer` / `e2e:settings`)

## Code Style
- Prefer small, reviewable commits.
- Keep UI and Rust changes scoped and documented.

## Reporting Issues
Use the issue templates when available and include:
- Expected vs actual behavior
- Steps to reproduce
- Logs or screenshots when relevant

## Code of Conduct
By participating, you agree to follow `CODE_OF_CONDUCT.md`.
