# Evidence Pack

## Commands Run

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run secret-scan
pnpm exec playwright test tests/e2e/contract-test-kit.api.spec.ts
pnpm run test:smoke
```

## Before/After Failure List

### Before
- `pnpm install` emitted warnings about missing `packages/controlplane/dist/cli.js` bin files before build.
- `pnpm run lint` reported `@typescript-eslint/no-explicit-any` warnings in `sdk-generator`, `observability`, and `benchmark` packages.
- `pnpm run typecheck` failed after the initial typings changes in SDK generator/benchmark CLI due to optional Zod type handling and CLI option unions.

### After
- `pnpm run lint` passes with zero warnings (lint now fails on warnings).
- `pnpm run typecheck` passes across all packages.
- `pnpm run test` passes across all packages.
- `pnpm run build` succeeds for all packages.
- `pnpm run secret-scan` passes.
- `pnpm exec playwright test tests/e2e/contract-test-kit.api.spec.ts` passes (global setup warns if services are unreachable).
- `pnpm run test:smoke` passes with all checks skipped when services are absent.

## What Changed and Why

- Removed `any`-based typings in the SDK generator, observability middleware, and benchmark CLI to meet strict TypeScript rules and enable CI linting on warnings.
- Hardened runner templates with request IDs, structured logging, rate limiting, and safe error envelopes to reduce hard-500s.
- Added CI dependency audit and test artifact uploads.
- Added an e2e Playwright test for the contract-test-kit CLI JSON output.
- Added deployment/security documentation and `.env.example` to keep configuration and security posture consistent.

## Reproduce Tests

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

## Notes

- E2E API tests require running TruthCore/JobForge/Runner services; they are not started automatically.
