# Security Policy

## Reporting a Vulnerability
If you believe you have found a security issue, please do not open a public issue.
Instead, use GitHub Security Advisories (preferred) or contact the maintainers
privately.

## Supported Versions
Security fixes will be applied to the latest released version.

## Response Targets
- Initial response: within 7 days
- Status update: within 14 days

## Dependency Audits
Dependency vulnerability checks should be run at least:
- before releases
- when dependencies are updated
- on a regular schedule (at least weekly)

Run (from repository root):
```bash
cd app
npm run audit:npm
npm run audit:cargo
```

Run both in one command:
```bash
cd app
npm run audit:deps
```

If `cargo audit` is not installed:
```bash
cargo install cargo-audit
```

## External Provider Baseline (Google Drive)
- Gate 0 threat model: `docs/THREAT_MODEL_GDRIVE_GATE0.md`
- Storage provider ADR: `docs/ADR-0001-storage-provider-boundary.md`
- User self-setup guide: `docs/GOOGLE_DRIVE_SELF_SETUP.md`

## Credential Ownership Model (Google Drive)
- Development may use maintainer personal Google Cloud projects.
- Public GitHub repository must not include shared Google API credentials.
- Never commit or publish:
  - API key
  - OAuth client secret
  - refresh token / access token
  - `.env` files containing credential values
- Distributed app/repository defaults must stay credential-empty.
- End users must configure their own Google Cloud OAuth client (`client_id`) with their own account/project.

## Google Drive Pre-Implementation Security Checklist (Gate 0)
Complete all items before starting Google Drive implementation work.

1. Auth flow and scope
- OAuth flow is fixed to Authorization Code + PKCE (`S256`) with `state` validation.
- Redirect URI is allowlisted and fixed.
- Scope is read-only only (no write scope enabled).

2. Token handling
- Access/refresh tokens are stored only in OS credential store.
- OAuth client secret (if user enters it) is stored only in OS credential store and never in `config.toml`.
- No plain-text fallback in config files, logs, or temporary artifacts.
- Token rotation/expiry handling behavior is documented.
- Repository and docs contain placeholders only; no real credential values.

3. Logging and diagnostics hygiene
- Never log: access token, refresh token, auth code, client secret, raw ID token.
- Diagnostic output is redacted before export/upload.
- Security test confirms no token-like strings in logs/artifacts.

4. Security gate evidence
- `npm run audit:deps` has no unresolved High/Critical findings.
- Threat model review has no unresolved High/Critical risks.
- Required PR checks (`quality`, `e2e_pr_quick`) are green.

## Implementation Start Stop Rule (Google Drive)
- If any High/Critical risk remains unresolved in threat model, dependency audit, or security review, implementation start is blocked.
- If any mandatory checklist item above is not satisfied, implementation start is blocked.
- Exception handling requires explicit maintainer approval and a documented mitigation plan with due date.
- If a PR includes any real Google credential value, merge is blocked and credentials must be rotated.
