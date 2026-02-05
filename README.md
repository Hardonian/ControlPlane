# ControlPlane Contracts & Tooling

![Integration Verified](https://github.com/Hardonian/ControlPlane/actions/workflows/verify-integrations.yml/badge.svg)

- **Contract-first ecosystem**: canonical Zod schemas and versioning rules for ControlPlane-compatible services and runners.
- **Validation tooling**: CLI utilities to validate implementations against contracts and publish compatibility matrices.
- **Scaffolding utilities**: a runner generator to bootstrap new integrations.
- **Operational boundaries**: distribution configuration and policy docs that keep OSS vs. hosted features explicit.
- **Who this is for**: platform engineers, SDK authors, and contributors building ControlPlane-compatible components.

**Quickstart**: install dependencies and run the contract validation tools in minutes—see [Quick Start](#quick-start).

## Why This Exists

ControlPlane is designed as an ecosystem of services and runners that must agree on the same contracts. Without a single source of truth:

- integrations drift (schemas diverge, error envelopes change, compatibility breaks)
- downstream tooling becomes unreliable
- contributors lack a safe way to validate changes

This repository centralizes the contracts and tooling so every implementation can validate against the same source of truth before release.

## What This Project Is

- A **contracts package** (`@controlplane/contracts`) with Zod schemas, types, and error envelopes.
- A **contract test kit** (`@controlplane/contract-test-kit`) with CLI validators and registries.
- A **runner scaffolding tool** (`@controlplane/create-runner`) to generate compatible runners.
- A **ControlPlane orchestrator** (`@controlplane/controlplane`) that provides CLI + SDK integration.
- Supporting tooling for compatibility matrices, distribution configuration, and SDK generation.

## What This Project Is NOT

- It is **not** a running orchestration service.
- It does **not** include implementations of TruthCore, JobForge, or production runners.
- It is **not** a hosted ControlPlane service.
- It does **not** retain ownership of artifacts or data processed by consuming services.

## Where This Fits

ControlPlane-compatible services and runners should depend on `@controlplane/contracts` and validate with `@controlplane/contract-test-kit` as part of CI. This repository provides the shared contract authority and tooling, while service implementations live elsewhere. All artifacts, schemas, and configurations remain under the control of implementing organizations.

## Core Capabilities

- Canonical Zod schemas and type exports for ControlPlane APIs.
- Contract validation CLI and registry generation.
- Compatibility matrix generation for ecosystem components.
- Runner scaffolding via `@controlplane/create-runner`.
- Distribution configuration validation for OSS vs. hosted feature flags.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- npmjs registry for all scopes (see [Registry Configuration](./CONTRIBUTING.md#registry-configuration))

### Install + Validate Contracts

```bash
pnpm install
pnpm run build:contracts
pnpm run build:test-kit
pnpm run contract:validate
```

**Registry Configuration (required)**

Create or update `.npmrc` with:

```ini
registry=https://registry.npmjs.org/
@Hardonian:registry=https://registry.npmjs.org/
always-auth=false
```

### Verify Integrations (CLI + SDK)

```bash
pnpm run build
pnpm run test:integration
pnpm run verify-integrations
```

### Generate Compatibility Matrix

```bash
pnpm run compat:generate
```

Success indicators:
- `contract:validate` exits with code 0
- `docs/COMPATIBILITY.md` is updated

## Architecture Overview

```
packages/
  contracts/          # Canonical schemas + error envelopes
  contract-kit/       # JSON schema validation helpers
  contract-test-kit/  # CLI validation + registry tooling
  controlplane/       # ControlPlane CLI + SDK integration
  create-runner/      # Runner scaffolding generator
  observability/      # Observability contract helpers
  sdk-generator/      # SDK generation utilities
  benchmark/          # Benchmark harnesses for contracts
scripts/              # Repo-wide validation + release utilities
config/               # OSS/Cloud distribution flags
runners/              # Runner manifests + adapters
```

The contracts package is the root authority. Tooling in this repo reads those schemas to validate implementations, generate registries, and enforce version compatibility.

### Integration Architecture (ASCII)

```
ControlPlane CLI/SDK
   |--> Runner Registry (manifests)
   |--> Invocation Layer (CLI adapters)
   |--> Report Validation (contracts)
          |-> truthcore
          |-> JobForge
          |-> autopilot-suite
          |-> finops-autopilot
          |-> ops-autopilot
          |-> growth-autopilot
          |-> support-autopilot
```

## Extending the Project

### Add a New Autopilot Repo

1. Add a runner manifest in `runners/<repo>/runner.manifest.json`.
2. Implement a compatible CLI entrypoint that accepts `--input`, `--out`, and `--format json`.
3. Update `docs/reality/EXECUTION_GRAPH.md` and `docs/reality/REPO_SCAN_MATRIX.md`.
4. Run `pnpm run verify-integrations` to validate the new runner.

# Runner guardrails (mirrors CI contract checks for runner changes)
pnpm run runner:ci:check

# Run unit tests
pnpm run test

Invariants to respect:
- Contract schemas must remain backwards compatible within a major version.
- Error envelopes must stay parseable by existing clients.
- Compatibility ranges must be updated when a breaking change ships.

## Failure & Degradation Model

This repository is tooling-only. Failure modes are primarily validation-time, designed to surface issues before deployment:

- **Schema validation failures**: Zod errors with field-level diagnostics for human review.
- **Contract drift**: `compat:check` fails when package versions drift out of range.
- **Distribution mismatches**: `distribution:verify` fails when OSS/cloud flags are inconsistent.

These failures are designed to stop releases before incompatible changes ship. All validation outputs require human review before deployment decisions.

## Security & Safety Considerations

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm run build` | Build all packages |
| `pnpm run dev:stack` | Start local stack (detached) |
| `pnpm run dev:stack:logs` | Start local stack (with logs) |
| `pnpm run dev:stack:down` | Stop local stack |
| `pnpm run test` | Run unit tests |
| `pnpm run test:e2e` | Run E2E tests |
| `pnpm run test:smoke` | Run smoke tests |
| `pnpm run contract:validate` | Validate contracts |
| `pnpm run runner:ci:check` | Runner CI contract guardrails |
| `pnpm run lint` | Run linter |
| `pnpm run typecheck` | Run TypeScript checks |
| `pnpm run ci` | Full CI pipeline locally |

## Contributing

Contributions that improve contracts, validation tooling, docs, or SDK generation are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, verification, and review expectations.

## License & Governance

- Licensed under the Apache-2.0 License. See [LICENSE](./LICENSE).
- Governance and decision-making are documented in [GOVERNANCE.md](./GOVERNANCE.md).

## Additional Documentation

- [Quickstart](./docs/QUICKSTART.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Contracts Versioning](./packages/contracts/VERSIONING.md)
- [Create Runner Quickstart](./docs/CREATE-RUNNER-QUICKSTART.md)
- [Contract Upgrade Guide](./docs/CONTRACT-UPGRADE.md)
- [Compatibility Matrix](./docs/COMPATIBILITY.md)
- [Observability Contract](./docs/OBSERVABILITY-CONTRACT.md)
- [OSS vs Cloud Boundary](./docs/OSS-CLOUD-BOUNDARY.md)
- [Release Policy](./docs/RELEASE-POLICY.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
