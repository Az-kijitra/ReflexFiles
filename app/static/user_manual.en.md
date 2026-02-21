# ReflexFiles User Manual

## Overview
ReflexFiles is a keyboard-first file manager for Windows.
It combines a multi-column file list and tree view so you can navigate, search,
copy, and archive files quickly.

---

## Install / Uninstall
### Install
Installation steps depend on the distribution type.
- **ZIP distribution**: Extract the ZIP to any folder and run `ReflexFiles.exe`.
- **Installer distribution**: Run setup and follow the on-screen steps.

### Uninstall
- **ZIP distribution**: Exit the app and delete the extracted folder.
- **Installer distribution**: Uninstall from Windows "Apps & features".
- To remove settings and history too, delete `%APPDATA%\\ReflexFIles\\`.

---

## Screen Layout
1. **Menu bar**
2. **PATH bar**
3. **Tree view (left pane)**
4. **File list (multi-column)**
5. **Status bar**

---

## Quick Start (3 Minutes)
1. **Launch**
   - Run `ReflexFiles.exe`.
2. **Navigate**
   - Move with arrow keys, press **Enter** to open a folder.
3. **Navigate by PATH**
   - Enter a path in PATH bar and press **Enter**.
4. **Search**
   - Press `/` to show Search bar and type a query.
5. **Copy / Paste**
   - Use **Ctrl+C** and **Ctrl+V**.
6. **Bookmark frequently used locations**
   - Press **Ctrl+Shift+J** to add to Jump List, **Ctrl+J** to open it.
7. **Open folder history**
   - Press **Ctrl+Shift+Y**.

---

## Basic Usage
### Navigate and Open
- Use **Up/Down/Left/Right** to move focus.
- **Enter** opens the focused item:
  - Folder: enter that folder
  - File: open in ReflexViewer when extension is supported, or when content is detected as text
  - Otherwise: open with OS associated app
- **Shift+Enter** always opens file with OS associated app.
- **Backspace** goes to parent folder.

### Selection
- **Space** toggles selection (then moves to next row)
- **Ctrl+A** selects all
- **Esc** clears selection

### PATH Bar
- Type directly and press **Enter** to navigate
- **Esc** cancels editing and returns focus to list
- **Tab** performs path completion while editing PATH
- **Tab / Shift+Tab** cycles focus (list -> PATH -> tree -> list)
- **Ctrl+J / Ctrl+Y** opens Jump List / History

---

## ReflexViewer (Preview / Source)
Supported files open in ReflexViewer.

### Main View Modes
- **Markdown Preview**: Render Markdown as formatted HTML
- **Text (Markdown Source)**: Markdown source with syntax highlighting
- **Source Code Highlight**: Syntax coloring for C/C++/Rust/JavaScript/TypeScript/Python/JSON and more
- **Image Viewer**: PNG/JPEG/BMP with zoom and pan

### Basic Viewer Shortcuts
- **Esc**: Close viewer
- **Ctrl+Q**: Close viewer
- **Alt+Left / Alt+Right**: Previous/next file in same folder
- **Ctrl+PageUp / Ctrl+PageDown**: Previous/next file in same folder
- **Prev / Next buttons**: Previous/next file in same folder
- **Ctrl+O**: Open file picker
- **Ctrl+F**: Open search panel (text/Markdown)
- **Ctrl + wheel / Ctrl+Plus / Ctrl+Minus / Ctrl+0**: Zoom (image or Markdown HTML)
- **Ctrl+Shift+1 / Ctrl+Shift+2 / Ctrl+Shift+3**: Large-text prefetch profile (Fast / Balanced / Memory)

---

## Feature List (Detailed)
- **Tree View**
  - Expand/move by mouse or keyboard
  - Linked with file list
  - Show/hide toggle (View menu / Ctrl+Shift+B)
- **Search**
  - Press `/` to open Search bar
  - Substring and regex search
- **History / Jump List**
  - History: previously visited paths
  - Jump List: manually registered paths
  - URLs can also be added to Jump List
- **File Operations**
  - Copy / Cut / Paste
  - Delete (to trash)
  - Rename
  - Create file/folder
  - Duplicate
  - Prefix date to names
- **ZIP**
  - Create ZIP
  - Extract ZIP
- **Sorting**
  - Choose from sort menu
- **External Apps**
  - Explorer / Terminal / VS Code / Git client
  - User-defined external apps
- **Undo / Redo**
  - Undo or redo previous supported operations
- **Help**
  - Keymap (opens in ReflexViewer and jumps to key section)
  - User manual (opens in ReflexViewer)
  - About (URL / license / logo)

---

## Default Key Bindings
Key bindings are controlled by `input_keymap_profile`.
The table below is the default **Windows-like** profile.

