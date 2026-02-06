# Deployment & Operations

This repository ships contracts and tooling only. There are no hosted services to deploy, but you can run the CLI tooling locally or in CI.

## Local Usage

```bash
pnpm install
pnpm run build
pnpm run contract:validate
```

## Demo Mode (Deterministic, Offline)

Demo mode produces deterministic artifacts using the local runner adapter. It never calls external services.

```bash
pnpm run demo:reset
pnpm run demo:start
```

Artifacts are written to `demo/` (report, evidence, manifest). Use `CONTROLPLANE_DEMO_TIME` to pin a fixed timestamp.

## CI Usage

Recommended CI gates:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e:demo
pnpm run contract:validate
pnpm run compat:check
pnpm run distribution:verify
```

## Production Consumers

If you embed these tools in production pipelines:

- Lock dependency versions with `pnpm-lock.yaml`.
- Run `pnpm run secret-scan` before releases.
- Validate reports and evidence packets before ingestion.
