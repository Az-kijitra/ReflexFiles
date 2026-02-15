# Maintenance Guide
Updated: 2026-02-15

## Scope
This document is for maintainers of ReflexFiles (not end users).
It covers architecture navigation, daily development workflow, automated E2E operation, CI integration, and release hygiene.

## Product Snapshot
- Product: ReflexFiles (Windows file manager)
- Stack: Tauri v2 + SvelteKit + Rust
- Current app version source of truth: `app/src-tauri/tauri.conf.json` (`version`)
- App identifier: `com.toshi.reflexfiles`

## Repository Layout (Maintainer View)
```text
ReflexFiles/
  app/
    src/                # Svelte UI
      routes/+page.svelte
      routes/viewer/+page.svelte
      lib/
        actions/
        components/
        effects/
        menus/
        utils/
        page_*.ts
        ui_*.ts
    src-tauri/          # Rust backend / Tauri wiring
      src/
        main.rs
        bootstrap.rs
        *_cmds.rs
        fs_ops_*.rs
        config_*.rs
        viewer_cmds.rs
        watch.rs
        log.rs
      tauri.conf.json
    e2e/tauri/
      smoke.mjs
      viewer_flow.mjs
      settings_session.mjs
    scripts/
      sync_version.mjs
      build_manual.mjs
      e2e/
        run-tauri-selenium.mjs
        run-tauri-viewer-selenium.mjs
        run-tauri-settings-selenium.mjs
        run-tauri-suite-selenium.mjs
  docs/
    maintenance_guide.md  # this file
  .github/workflows/
    e2e-tauri.yml
```

## Entry Points and Ownership
### Frontend
- Primary page shell: `app/src/routes/+page.svelte`
- Viewer page: `app/src/routes/viewer/+page.svelte`
- Recommended navigation order for UI issues:
  1. `app/src/routes/+page.svelte`
  2. `app/src/lib/actions/*`
  3. `app/src/lib/page_*` orchestration files
  4. `app/src/lib/components/*`

### Backend (Rust)
- Process entry: `app/src-tauri/src/main.rs`
- Wiring/registration: `app/src-tauri/src/bootstrap.rs`
- Command boundary: `app/src-tauri/src/*_cmds.rs`
- Implementation modules: `fs_query.rs`, `fs_ops_*.rs`, `external_apps.rs`, `clipboard.rs`, `viewer_cmds.rs`

## Configuration and Runtime Data
### User config root
- `%APPDATA%\ReflexFIles\` (note the product spelling: `ReflexFIles`)

### Main files
- Config: `%APPDATA%\ReflexFIles\config.toml`
- Legacy config (migration target): `%APPDATA%\ReflexFIles\config.json`
- History: `%APPDATA%\ReflexFIles\history.toml`
- Jump list: `%APPDATA%\ReflexFIles\jump_list.toml`
- Undo/redo session (used in E2E assertions): `%APPDATA%\ReflexFIles\undo_redo_session.json`

## Build and Run Workflow
From `app/`:
1. Install dependencies
```bash
npm install
```
2. Development run
```bash
npm run tauri dev
```
3. Production build
```bash
npm run tauri build
```

## Version Management Rules
- `app/src-tauri/tauri.conf.json` is the source of truth for app version.
- `npm run dev` and `npm run build` execute `scripts/sync_version.mjs` automatically.
- `scripts/sync_version.mjs` syncs:
  - `app/package.json` version
  - `app/src-tauri/Cargo.toml` package version

## Manual Resource Build Rules
- `scripts/build_manual.mjs` generates manual resources for app runtime/bundle.
- It is invoked by `npm run dev` and `npm run build`.
- Manual outputs are written into:
  - `app/static/`
  - `app/src-tauri/resources/`

## Automated E2E Strategy
### Test layers
- `e2e:tauri` -> smoke flow (file operations baseline)
- `e2e:viewer` -> viewer behavior flow
- `e2e:settings` -> settings persistence, backup/report, undo/redo checks
- `e2e:full` -> sequential suite (`smoke` -> `viewer_flow` -> `settings_session`)

### Commands
From `app/`:
```bash
npm run e2e:tauri
npm run e2e:viewer
npm run e2e:settings
npm run e2e:full
```

### Runtime behavior of runner
`app/scripts/e2e/run-tauri-selenium.mjs`:
- Starts `tauri-driver`
- Chooses bootstrap mode:
  - `existing-binary + vite-dev` when debug EXE exists
  - fallback to `tauri dev` otherwise
- Waits for app readiness on `localhost:1422` equivalents
- Executes Selenium scenario
- Performs aggressive child-process shutdown on Windows to avoid stale process hangs

### Artifacts
When running from `app/`, artifacts are written under repository root:
- `e2e_artifacts/<case>_<id>/...`
- `e2e_artifacts/suite_<timestamp>/summary.json`

## CI Integration
Workflow file:
- `.github/workflows/e2e-tauri.yml`

Current CI behavior:
- Runs on `windows-latest`
- Installs Node + Rust
- Installs `tauri-driver`
- Downloads matching `msedgedriver`
- Builds debug app
- Executes `npm run e2e:full`
- Uploads E2E artifacts

## Daily Maintenance Checklist
1. Run local type/consistency checks after edits
```bash
cd app
npm run check
```
2. Run targeted E2E for touched area
- viewer changes -> `npm run e2e:viewer`
- settings/config changes -> `npm run e2e:settings`
- file operation changes -> `npm run e2e:tauri`
3. Before merge/release candidate
- run `npm run e2e:full`
- verify suite summary JSON exists and all cases pass

## Troubleshooting
### `os error 5` when building/running Tauri in tests
Symptoms:
- `failed to remove ... ReflexFiles.exe` / Access denied
Actions:
- ensure old ReflexFiles processes are terminated
- use E2E runner with `E2E_TAURI_KILL_APP=1`

### E2E stalls after a scenario
Actions:
- inspect runner logs for:
  - `shutdown start...`
  - `shutdown complete.`
- verify suite summary file generation

### Viewer/UI element not found in E2E
Actions:
- verify selectors against current Svelte components
- prefer stable class selectors (e.g. `.list`, `.row .text`) over outdated structural selectors

### Tauri package mismatch
Symptoms:
- version mismatch between Rust crate and npm package
Actions:
- align major/minor versions for:
  - `app/src-tauri/Cargo.toml` (`tauri` crate)
  - `app/package.json` (`@tauri-apps/api`, `@tauri-apps/cli`)

## Change Rules for Maintainers
- Keep command wrappers in `*_cmds.rs` thin; move behavior to implementation modules.
- Keep UI behavior in `actions/` and orchestration in `page_*` files.
- Avoid hardcoding constants; centralize in `ui_*.ts` / config modules.
- Preserve backward compatibility for user config whenever feasible.

## Related Docs
- `docs/VIEWER_SPEC.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_0.2.0.md`
- `docs/RELEASE_BODY_0.2.0.md`
- `docs/CONTRIBUTING.md`
- `docs/SECURITY.md`