### Windows-like (Default)
| Category | Action | Key |
| --- | --- | --- |
| Navigation | Up/Down/Left/Right | Up / Down / Left / Right |
| Navigation | Page move | PageUp / PageDown |
| Action | Undo | Ctrl+Z |
| Action | Redo | Ctrl+Shift+Z |
| Selection | Toggle selection | Space |
| Selection | Select all | Ctrl+A |
| Selection | Clear selection | Esc |
| Action | Open | Enter |
| Action | Force open with associated app | Shift+Enter |
| Action | Parent folder | Backspace |
| Action | Search | / |
| Action | Refresh | F5 |
| Action | Properties | Alt+Enter |
| Action | Open config file | Ctrl+, |
| Action | Exit | Ctrl+Q |
| View | Toggle tree view | Ctrl+Shift+B |
| View | Toggle hidden files | Ctrl+H |
| View | Toggle size column | Ctrl+Shift+S |
| View | Toggle time column | Ctrl+Shift+T |
| Action | Sort menu | S |
| Action | Focus PATH | Ctrl+L |
| Action | Focus cycle (list/PATH/tree) | Tab / Shift+Tab |
| Action | PATH completion | Tab |
| Action | Keymap | F1 |
| History | Open history | Ctrl+Y |
| Jump List | Open jump list | Ctrl+J |
| Jump List | Add current path to jump list | Ctrl+Shift+J |
| Jump List | Add URL to jump list | Ctrl+Shift+U |
| File | Copy | Ctrl+C |
| File | Cut | Ctrl+X |
| File | Paste | Ctrl+V |
| File | Delete | Delete |
| File | Rename | F2 |
| File | Create new | Ctrl+N |
| File | Duplicate | Ctrl+D |
| File | Add date prefix | Ctrl+Shift+D |
| ZIP | Create ZIP | Ctrl+Alt+Z |
| ZIP | Extract ZIP | Ctrl+Alt+X |
| External app | Open in Explorer | Ctrl+Alt+E |
| External app | Open in terminal (default profile) | Ctrl+Alt+C |
| External app | Open in CMD profile | Ctrl+Alt+1 |
| External app | Open in PowerShell profile | Ctrl+Alt+2 |
| External app | Open in WSL profile | Ctrl+Alt+3 |
| External app | Open in VS Code | Ctrl+Alt+V |
| External app | Open in Git client | Ctrl+Alt+Shift+G |

> You can customize key bindings in config.

---

## Editing the Config File
Settings are managed by **editing config files**, not by direct UI toggles.
Open `config.toml` from File menu -> Settings, or press **Ctrl+,**.
`config.toml` opens with your OS default text editor.

### Config File Location
`%APPDATA%\\ReflexFIles\\config.toml`

### History / Jump List Files
- History: `%APPDATA%\\ReflexFIles\\history.toml`
- Jump List: `%APPDATA%\\ReflexFIles\\jump_list.toml`

### Fixed Terminal Profiles for `Ctrl+Alt+1/2/3`
You can pin Windows Terminal profile names:
- `external_terminal_profile_cmd`: used by `Ctrl+Alt+1` (CMD)
- `external_terminal_profile_powershell`: used by `Ctrl+Alt+2` (PowerShell)
- `external_terminal_profile_wsl`: used by `Ctrl+Alt+3` (WSL)

Fallback behavior:
- If a per-key profile is empty, `external_terminal_profile` is used
- If it is also empty, Windows Terminal default profile is used
- If Windows Terminal is unavailable, fallback to `cmd.exe`

On save, `config.toml` also includes this comment section:
- `# Windows Terminal profiles detected at save time`

Copy profile names from that list as-is.

### Config Backup / Restore (Settings Screen)
In **Settings > Advanced**:
- **Create Config Backup**: save current config with timestamp
- **Restore Latest Backup**: overwrite current config with newest backup

Backup location:
- `%APPDATA%\\ReflexFIles\\backups\\config-YYYYMMDD-HHMMSS.toml`

### Diagnostic Report Options (Settings Screen)
In **Settings > Advanced > Export Diagnostic Report**:
- **Mask sensitive paths** (recommended)
- **Save as ZIP**
- **Copy output path to clipboard**
- **Auto-open output after export**

Diagnostic output folder:
- `%APPDATA%\\ReflexFIles\\diagnostics\\`

### Google Drive Setup Guide (Personal Use)
For Google Drive integration setup, see:
- `docs/GOOGLE_DRIVE_SELF_SETUP.md`

The guide includes:
- Google Cloud input examples
- Common auth troubles (`ERR_CONNECTION_REFUSED`, `client_secret is missing`, etc.)
- No-charge operation guidance (billing avoidance rules and monthly checks)

### Shortcut Conflict Warnings (Settings Screen)
In **Settings > Advanced**, conflict warnings include:
- Known global shortcut conflicts (for example, `Ctrl+Alt+G` and Google Drive)
- In-app duplicate assignments (same key bound to multiple actions)

> Each config key has comments describing valid values and choices.

---

## Typical Workflows
### Example 1: Organize many files quickly
1. Navigate to target folder from PATH bar
2. Press **Ctrl+A** then **Delete**
3. Use **Undo** if needed

