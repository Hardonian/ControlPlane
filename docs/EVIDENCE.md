# Evidence Pack

This document captures commands executed during the Reality Pass and the observed outputs.

## Phase 0 — Baseline (Pre-change)

### Install

```bash
pnpm install
```

Output (trimmed):

```
Scope: all 11 workspace projects
Lockfile is up to date, resolution step is skipped
Packages: +10
++++++++++
WARN Failed to create bin at /workspace/ControlPlane/packages/integration-tests/node_modules/.bin/controlplane. ENOENT: no such file or directory, open '/workspace/ControlPlane/packages/controlplane/dist/cli.js'
WARN Failed to create bin at /workspace/ControlPlane/packages/integration-tests/node_modules/.bin/controlplane. ENOENT: no such file or directory, open '/workspace/ControlPlane/packages/integration-tests/node_modules/@controlplane/controlplane/dist/cli.js'
```

### Lint

```bash
pnpm run lint
```

Result: completed with existing warnings in `@controlplane/sdk-generator`, `@controlplane/observability`, and `@controlplane/benchmark`.

### Typecheck

```bash
pnpm run typecheck
```

Result: completed successfully.

### Unit Tests

```bash
pnpm run test
```

Result: completed successfully.

### Build

```bash
pnpm run build
```

Result: completed successfully.

### Smoke Test

```bash
pnpm run test:smoke
```

Output (trimmed):

```
Smoke Test Summary
Total:     0
Passed:    0
Failed:    0
✅ All smoke tests passed!
```

## Phase 1+ — Post-change Verification

### Lint

```bash
pnpm run lint
```

Result: completed with existing warnings (unchanged).

### Typecheck

```bash
pnpm run typecheck
```

Result: completed successfully.

### Unit Tests

```bash
pnpm run test
```

Result: completed successfully.

### Build

```bash
pnpm run build
```

Result: completed successfully.

### Demo E2E Tests

```bash
pnpm run test:e2e:demo
```

Output (trimmed):

```
Running 2 tests using 1 worker
2 passed (3.6s)
```

### Secret Scan

```bash
pnpm run secret-scan
```

Result: `✅ Secret scan passed.`

## Notable Warnings / Failures

### Demo E2E (initial run before dedicated config)

```bash
pnpm run test:e2e:demo
```

Output (trimmed):

```
Error: Cannot find package '@controlplane/benchmark' imported from /workspace/ControlPlane/tests/e2e/benchmark.api.spec.ts
Error: Cannot find package '@controlplane/contracts' imported from /workspace/ControlPlane/tests/e2e/orchestration.api.spec.ts
Error: No tests found
```

Resolution: added `playwright.demo.config.ts` to isolate demo tests and avoid loading full-stack e2e specs.

### Dependency install (attempted while adjusting demo test dependencies)

```bash
pnpm install
```

Output (trimmed):

```
ERR_PNPM_FETCH_403 GET https://registry.npmjs.org/strip-ansi: Forbidden - 403
No authorization header was set for the request.
```

Resolution: reverted the dependency change so installs were no longer required for demo tests.
