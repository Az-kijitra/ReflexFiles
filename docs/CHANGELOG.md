# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.
https://keepachangelog.com/en/1.1.0/

## [Unreleased]

## [0.3.0] - 2026-02-22

### Added
- Google Drive phased integration foundations and user workflow:
  - user-owned Google Cloud / OAuth setup flow
  - real/stub backend mode handling
  - Google Drive listing/viewing for supported file types
  - local workcopy based external-open + manual write-back flow
  - write-back conflict handling guidance and scope error guidance
- Lightweight keyboard regression test runner (`npm run test:keys`) and CI gate integration.
- Internal generated keyboard behavior reference for main screen (`docs:keymap-main`, now internal document output).

### Changed
- Main-screen keyboard behavior was realigned toward Windows/browser conventions:
  - `Ctrl+N` = new file
  - `Ctrl+Shift+N` = new folder
  - strengthened `Ctrl+F`, `F2`, `Ctrl+Alt+Z`, `Ctrl+Alt+X` handling
  - improved PATH completion cycling/confirmation behavior
- ZIP extract UX changed from always-on overwrite checkbox to conflict-time confirmation dialog.
- Public/private documentation split was clarified:
  - `docs/` for public release docs
  - `development_documents/` for internal work records (release-excluded)
- ADR / threat model / Google Drive self-setup / keyboard behavior reference documents moved to internal records (`development_documents/`).
- User manuals now include user-facing Google Drive setup/usage guidance directly (instead of linking users to internal setup notes).

### Fixed
- Core shortcut regressions on Windows WebView/Tauri paths (including search focus, rename, ZIP actions, copy/paste/new).
- Duplicate modal submit behavior that could trigger transient false "already exists" errors on create actions.
- Several E2E/runner stability issues around port reuse and retry behavior (workflow/operation stability improvements).

### Security
- Google Drive credential handling baseline documented and enforced in workflow:
  - no public/shared credentials in repository
  - placeholder-only public docs
  - secure storage path usage for sensitive OAuth material
- Repository hygiene improved by excluding app local npm cache (`app/.npm-cache`) from version control.
