# Development Guide
Updated: 2026-02-18

## Scope
This guide is for day-to-day development contributors.
It defines local setup, coding workflow, quality gates, and documentation update rules.

For maintainer operations (release pipeline, CI/E2E operations, troubleshooting), see `docs/maintenance_guide.md`.

## Prerequisites
- Windows 10/11
- Node.js LTS
- Rust stable
- Tauri prerequisites

## Local Setup
From repository root:
```bash
cd app
npm install
```

Run app:
```bash
npm run tauri dev
```

Build app:
```bash
npm run tauri build
```

## Daily Workflow
1. Create a feature/fix branch from `main`.
2. Implement change with smallest practical scope.
3. Run quality checks before opening PR:
```bash
cd app
npm run check
cargo check --manifest-path src-tauri/Cargo.toml --locked
```
4. Run targeted E2E based on changed area:
- file operation changes: `npm run e2e:tauri`
- viewer changes: `npm run e2e:viewer`
- settings/config changes: `npm run e2e:settings`
5. Update docs affected by behavior or interface changes.
6. Open PR to `main`.

## Required CI Gates (PR)
The following checks must pass before merge:
- `quality / quality`
- `e2e-tauri / e2e_pr_quick`

## Documentation Policy
- Files under `development_documents/` are work-in-progress records and are not intended for GitHub publication.
- Files under `docs/` are public project documentation and must stay current.
- When behavior changes, update both:
  - English docs in `docs/`
  - Japanese docs in `docs/ja/` (or document a follow-up issue in the PR)

## Document Map
- User manual (EN): `user_manual.md`
- User manual (JA): `docs/ja/user_manual.ja.md`
- Development guide: `docs/development_guide.md`
- Maintenance guide: `docs/maintenance_guide.md`
- Viewer spec: `docs/VIEWER_SPEC.md`

## EN/JA Mapping
- User manual: `user_manual.md` <-> `docs/ja/user_manual.ja.md`
- Maintenance guide: `docs/maintenance_guide.md` <-> `docs/ja/maintenance_guide.ja.md`
- Security policy: `docs/SECURITY.md` <-> `docs/ja/SECURITY.ja.md`
- Contributing guide: `docs/CONTRIBUTING.md` <-> `docs/ja/CONTRIBUTING.ja.md`
- Release notes 0.2.0: `docs/RELEASE_NOTES_0.2.0.md` <-> `docs/ja/RELEASE_NOTES_0.2.0.ja.md`

## Coding Expectations
- Keep changes explicit and reviewable.
- Prefer module-level boundaries over large single-file edits.
- Add/adjust tests when fixing defects.
- Avoid introducing new `any` unless justified and documented.

## Troubleshooting Shortcuts
- If E2E fails due stale processes, rerun with fresh session and ensure no leftover `tauri-driver` / app process.
- If Vite port conflicts occur, terminate existing process on `1422`.
- If selector flakiness appears, stabilize E2E by waiting for visible UI states instead of fixed sleeps.
