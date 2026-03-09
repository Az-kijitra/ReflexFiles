ReflexFiles v0.4.0 formalizes local drag-and-drop support, hardens keyboard behavior, and tightens release quality gates.

## What’s New
- Local drag-and-drop is now a formal feature:
  - `Explorer -> ReflexFiles` import (local-only)
  - `ReflexFiles -> Explorer` export with `Ctrl+Alt + Left Click` (local-only, copy-only)
  - Google Drive drag-and-drop remains unsupported
- Keyboard / PATH completion quality improvements:
  - stronger shortcut regression coverage
  - fixed modal/overlay shortcut boundary leaks
  - improved PATH completion preview/cancel/status visibility
  - documented `Enter` behavior for PATH completion
- Quality / release improvements:
  - added `npm run test:dnd` to CI `quality`
  - expanded smoke E2E shortcut checks
  - refreshed npm lockfile so `npm audit --audit-level=high` passes

## Installer
- `ReflexFiles_0.4.0_x64-setup.exe`
- SHA256: `TBD (fill after release build)`

## Notes
- Windows 10/11
- Drag-and-drop is local-only.
- Outbound drag is copy-only.
- Google Drive drag-and-drop is not supported.
- If you find issues, please open an issue with repro steps.
