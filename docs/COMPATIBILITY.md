# Compatibility Matrix

> **Generated**: 2026-10-03T17:53:43.242Z
> **Contract Version**: 1.0.0

## Current Component Versions

| Component | Version | Contract Range | Status | Location |
|-------------|---------|----------------|--------|----------|
| @controlplane/benchmark | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/benchmark |
| @controlplane/contract-kit | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/contract-kit |
| @controlplane/contract-test-kit | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/contract-test-kit |
| @controlplane/contracts | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/contracts |
| @controlplane/controlplane | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/controlplane |
| @controlplane/create-runner | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/create-runner |
| @controlplane/integration-tests | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/integration-tests |
| @controlplane/observability | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/observability |
| @controlplane/optimization-utils | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/optimization-utils |
| @controlplane/sdk-generator | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | packages/sdk-generator |
| @controlplane/orchestrator | 1.0.0 | 1.0.0 - <2.0.0 | ✅ active | root |

## Contract Compatibility

| Component | Compatible Contract Versions |
|-------------|------------------------------|
| @controlplane/benchmark | 1.0.0 <= version < 2.0.0 |
| @controlplane/contract-kit | 1.0.0 <= version < 2.0.0 |
| @controlplane/contract-test-kit | 1.0.0 <= version < 2.0.0 |
| @controlplane/contracts | 1.0.0 <= version < 2.0.0 |
| @controlplane/controlplane | 1.0.0 <= version < 2.0.0 |
| @controlplane/create-runner | 1.0.0 <= version < 2.0.0 |
| @controlplane/integration-tests | 1.0.0 <= version < 2.0.0 |
| @controlplane/observability | 1.0.0 <= version < 2.0.0 |
| @controlplane/optimization-utils | 1.0.0 <= version < 2.0.0 |
| @controlplane/sdk-generator | 1.0.0 <= version < 2.0.0 |
| @controlplane/orchestrator | 1.0.0 <= version < 2.0.0 |

## Automated Checks

This matrix is automatically generated on every release. CI gates will fail if:

- Component versions drift beyond declared contract ranges
- Breaking changes are introduced in non-major versions
- Contract compatibility declarations are missing

---

**Note**: This matrix is auto-generated. Do not edit manually. Run `pnpm run compat:generate` to update.