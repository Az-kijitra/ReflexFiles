# ReflexFiles User Manual

## Overview
ReflexFiles is a keyboard-first file manager for Windows.
It provides a multi-column file list, tree navigation, fast search, and integrated file operations.

---

## Install / Uninstall
### Install
- **ZIP distribution**: Extract to any folder and run `ReflexFiles.exe`.
- **Installer distribution**: Run the installer and follow the setup wizard.

### Uninstall
- **ZIP distribution**: Exit the app and remove the extracted folder.
- **Installer distribution**: Uninstall from Windows Apps settings.
- To remove app data too, delete `%APPDATA%\\ReflexFIles\\`.

---

## Screen Layout
1. Menu bar
2. Path bar
3. Tree view (left panel)
4. File list (multi-column)
5. Status bar

---

## Quick Start
1. Launch `ReflexFiles.exe`.
2. Use arrow keys to move focus.
3. Press `Enter` on a directory to open it.
4. Press `/` to open search.
5. Use `Ctrl+C` and `Ctrl+V` for copy/paste.
6. Use `Ctrl+J` for jump list and `Ctrl+Y` for history.

---

## Open Behavior (`Enter` / `Shift+Enter`)
When focus is on a file and you press `Enter`:
- If the file extension is supported by ReflexViewer, it opens in ReflexViewer.
- If the extension is not supported but file content looks like text, it opens in ReflexViewer.
- Otherwise, it opens with the OS associated application.

`Shift+Enter` always opens with the OS associated application.

---

## ReflexViewer (Preview / Source / Image)
ReflexViewer is integrated into ReflexFiles and opens compatible files in a dedicated viewer window.

### Supported modes
- **Markdown Preview**: Render markdown as HTML
- **Markdown Text**: Show markdown source with syntax highlight
- **Text / Source Code**: Fixed-width text view with syntax highlight and line numbers
- **Image**: PNG / JPEG / BMP with zoom and pan

### Viewer shortcuts
- `Esc`: Close viewer
- `Ctrl+Q`: Close viewer
- `Alt+Left` / `Alt+Right`: Previous/next file in the same folder
- `Ctrl+PageUp` / `Ctrl+PageDown`: Previous/next file in the same folder
- `Prev` / `Next` buttons: Previous/next file in the same folder
- `Ctrl+O`: Open file chooser
- `Ctrl+F`: Open search panel (text/markdown)
- Arrow keys / `PageUp` / `PageDown`: Scroll
- `Ctrl+Wheel`, `Ctrl++`, `Ctrl+-`, `Ctrl+0`: Zoom (image and markdown HTML)

---

## Search
- Press `/` to open search bar
- Supports substring and regex search

---

## Default Key Bindings
The default profile is `windows`.

| Category | Action | Key |
| --- | --- | --- |
| Move | Up / Down / Left / Right | Arrow keys |
| Move | Page up / down | `PageUp` / `PageDown` |
| Open | Open focused item | `Enter` |
| Open | Open with associated app | `Shift+Enter` |
| Navigation | Go to parent folder | `Backspace` |
| Search | Open search | `/` |
| Selection | Toggle select | `Space` |
| Selection | Select all | `Ctrl+A` |
| Selection | Clear selection | `Esc` |
| Clipboard | Copy / Cut / Paste | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` |
| Edit | Rename | `F2` |
| Edit | Delete to recycle bin | `Delete` |
| View | Toggle tree | `Ctrl+Shift+B` |
| External | Open in Explorer | `Ctrl+Alt+E` |
| External | Open terminal (default profile) | `Ctrl+Alt+C` |
| External | Open CMD terminal profile | `Ctrl+Alt+1` |
| External | Open PowerShell terminal profile | `Ctrl+Alt+2` |
| External | Open WSL terminal profile | `Ctrl+Alt+3` |
| External | Open in VS Code | `Ctrl+Alt+V` |
| External | Open in Git client | `Ctrl+Alt+Shift+G` |
| Help | Keymap help | `F1` |
| App | Exit | `Ctrl+Q` |

---

## Configuration File
ReflexFiles uses `config.toml`.

- Open settings from menu or with `Ctrl+,`
- The config is opened by the default text editor
- Path: `%APPDATA%\\ReflexFIles\\config.toml`

Related files:
- History: `%APPDATA%\\ReflexFIles\\history.toml`
- Jump list: `%APPDATA%\\ReflexFIles\\jump_list.toml`

### Fixed terminal profiles for `Ctrl+Alt+1/2/3`
You can assign fixed Windows Terminal profile names:
- `external_terminal_profile_cmd` for `Ctrl+Alt+1`
- `external_terminal_profile_powershell` for `Ctrl+Alt+2`
- `external_terminal_profile_wsl` for `Ctrl+Alt+3`

Fallback behavior:
- If a per-key setting is empty, `external_terminal_profile` is used.
- If that is also empty, Windows Terminal default profile is used.
- If Windows Terminal is unavailable, it falls back to `cmd.exe`.

`config.toml` also includes a comment section:
- `Detected Windows Terminal profiles at save time`

Use those names exactly when setting profile keys.

### Settings Backup / Restore (Settings)
In **Settings > Advanced**:
- **Create Config Backup** writes a timestamped backup of config.toml
- **Restore Latest Backup** replaces current settings with the newest backup

Backup files are stored in:
- %APPDATA%\\ReflexFIles\\backups\\config-YYYYMMDD-HHMMSS.toml

### Diagnostic Report Options (Settings)
In **Settings > Advanced > Export Diagnostic Report**, you can choose:
- **Mask sensitive paths** (recommended)
- **Save as ZIP**
- **Copy output path to clipboard**
- **Open after export**

Diagnostic reports are stored in:
- %APPDATA%\\ReflexFIles\\diagnostics\\

### Shortcut Conflict Warnings (Settings)
In **Settings > Advanced**, ReflexFiles shows shortcut conflict warnings for:
- Known global shortcuts (example: `Ctrl+Alt+G` with Google Drive)
- Internal duplicates (same key assigned to multiple actions)

---

## Known Limitations
- Some protected system folders may not be visible in tree view due to permissions.
- Drag-and-drop is not supported.
- External app launch requires path configuration for some tools.

---

## License
This application is distributed under the MIT License.


