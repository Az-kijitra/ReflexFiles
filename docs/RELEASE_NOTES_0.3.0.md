# Release Notes v0.3.0 (2026-02-22)

## Summary
This release builds on v0.2.0 (viewer integration) and focuses on Google Drive staged support, keyboard usability recovery/improvements, and release-process hardening.

## Highlights
- Google Drive support (staged implementation)
  - User-owned Google Cloud / OAuth setup flow
  - Real/Stub backend mode distinction
  - Listing and viewing supported file types from `gdrive://`
  - Local workcopy based external-open flow
  - Manual write-back to Google Drive
  - Conflict-aware write-back flow with user guidance
- Keyboard and usability improvements
  - `Ctrl+N` creates file
  - `Ctrl+Shift+N` creates folder
  - Restored/strengthened shortcuts (`Ctrl+F`, `F2`, `Ctrl+Alt+Z`, `Ctrl+Alt+X`)
  - Improved PATH completion cycling/confirmation behavior
  - Better keyboard-first ZIP extract UX (conflict-time confirmation)
- Quality / process improvements
  - Lightweight keyboard regression tests (`npm run test:keys`)
  - CI quality gate includes keyboard regression checks
  - `e2e:full` remains manual regression (not required PR blocker)

## Documentation and Release Policy Updates
- Public docs (`docs/`) and internal work records (`development_documents/`) are now clearly separated.
- ADRs, Google Drive threat model, Google Drive self-setup notes, and generated keyboard behavior reference are internal (release-excluded) records.
- User-facing Google Drive setup/usage guidance is now included directly in the user manuals (EN/JA).

## Security and Credential Handling
- Public repository remains credential-free (placeholders only for Google OAuth examples).
- Google Drive sensitive values (such as client secret / tokens) are treated as local-only and excluded from public documentation.
- Repository hygiene improved by removing local npm cache from version control (`app/.npm-cache`).

## Quality and Stability
- Fixed several shortcut regressions and focus issues in Tauri/WebView keyboard handling.
- Fixed duplicate modal-confirm execution that could cause transient false create errors.
- Improved E2E operational stability (port/process cleanup and retry handling).

## Version
- App version: `0.3.0`
- Release date: `2026-02-22`

## Build Artifact (NSIS)
- File: `TBD during release build`
- SHA256: `TBD during release build`
