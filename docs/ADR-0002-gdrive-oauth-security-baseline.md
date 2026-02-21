# ADR-0002: Google Drive OAuth Security Baseline (Read-Only First)
Updated: 2026-02-21
Status: Accepted
Owners: ReflexFiles maintainers

## Context
ReflexFiles has established the provider boundary (ADR-0001) and Gate 0 threat model.
Before implementing real Google Drive API integration, we must lock security rules that are stable, testable, and reviewable.

Without fixed rules, implementation speed can create:
- token leakage risk in logs/diagnostics
- scope creep from read-only to write privileges
- weak recovery behavior during auth/session failures
- inconsistent handling across frontend/backend boundaries

## Decision
Adopt the following mandatory baseline for Google Drive OAuth and token handling.

### 1. OAuth Flow
- Use OAuth 2.0 Authorization Code + PKCE (`S256`) only.
- Require strict `state` validation on callback.
- Reject callback responses that do not match active auth session metadata.

### 2. Scope Policy (Least Privilege)
- Start with read-only scope only.
- Initial allowed scope set:
  - `https://www.googleapis.com/auth/drive.readonly`
- Any write-capable scope requires a separate ADR and security review before merge.

### 3. Token Storage Policy
- Do not store access/refresh tokens in plain config files.
- Persist refresh token only in OS-protected credential storage.
- Keep access token in memory only, and refresh as needed.
- If secure storage is unavailable, fail closed (no insecure fallback).

### 4. Logging and Diagnostics Policy
- Never log:
  - OAuth authorization code
  - access token
  - refresh token
  - raw `Authorization` header
- Redact secret-like fields in diagnostic exports.
- Keep logs actionable with:
  - provider id
  - operation class
  - error category/code
  - correlation id

### 5. Failure and Recovery Policy
- Provider auth failure must not block local filesystem features.
- On token refresh failure:
  - mark provider session invalid
  - require explicit re-authentication
  - return clear user-facing error
- Retry policy:
  - bounded retries only
  - request timeout required
  - no unbounded background loops

### 6. Branch Protection and Quality Policy
- Keep PR required checks focused on stable gates (`quality`, `e2e_pr_quick`).
- Keep `e2e:full` as non-blocking manual regression evidence.
- Security-critical behavior must be validated by:
  - unit/integration tests
  - targeted E2E where practical
  - documented manual negative checks

### 7. Credential Ownership and Publication Policy
- Development may use maintainer personal Google Cloud usage.
- Public GitHub repository must never include real Google API credentials.
- User-facing operation is BYO (Bring Your Own) Google Cloud client configuration.
- Official setup documentation:
  - `docs/GOOGLE_DRIVE_SELF_SETUP.md`
  - `docs/ja/GOOGLE_DRIVE_SELF_SETUP.ja.md`

## Consequences
Positive:
- stable and reviewable security baseline before API integration
- reduced risk of secret leakage and accidental privilege escalation
- clearer separation of product-risk fixes vs test-only instability

Trade-offs:
- some implementation options are intentionally disallowed
- secure-storage integration must be completed before production rollout

## Alternatives Considered
1. Allow temporary plain-text token storage for faster prototyping.
- Rejected: unacceptable leakage risk.

2. Request broad Drive scopes initially and reduce later.
- Rejected: violates least privilege and increases blast radius.

3. Treat `e2e:full` as required PR blocker.
- Rejected: unstable as merge gate, slows product-quality delivery.

## Implementation Plan
1. Define auth session state model and callback validator.
2. Add secure token store abstraction at provider boundary.
3. Enforce read-only scopes and reject non-allowlisted scopes.
4. Add structured redaction layer for logs and diagnostic exports.
5. Add failure taxonomy (auth/session/network/rate limit) with user-safe messages.
6. Add test coverage and manual security checklist for Gate 1 review.

## Implementation Status (2026-02-21)
- Completed:
  - Auth session state model + callback validator (`state` validation, PKCE verifier handling)
  - Secure token store abstraction (`GdriveTokenStore`)
  - Windows secure backend (`windows-credential-manager` via Credential Manager)
  - Fail-closed default on unsupported platforms
  - Read-only scope allowlist enforcement
- Remaining:
  - Structured redaction layer for logs/diagnostics
  - Failure taxonomy hardening and user-facing message alignment
  - Gate 1 security checklist and review evidence packaging

## Acceptance Criteria
- OAuth flow uses Authorization Code + PKCE and validates `state`.
- No token/plain secret appears in logs, diagnostics, or config files.
- Read-only scope is enforced in code and configuration.
- Local provider operations continue when gdrive auth fails.
- Maintainer security review approves Gate 1 entry.

## Review Decision
- Reviewed by maintainers on 2026-02-21.
- Decision: Accepted as mandatory baseline before real Google Drive API integration.