### Example 2: Manage work folders with Jump List
1. Open a work folder
2. Press **Ctrl+Shift+J** to add it
3. Next time, jump instantly via **Ctrl+J**

### Example 3: Create and share a ZIP
1. Select target files
2. Run **Create ZIP**
3. Open/send the generated ZIP

---

## Known Issues
- Some system folders may not appear in tree view due to permissions.
  - Workaround: move from an accessible folder or enter path directly in PATH bar.
- Drag and drop is not supported yet.
- External apps (VS Code / Git client) cannot be opened when not configured.
  - Workaround: set `external_vscode_path` / `external_git_client_path` in `config.toml`.
- In folders with huge numbers of items, automatic tree expansion may be limited.

---

## License
This application is provided under the **MIT License**.

---

## Disclaimer
- The author is not responsible for any damage caused by use of this software.
- Back up important files before critical file operations.

---

## OSS and Licenses Used
Major OSS dependencies and licenses (see each project LICENSE for full details):

- **Tauri**: MIT / Apache-2.0
- **tauri-plugin-opener**: MIT / Apache-2.0
- **tauri-plugin-global-shortcut**: MIT / Apache-2.0
- **Svelte / SvelteKit**: MIT
- **Vite**: MIT
- **Rust crates** (serde, serde_json, toml, chrono, windows, trash, zip, notify, once_cell, etc.):
  mostly MIT or Apache-2.0

---

## Appendix: Full `config.toml` Key List
### General / UI / Behavior
| Key | Type | Description | Example / Notes |
| --- | --- | --- | --- |
| `config_version` | number | Config schema version | Usually auto-updated |
| `perf_dir_stats_timeout_ms` | number | Directory stats timeout (ms) | Minimum 500 |
| `ui_show_hidden` | boolean | Show hidden files | `true` / `false` |
| `ui_show_size` | boolean | Show size column | `true` / `false` |
| `ui_show_time` | boolean | Show timestamp column | `true` / `false` |
| `ui_show_tree` | boolean | Show tree view | `true` / `false` |
| `view_sort_key` | string | Default sort key | `name` / `size` / `type` / `modified` |
| `view_sort_order` | string | Default sort order | `asc` / `desc` |
| `session_last_path` | string | Last PATH on previous exit | e.g. `C:/Users` |
| `history_search` | array(string) | Search history | e.g. `["foo","bar"]` |
| `ui_theme` | string | Theme | `light` / `dark` |
| `ui_language` | string | Display language | `en` / `ja` |

### Window
| Key | Type | Description | Example / Notes |
| --- | --- | --- | --- |
| `ui_window_x` | number | Window X position (px) | `0` means no restore |
| `ui_window_y` | number | Window Y position (px) | `0` means no restore |
| `ui_window_width` | number | Window width (px) | `0` means no restore |
| `ui_window_height` | number | Window height (px) | `0` means no restore |
| `ui_window_maximized` | boolean | Maximized state | `true` / `false` |

### Input / Keymap
| Key | Type | Description | Example / Notes |
| --- | --- | --- | --- |
| `input_keymap_profile` | string | Keymap profile | `windows` / `vim` |
| `input_keymap_custom` | table | Key override mapping | e.g. `{ open = "Enter", jump_add_url = "Ctrl+Shift+U" }` |

> Action IDs for `input_keymap_custom` are shown in Help -> Keymap.

### External Apps
| Key | Type | Description | Example / Notes |
| --- | --- | --- | --- |
| `external_associations` | table | Per-extension app association | e.g. `{ ".txt" = "C:\\App\\Editor.exe" }` |
| `external_apps` | array(table) | External app list | `name`/`command`/`args`/`shortcut` |
| `external_git_client_path` | string | Git client executable path | Empty = use default |
| `external_vscode_path` | string | VS Code executable path | Empty = try `code` |
| `external_terminal_profile` | string | Common terminal profile | Empty = Windows Terminal default |
| `external_terminal_profile_cmd` | string | Profile for `Ctrl+Alt+1` | Empty = `external_terminal_profile` |
| `external_terminal_profile_powershell` | string | Profile for `Ctrl+Alt+2` | Empty = `external_terminal_profile` |
| `external_terminal_profile_wsl` | string | Profile for `Ctrl+Alt+3` | Empty = `external_terminal_profile` |

In `external_apps.args`, `{path}` and `{cwd}` are available.
Example:
```toml
external_apps = [
  { name = "Everything", command = "C:\\Path\\Everything.exe", args = ["-path", "{path}"], shortcut = "Ctrl+Alt+E" }
]
```

### Logging
| Key | Type | Description | Example / Notes |
| --- | --- | --- | --- |
| `log_path` | string | Log output file | e.g. `%APPDATA%\\ReflexFIles\\app.log` |
| `log_enabled` | boolean | Enable logging | `true` / `false` |

### Note: Key assignment reference
Default key assignments are available in **Help -> Keymap**.
Default bindings are not written to `config.toml`. Use `input_keymap_custom` for overrides.