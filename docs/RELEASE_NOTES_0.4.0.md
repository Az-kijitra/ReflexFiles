# Release Notes v0.4.0 (2026-03-09)

## Summary
This release focuses on formalizing local drag-and-drop support, hardening keyboard behavior, and tightening release quality gates after the broader v0.3.0 feature expansion.

## Highlights
- Local drag-and-drop is now a formal feature
  - `Explorer -> ReflexFiles` import (local-only)
  - `ReflexFiles -> Explorer` export with `Ctrl+Alt + Left Click` (local-only, copy-only)
  - Google Drive paths remain explicitly out of scope for drag-and-drop
- Keyboard and PATH completion quality improvements
  - stronger shortcut regression coverage
  - fixed modal/overlay shortcut boundary leaks
  - improved PATH completion preview/cancel visibility and status wording
  - `Enter` behavior for PATH completion is now fixed and documented
- Quality / release improvements
  - lightweight drag-and-drop regression test (`npm run test:dnd`) added to CI quality gate
  - smoke E2E now verifies key shortcuts including `Ctrl+Shift+N`, `Ctrl+F`, `F2`, ZIP actions, and jump URL
  - npm dependency lockfile refreshed so `npm audit --audit-level=high` passes again

## Drag-and-Drop Scope
- Supported:
  - local file/folder drag import from Explorer into ReflexFiles
  - local file/folder drag export from ReflexFiles to Explorer using `Ctrl+Alt + Left Click`
- Not supported:
  - Google Drive drag-and-drop (`gdrive://`)
  - outbound move semantics (copy-only is the formal behavior)

## Keyboard / PATH Completion Stability
- Fixed several keyboard fallback leaks around overlay/modal targets.
- Preserved native `Ctrl+C/X/V` behavior inside text inputs.
- Improved PATH completion status readability:
  - shorter candidate labels
  - explicit no-candidate message
  - clearer cancel feedback
  - faster restoration of candidate status while preview is active

## Security and Dependency Hygiene
- `npm audit --audit-level=high` is back to passing by refreshing the lockfile to patched dependency resolutions.
- Google Drive readonly stub builds were fixed so feature-gated CI/build variants compile correctly.

## Version
- App version: `0.4.0`
- Release date: `2026-03-09`

## Build Artifact (NSIS)
- File: `ReflexFIles_0.4.0_x64-setup.exe`
- SHA256: `C3E26197CAE3642E2BD168092FA7A6B2F3E420B9B0529E2A07A212ACC6C86A25`

## RELEASE_NOTE_BODY
```md
ReflexFiles v0.4.0 formalizes local drag-and-drop support, hardens keyboard behavior, and tightens release quality gates.

### Highlights
- Local drag-and-drop (formalized)
  - `Explorer -> ReflexFiles` import (local-only)
  - `ReflexFiles -> Explorer` export with `Ctrl+Alt + Left Click` (local-only, copy-only)
  - `gdrive://` drag-and-drop remains unsupported by design
- Keyboard / PATH completion quality
  - stronger shortcut regression coverage
  - fixed modal/overlay shortcut boundary leaks
  - improved PATH completion preview/cancel/status behavior
  - documented `Enter` commit behavior for PATH completion
- Quality / release
  - added lightweight DnD regression checks (`npm run test:dnd`) to CI `quality`
  - smoke E2E now verifies `Ctrl+Shift+N`, `Ctrl+F`, `F2`, ZIP shortcuts, and jump URL
  - refreshed npm lockfile so `npm audit --audit-level=high` passes again

### Scope / Notes
- Drag-and-drop is local-only.
- Outbound drag is copy-only.
- Google Drive drag-and-drop is not supported.

### Build Artifact (NSIS)
- File: `ReflexFIles_0.4.0_x64-setup.exe`
- SHA256: `C3E26197CAE3642E2BD168092FA7A6B2F3E420B9B0529E2A07A212ACC6C86A25`
```
