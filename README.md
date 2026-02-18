# ReflexFiles

ReflexFiles is a keyboard-first file manager for Windows built with Tauri + SvelteKit.
It focuses on fast navigation, multi-column list views, and efficient file operations.

## Features
- Multi-column file list and tree view
- Fast keyboard navigation and configurable keymap
- Search (substring + regex)
- Copy / move / delete / rename / create
- ZIP create / extract
- Jump list and history
- Integrated ReflexViewer (text, markdown, source highlight, image)

## Requirements (Development)
- Windows 10/11
- Node.js (LTS recommended)
- Rust (stable)
- Tauri prerequisites

## Quick Start (Dev)
```bash
cd app
npm install
npm run tauri dev
```

## Build
```bash
cd app
npm run tauri build
```

## Dependency Audits
```bash
cd app
npm run audit:deps
```

## Documentation
- User manual (English): `user_manual.md`
- User manual (Japanese): `docs/ja/user_manual.ja.md`
- Development guide: `docs/development_guide.md`
- Maintenance guide (English): `docs/maintenance_guide.md`
- Maintenance guide (Japanese): `docs/ja/maintenance_guide.ja.md`
- Terminal profile mapping (`Ctrl+Alt+1/2/3`) is documented in the user manuals (`external_terminal_profile_cmd` / `external_terminal_profile_powershell` / `external_terminal_profile_wsl`).
- Viewer spec: `docs/VIEWER_SPEC.md`
- Japanese README: `docs/ja/README.ja.md`

## Contributing
See `docs/CONTRIBUTING.md`.

## Security
See `docs/SECURITY.md`.

## License
MIT. See `LICENSE`.

## AI-Generated Code Notice
The code in this repository was generated with AI based on instructions provided by a human.
The human contributor only provided direction and review.
Because AI was used, some or all of the code may not be eligible for copyright protection.
