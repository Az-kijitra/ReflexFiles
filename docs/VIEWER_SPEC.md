# Viewer Specification
Updated: 2026-02-18

## Scope
This document defines the expected behavior of ReflexViewer (`/viewer`) for maintainers, QA, and contributors.

## Supported Content Types
- Plain text
- Markdown
- Source code (syntax-highlighted where supported)
- Image files (png, jpeg, bmp)

## Open Behavior
- Viewer opens from the main file list selection.
- The viewer title includes the target file name.
- For unsupported or unreadable files, viewer shows an error state instead of crashing.

## Text/Markdown Behavior
- Text content is rendered with line-oriented display.
- Markdown renders headings and body content in a readable article layout.
- Large text/markdown files use virtualization to keep interaction responsive.

## Image Behavior
- Image viewer supports:
  - `Fit`
  - `100%`
  - `200%`
- Zoom indicator reflects current zoom mode and ratio.
- Supported image URL forms in runtime:
  - `data:image/...`
  - `http://asset.localhost/...`
  - `https://asset.localhost/...`
  - `tauri://localhost/...`
  - `file://...`

## Navigation
- Viewer exposes previous/next controls for sibling files.
- Position indicator shows current index / total (e.g. `2 / 3`).

## Close Behavior
- `Esc` closes viewer and returns focus to main window/list.

## E2E Coverage
Viewer behavior is validated by:
- `app/e2e/tauri/viewer_flow.mjs`

Minimum acceptance checks:
- text rendering verifies expected content
- markdown rendering verifies heading/body presence
- image rendering verifies control visibility and zoom indicator updates

## Non-Goals
- Advanced markdown plugins beyond current renderer baseline
- In-view editing of files
- Metadata editing from viewer
