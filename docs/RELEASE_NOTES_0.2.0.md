# Release Notes v0.2.0 (2026-02-14)

## Summary
This release integrates ReflexViewer into ReflexFiles and improves the file-viewing workflow for text, markdown, source code, and images.

## Highlights
- Integrated viewer flow inside ReflexFiles (no separate external viewer app required).
- Markdown viewer mode:
  - HTML preview mode
  - Text mode with syntax highlighting
  - Toggle between HTML/Text in viewer
- Source code highlighting in text view, with line numbers.
- Image viewer improvements for PNG/JPEG/BMP:
  - More stable loading path
  - Better zoom behavior and responsiveness
- Viewer interaction improvements:
  - Key handling refinements
  - Scroll/zoom behavior consistency

## Localization and Installer
- Added installer language selection (English/Japanese) in NSIS.
- Added language-aware manual/config handling:
  - English manual/config by default
  - Japanese manual/config when Japanese is selected

## Quality and Stability
- Resolved several viewer startup/display edge cases discovered during integration.
- Updated viewer and file-list behavior based on iterative usability feedback.

## Version
- App version: `0.2.0`
- Release date: `2026-02-14`

## Build Artifact (NSIS)
- File: `app/src-tauri/target/release/bundle/nsis/ReflexFIles_0.2.0_x64-setup.exe`
- SHA256: `668F476121E0E959FEFCA861F013C983F864320E02F3ECA419A5C2CE40DCE4C5`
