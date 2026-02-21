# Development Guide
Updated: 2026-02-20

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
- provider capability / gating changes: `npm run e2e:capability`
- viewer changes: `npm run e2e:viewer`
- settings/config changes: `npm run e2e:settings`
5. Update docs affected by behavior or interface changes.
6. Open PR to `main`.

## Required CI Gates (PR)
The following checks must pass before merge:
- `quality / quality`
- `e2e-tauri / e2e_pr_quick`

`e2e:full` is manual-only and is not a required PR status check.

## Test Role Split
- PR merge blockers are limited to stable quality gates (`quality`, `e2e_pr_quick`).
- `e2e:full` is a manual regression check and is not used as a merge blocker.
- When tests fail, evaluate product-quality risk first. If risk is low and test flakiness is suspected, switch to an agreed alternative validation path instead of prolonged test-only debugging.

## Gate 1 Experimental Flag
- Google Drive read-only backend skeleton is controlled by Rust feature flag `gdrive-readonly-stub`.
- Default build keeps this flag disabled (local-provider behavior unchanged).
- To validate Gate 1 code path locally:
```bash
cd app
cargo check --manifest-path src-tauri/Cargo.toml --locked --features gdrive-readonly-stub
cargo test --manifest-path src-tauri/Cargo.toml --locked --features gdrive-readonly-stub
```

## Google Drive Gate 0 DoD (Definition of Done)
Use this checklist before starting Google Drive implementation work.
References:
- `docs/ADR-0001-storage-provider-boundary.md`
- `docs/THREAT_MODEL_GDRIVE_GATE0.md`

Mandatory:
1. Architecture boundary is fixed by ADR.
- ADR-0001 status is accepted, and provider boundary rules are reflected in current code.
2. Security baseline is fixed by threat model.
- Gate 0 threat model is reviewed, with no unresolved critical/high risk items.
3. Quality baseline is stable on current local-provider behavior.
- `npm run check` and `cargo check --manifest-path src-tauri/Cargo.toml --locked` pass.
- Required PR gates (`quality`, `e2e_pr_quick`) pass.
4. Capability control regression is covered.
- Non-supported provider actions are blocked in UI/commands with explicit user feedback.
- `e2e:capability` passes.
5. Secret handling rules are documented and enforceable.
- OAuth/token handling policy is documented (no token/plain secret logging, protected storage target defined).
6. Public docs are synchronized.
- Related EN docs in `docs/` and JA docs in `docs/ja/` are updated together.

Recommended:
1. Run `npm run e2e:full` manually before Gate 0 review meeting.
2. Record explicit rollback strategy for provider-related changes.
3. Prepare minimal operations checklist (incident contact, log locations, first-response steps).

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
- ADR-0001 (Storage Provider boundary, EN): `docs/ADR-0001-storage-provider-boundary.md`
- ADR-0001 (Storage Provider boundary, JA): `docs/ja/ADR-0001-storage-provider-boundary.ja.md`
- Google Drive Gate 0 threat model (EN): `docs/THREAT_MODEL_GDRIVE_GATE0.md`
- Google Drive Gate 0 threat model (JA): `docs/ja/THREAT_MODEL_GDRIVE_GATE0.ja.md`

## EN/JA Mapping
- User manual: `user_manual.md` <-> `docs/ja/user_manual.ja.md`
- Maintenance guide: `docs/maintenance_guide.md` <-> `docs/ja/maintenance_guide.ja.md`
- Security policy: `docs/SECURITY.md` <-> `docs/ja/SECURITY.ja.md`
- Google Drive Gate 0 threat model: `docs/THREAT_MODEL_GDRIVE_GATE0.md` <-> `docs/ja/THREAT_MODEL_GDRIVE_GATE0.ja.md`
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
