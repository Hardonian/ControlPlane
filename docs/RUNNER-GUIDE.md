# Runner Guide (Contracts & Tooling)

This guide explains how to build a ControlPlane-compatible runner using the contracts and tooling in this repository. The runtime services that consume these runners live in separate repositories.

## What a Runner Is

A runner is an external service that:

- uses `@controlplane/contracts` for payload validation
- exposes capability metadata that can be registered elsewhere
- emits structured error envelopes on failure

## Scaffold a Runner Locally

Build the scaffolding tool, then run it:

```bash
pnpm install
pnpm --filter @controlplane/create-runner build
node packages/create-runner/bin/create-runner.js
```

This creates a new runner project with:

- contract-aware request/response types
- validation stubs
- example tests

## Validate Your Runner Contracts

In the generated runner repository, add a dependency on the contracts and test kit, then run:

```bash
pnpm add @controlplane/contracts @controlplane/contract-test-kit
pnpm exec contract-test
```

`contract-test` validates that your payloads and error envelopes match the canonical schemas.

## Common Integration Patterns

- **Capabilities**: describe the runner’s supported capabilities with schemas and metadata.
- **Error handling**: emit `ErrorEnvelope` objects when work fails.
- **Versioning**: keep contract versions in sync with `@controlplane/contracts`.

## Mistakes to Avoid

- Skipping runtime validation of incoming payloads.
- Shipping breaking changes without updating compatibility ranges.
- Returning unstructured errors instead of `ErrorEnvelope` objects.

## Related Docs

- [Create Runner Quickstart](./CREATE-RUNNER-QUICKSTART.md)
- [Contracts Versioning](../packages/contracts/VERSIONING.md)
- [Contract Upgrade Guide](./CONTRACT-UPGRADE.md)
