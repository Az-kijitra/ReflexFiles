# ADR-0001: Storage Provider Boundary for External Storage Integration
Updated: 2026-02-19
Status: Proposed
Owners: ReflexFiles maintainers

## Context
ReflexFiles currently assumes local filesystem paths at command and DTO boundaries.
This coupling makes external storage integration (first target: Google Drive) risky:
- path strings are treated as both UI display and internal identity
- command modules assume local path semantics
- provider-specific security and error behavior is not isolated

Pre-Feature Gate P0-4 requires introducing a provider boundary before Google Drive implementation starts.

## Decision
Introduce a Storage Provider boundary in backend and DTO layers, with local provider as baseline.

### 1. Internal Resource Identity
Use provider-scoped identity instead of raw path as canonical internal key.

```text
ResourceRef {
  provider: "local" | "gdrive" | <future>,
  resource_id: string
}
```

- `resource_id` is provider-native (for local: normalized absolute path)
- display path is separated from internal identity

### 2. Display Path Separation
Expose user-facing path text as display-only field.

```text
EntryView {
  ref: ResourceRef,
  display_path: string,
  name: string,
  ...
}
```

- `gdrive://...` is a UI path format only
- command execution uses `ref`, not display text

### 3. Provider Interface
Define a provider contract (Rust trait) and a registry.

```text
StorageProvider
  list(ref, options) -> entries
  stat(ref) -> metadata
  read_text(ref, options)
  read_image(ref, options)
  open_ref(ref)
  ... (capability-gated)
```

- `ProviderRegistry` resolves provider from `ref.provider`
- local provider implementation is required first
- Google Drive provider must implement the same contract

### 4. Capability Flags
Operations are capability-driven per provider.

Examples:
- `can_write`
- `can_delete`
- `can_rename`
- `can_download`

UI actions must check capabilities before enabling commands.

### 5. Compatibility and Migration
Adopt staged compatibility:
- Stage A: commands accept legacy local path inputs and adapt to `ResourceRef(local, normalized_path)`
- Stage B: internal flow becomes `ResourceRef`-first
- Stage C: legacy path-only command inputs removed after migration

### 6. Security Baseline for External Providers
For Google Drive introduction:
- read-only scope first
- OAuth 2.0 Authorization Code + PKCE
- token values never logged
- tokens stored in OS credential store (not plain config)

## Consequences
Positive:
- isolates provider-specific logic and failure modes
- reduces regression risk in existing local filesystem behavior
- enables controlled rollout by capability

Trade-offs:
- initial refactor cost across command/DTO boundaries
- temporary dual-input compatibility complexity during migration

## Alternatives Considered
1. Keep path-only architecture and branch by prefix (`gdrive://`)
- rejected: mixes display and identity, increases security/logic risk

2. Implement Google Drive directly in existing local commands
- rejected: high coupling, difficult testing and rollback

## Implementation Plan (Gate-aligned)
1. Add `ResourceRef` and provider field to DTOs
2. Add provider registry and local provider implementation
3. Refactor core commands to provider contract via local provider
4. Keep E2E parity for local behavior (`e2e:tauri`, `e2e:viewer`, `e2e:settings`)
5. Add provider contract tests
6. Start Google Drive read-only implementation behind feature flag

## Acceptance Criteria
- Local provider only mode passes existing E2E suite
- Legacy path calls are adapted through compatibility layer
- Security review confirms no token leakage in logs
- Threat model document for Gate 0 is reviewed (`docs/THREAT_MODEL_GDRIVE_GATE0.md`)
- Maintainer review approves this ADR before Google Drive code merges
