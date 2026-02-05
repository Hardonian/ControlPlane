# Quickstart

Get the ControlPlane contracts and tooling running locally. This tooling is designed to integrate into existing operating models and change management processes.

## Prerequisites

- Node.js 18+
- pnpm 8+

## Setup

```bash
pnpm install
pnpm run build:contracts
pnpm run build:test-kit
```

## Validate Contracts

```bash
pnpm run contract:validate
```

## Generate Compatibility Matrix

```bash
pnpm run compat:generate
```

This writes `docs/COMPATIBILITY.md` using the current package versions.

## Next Steps

- Review [Contracts Versioning](../packages/contracts/VERSIONING.md).
- Use the [Create Runner Quickstart](./CREATE-RUNNER-QUICKSTART.md) to scaffold a runner.
- Integrate `contract-test` into downstream CI pipelines.
