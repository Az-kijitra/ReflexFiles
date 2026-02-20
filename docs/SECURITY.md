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
