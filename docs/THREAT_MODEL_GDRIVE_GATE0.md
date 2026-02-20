# Google Drive Gate 0 Threat Model
Updated: 2026-02-19
Status: Draft for review
Owners: ReflexFiles maintainers

## Scope
This document defines the minimum security baseline before enabling Google Drive integration in ReflexFiles.
It applies to Gate 0 and Gate 1 preparation (design + internal validation phase).

In scope:
- OAuth sign-in flow (Authorization Code + PKCE)
- Access token / refresh token handling
- Read-only file metadata and content retrieval
- Logging, telemetry, and diagnostics
- Dependency and secret hygiene in CI

Out of scope:
- Write operations (upload, rename, delete)
- Shared drive admin policies
- Enterprise SSO customization

## Assets and Security Goals
Critical assets:
- OAuth client settings
- Access token
- Refresh token
- User file metadata/content from Google Drive

Security goals:
- Confidentiality: token values and user data are not leaked.
- Integrity: operations execute only for the authenticated account and allowed scope.
- Availability: auth/session failure does not break local filesystem features.
- Auditability: security-relevant events are traceable without exposing secrets.

## Trust Boundaries
1. ReflexFiles UI <-> Tauri backend command boundary
2. Tauri backend <-> OS credential store
3. Tauri backend <-> Google OAuth / Drive APIs
4. App runtime <-> CI logs / artifact uploads

## Threat Enumeration (STRIDE-Oriented)
### S: Spoofing
- Threat: malicious callback URI interception during OAuth flow.
- Baseline controls:
  - PKCE (`S256`) required.
  - Validate `state` and `nonce` on callback.
  - Use fixed allowlisted redirect URI only.

### T: Tampering
- Threat: modified provider identifier/path causing unintended local access.
- Baseline controls:
  - Treat `ResourceRef` as canonical internal identity.
  - Validate provider before dispatch (`local` / `gdrive` allowlist).
  - Reject unsupported provider route with explicit error.

### R: Repudiation
- Threat: inability to investigate auth misuse without sensitive logs.
- Baseline controls:
  - Log event class + correlation id + provider only.
  - Never log token values, auth code, or PII-rich payload.
  - Keep failure category in E2E/CI artifacts.

### I: Information Disclosure
- Threat: token/PII leakage via logs, config files, crash artifacts.
- Baseline controls:
  - Store tokens in OS credential store only.
  - Redact sensitive fields before writing diagnostic reports.
  - Add token-pattern scan in debug logs during security tests.

### D: Denial of Service
- Threat: external provider timeout/failure blocks entire app flow.
- Baseline controls:
  - Set per-request timeout and bounded retries.
  - Keep local filesystem operations isolated from gdrive failures.
  - Surface user-facing error without UI deadlock.

### E: Elevation of Privilege
- Threat: scope escalation to write access before security gate pass.
- Baseline controls:
  - Start with read-only scopes only.
  - Gate write scopes behind separate ADR and security review.
  - Capability flags must disable write actions in UI and backend.

## Mandatory Controls (Gate 0 Exit Criteria)
1. ADR approved for provider boundary (`docs/ADR-0001-storage-provider-boundary.md`).
2. OAuth flow fixed to Authorization Code + PKCE and `state` validation.
3. Tokens persisted only in OS credential store (no plain text config fallback).
4. Secret-safe logging policy implemented and verified.
5. Dependency audit (`npm run audit:deps`) passes with no High/Critical unresolved findings.
6. Security regression checks exist for capability gating and provider rejection.

## Verification Plan
Required evidence before Gate 1:
1. Security design review checklist signed by maintainers.
2. Test evidence:
  - `npm run check`
  - `cargo check --manifest-path app/src-tauri/Cargo.toml --locked`
  - `cargo test --manifest-path app/src-tauri/Cargo.toml --locked`
  - `npm run e2e:capability`
  - `npm run e2e:full`
3. Manual negative tests:
  - invalid callback `state` is rejected
  - logs/artifacts do not contain token-like strings
  - unsupported provider path returns explicit error and no local side effects

## Residual Risks and Follow-ups
- Refresh token rotation policy is not yet finalized.
- Incident response runbook for external provider outage is pending.
- Threat model must be re-reviewed before enabling write scopes (Gate 3).
