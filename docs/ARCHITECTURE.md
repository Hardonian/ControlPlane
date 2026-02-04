# Architecture Overview

This repository defines the contracts and tooling that ControlPlane-compatible services and runners rely on. It does **not** ship runtime services.

## Core Packages

### `@controlplane/contracts`

- Canonical Zod schemas and TypeScript types.
- Error envelope utilities and shared contract versioning.
- Single source of truth for request/response shapes.

### `@controlplane/contract-test-kit`

- CLI validators (`contract-test`, `contract-sync`, `capability-registry`).
- Validation helpers for CI in downstream services.
- Compatibility reporting for ecosystem components.

### `@controlplane/create-runner`

- Scaffolds a runner implementation with correct contract usage.
- Templates for handler layout, config, and tests.

### Supporting Tooling

- `packages/observability`: shared observability contract helpers.
- `packages/sdk-generator`: SDK generation utilities.
- `scripts/`: compatibility and distribution verification utilities.
- `config/`: OSS/cloud distribution flags used by tooling.

## Ecosystem Flow (Conceptual)

```
Service/Runners --> @controlplane/contracts --> @controlplane/contract-test-kit --> CI gates
                                     \-> compatibility matrix + registries
```

The contracts package is the root authority. Tooling in this repo consumes those schemas to:

- validate implementations
- detect compatibility drift
- produce registries and matrices

## Extension Points

- **Schemas**: add or refine contracts with backwards-compatible changes.
- **CLI tooling**: extend validators or registries to suit new capabilities.
- **Templates**: expand `create-runner` scaffolding to cover new patterns.

## Failure Modes

- Schema validation errors with explicit field paths.
- Compatibility checks failing when versions drift out of range.
- Distribution checks failing on invalid OSS/cloud config.

These failures intentionally stop releases when contracts diverge.
