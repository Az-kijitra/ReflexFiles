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

## Risks and Rollback
- Known risks
- Rollback plan
```

### Example (Rust tests)
- Fixed Rust test compile errors by adding `Debug` derive to `StorageProvider` and adjusting assertions in `app/src-tauri/src/storage_provider.rs`.
- Verified with:
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
```

Recommended order for keyboard-related changes:
1. `npm run test:keys` (lightweight / fast)
2. `npm run docs:keymap-main` (regenerate internal doc `development_documents/ja/KEYBOARD_BEHAVIOR_MAIN.ja.md`)
3. `npm run build`

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
