# Maintenance Guide
Updated: 2026-02-20

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
        run-tauri-capability-selenium.mjs
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
- `e2e:capability` -> provider capability guard flow (menu/context/action gating)
- `e2e:viewer` -> viewer behavior flow
- `e2e:settings` -> settings persistence, backup/report, undo/redo checks
- `e2e:full` -> sequential suite (`smoke` -> `capability_guard` -> `viewer_flow` -> `settings_session`)

### Commands
From `app/`:
```bash
npm run e2e:tauri
npm run e2e:capability
npm run e2e:viewer
npm run e2e:settings
npm run e2e:full
```

### Runner behavior and stability controls
`app/scripts/e2e/run-tauri-selenium.mjs`:
- Starts `tauri-driver`
- Chooses bootstrap mode:
  - `existing-binary + vite-dev` when debug EXE exists
  - fallback to `tauri dev` otherwise
- On Windows, proactively terminates lingering `vite dev` node processes in this repo before app startup
- Waits for app readiness on `localhost:1422` equivalents
- Executes Selenium scenario
- Performs aggressive child-process shutdown on Windows to avoid stale process hangs

## Provider Capability Enforcement
- `fs_get_capabilities` is the backend API to fetch provider capabilities for a target path.
- `fs_get_capabilities_by_ref` is the ResourceRef-first API for provider capability lookup (Gate 1 migration path).
- Current UI uses `fs_get_capabilities_by_ref` for `gdrive://` paths and falls back to `fs_get_capabilities(path)` for local paths.
- Current UI also uses ResourceRef-first commands for gdrive path handling:
  - `fs_list_dir_by_ref`
  - `fs_get_properties_by_ref`
- Frontend stores current-path capabilities and uses them to gate:
  - blank context menu (`New...`, `Paste`)
  - Edit menu (`Paste`)
  - keyboard actions (`new_file`, `paste`)
- Entry-level capabilities (`entry.capabilities`) remain the source for selection-based actions (`copy/move/delete/rename/zip`).
- If an action is denied by capability, UI shows `capability.not_available` instead of executing the operation.
- Google Drive read-only backend skeleton is available behind Rust feature flag `gdrive-readonly-stub` (default: disabled).
- Validate both variants when touching provider-boundary logic:
```bash
cargo check --manifest-path app/src-tauri/Cargo.toml --locked
cargo test --manifest-path app/src-tauri/Cargo.toml --locked
cargo check --manifest-path app/src-tauri/Cargo.toml --locked --features gdrive-readonly-stub
cargo test --manifest-path app/src-tauri/Cargo.toml --locked --features gdrive-readonly-stub
```

### Suite summary and failure classification
`app/scripts/e2e/run-tauri-suite-selenium.mjs` now writes:
- suite-level `summary.json`
- `failureOverview` section when failed
- per-case `failureCategory` values such as:
  - `smoke_flow_failed`
  - `capability_guard_failed`
  - `viewer_flow_failed`
  - `settings_session_failed`
  - `runner_spawn_error`

### Artifacts (fixed per case in suite mode)
When running from `app/`, artifacts are written under repository root:
- Single-case runs: `e2e_artifacts/<case>_<id>/...`
- Suite run summary: `e2e_artifacts/suite_<timestamp>/summary.json`
- Suite case artifacts: `e2e_artifacts/suite_<timestamp>/cases/<case>/...`

## CI Integration
Workflow file:
- `.github/workflows/quality.yml`
- `.github/workflows/e2e-tauri.yml`
- `e2e-tauri.yml` trigger is `pull_request` only.

Current CI split:
- **Quality gate (PR/Push)**:
  - `npm run check`
  - `cargo check`
  - `cargo test`
- **Gate 1 stub probe (manual/nightly, non-blocking)**:
  - `cargo check --features gdrive-readonly-stub`
  - `cargo test --features gdrive-readonly-stub`
- **Dependency audit (nightly/manual)**:
  - `npm run audit:deps`
- **Pull Request** job (quick):
  - runs `e2e:tauri` + `e2e:capability` + `e2e:viewer`
- `e2e:full` is not executed by GitHub Actions. Run it manually when needed.

E2E quick job:
- run on `windows-latest`
- install Node + Rust + `tauri-driver`
- install matching `msedgedriver`
- build debug app
- upload `e2e_artifacts/**`

## Test Governance Policy (Priority and Fallback)
Core principle:
- Tests exist to protect application quality.
- "Keeping tests green" is not the final goal by itself.
- Product quality is mandatory, but must be ensured by multiple controls (tests, architecture boundaries, code review, logging, and operation rules).

Execution policy:
- Keep PR required checks focused on stable quality gates (`quality`, `e2e_pr_quick`).
- Treat `e2e:full` as manual regression observation, not a merge blocker.
- Prefer fixing product-risk defects first, then test instability.

Timebox and escalation policy:
- If E2E trial-and-error for the same failure category exceeds `45 minutes`, stop deep debugging and present alternatives.
- If the same failure category reproduces `2` consecutive times in CI, present alternatives immediately.
- Alternatives must include:
  - what to change
  - quality impact/risk
  - recommended option

Recommended fallback options:
1. Temporarily remove flaky suite from required checks and keep it as monitoring.
2. Split one unstable E2E scenario into smaller integration tests + a short manual acceptance checklist.
3. Add stronger runtime validation (logs/diagnostics/guardrails) for the risky behavior while E2E is stabilized.

## Release Precheck (One Command)
From `app/`:
```bash
npm run release:precheck
```

This command executes:
1. `npm run check`
2. `npm run e2e:full`
3. `npm run tauri build`
4. SHA256 generation for latest NSIS installer

Output report:
- `docs/RELEASE_PRECHECK_LAST.md`

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
- verify suite `summary.json` exists and all cases pass
4. Before release publication
- run `npm run release:precheck`
- verify `docs/RELEASE_PRECHECK_LAST.md`

## Troubleshooting
### `os error 5` when building/running Tauri in tests
Symptoms:
- `failed to remove ... ReflexFiles.exe` / Access denied
Actions:
- ensure old ReflexFiles processes are terminated
- use E2E runner with `E2E_TAURI_KILL_APP=1`

### `Port 1422 is already in use` in suite runs
Symptoms:
- app startup fails in a later case with Vite port conflict
Actions:
- keep `E2E_TAURI_KILL_APP=1` enabled
- keep `E2E_TAURI_KILL_VITE_DEV=1` (default) enabled
- verify runner logs include startup/shutdown port cleanup lines

### E2E stalls after a scenario
Actions:
- inspect runner logs for:
  - `shutdown start...`
  - `shutdown complete.`
- inspect suite `summary.json` and `failureOverview`
- inspect case artifact directory: `e2e_artifacts/suite_<timestamp>/cases/<case>/`

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
- `docs/ADR-0001-storage-provider-boundary.md`
- `docs/ja/ADR-0001-storage-provider-boundary.ja.md`
- `docs/THREAT_MODEL_GDRIVE_GATE0.md`
- `docs/ja/THREAT_MODEL_GDRIVE_GATE0.ja.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_0.2.0.md`
- `docs/RELEASE_BODY_0.2.0.md`
- `docs/CONTRIBUTING.md`
- `docs/SECURITY.md`
