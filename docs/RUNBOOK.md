# Runbook (Contracts & Tooling)

This runbook covers routine maintenance tasks for this repository.

## Update Contracts

1. Modify schemas in `packages/contracts/src`.
2. Run `pnpm run build:contracts`.
3. Run `pnpm run contract:validate`.
4. Update compatibility matrix via `pnpm run compat:generate`.

## Release Preparation

1. Run `pnpm run verify`.
2. Ensure compatibility matrix is current.
3. Merge changes into `main` and allow CI release automation.

## Investigate Compatibility Drift

```bash
pnpm run compat:check
```

Resolve warnings by adjusting versions or compatibility ranges.

## Investigate Distribution Config Issues

```bash
pnpm run distribution:verify
```

## Incident Response

- Revert breaking contract changes immediately.
- Notify downstream maintainers with the version and impact scope.
