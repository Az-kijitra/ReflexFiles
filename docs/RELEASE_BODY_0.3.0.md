ReflexFiles v0.3.0 focuses on staged Google Drive support, keyboard usability recovery/improvements, and release-process hardening.

## What’s New
- Staged Google Drive support (`gdrive://`) with user-owned Google Cloud / OAuth setup flow.
- Google Drive file listing/viewing, local workcopy external-open flow, and manual write-back with conflict-aware guidance.
- Keyboard usability improvements:
  - `Ctrl+N` = new file
  - `Ctrl+Shift+N` = new folder
  - restored/improved `Ctrl+F`, `F2`, `Ctrl+Alt+Z`, `Ctrl+Alt+X`
  - improved PATH completion cycling/confirmation behavior
- Better keyboard-first ZIP extract UX (confirm only when conflicts exist).
- Lightweight keyboard regression tests (`npm run test:keys`) added to CI quality checks.

## Installer
- `ReflexFiles_0.3.0_x64-setup.exe`
- SHA256: `TBD (fill after release build)`

## Notes
- Windows 10/11
- Public docs (`docs/`) and internal work records (`development_documents/`) are now separated.
- Google Drive credentials (client secret / tokens) are local-only and must not be committed.
- If you find issues, please open an issue with repro steps.
