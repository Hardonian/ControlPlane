# OSS vs Cloud Boundary

ControlPlane is designed to keep the open-source distribution fully functional while offering a clear, transparent cloud offering. This document defines what ships in OSS, what the hosted ControlPlane Cloud adds, and how we enforce the boundary without hidden logic or license traps.

## Principles

- **OSS stays complete:** The open-source distribution runs end-to-end without any hosted dependencies.
- **No bait-and-switch:** OSS remains Apache-2.0 with no hidden restrictions.
- **Transparent gating:** Cloud-only features are explicitly enabled via configuration, never hidden behind runtime hacks.
- **No secret logic:** OSS paths do not contain dormant cloud behaviors.

## OSS Distribution (Apache-2.0)

The OSS distribution includes everything needed to run ControlPlane on your own infrastructure:

- Contract schemas, validation tooling, and SDK generation.
- Local orchestration stack (TruthCore, JobForge, runner examples).
- Runner SDKs and the create-runner scaffolding.
- Marketplace tooling for local/owned registries.
- Observability foundations (logging, metrics, correlation IDs).

## Cloud Distribution (Hosted Add-ons)

ControlPlane Cloud is an optional hosted service that **adds** operational value while keeping OSS intact:

- Managed hosting and upgrades.
- Managed database and backups.
- Hosted dashboards and analytics.
- SLAs, on-call support, and incident response.
- Enterprise SSO and audit logs.
- Multi-region failover and disaster recovery options.

## Contract-Safe Extension Points

Extension points are explicitly supported in OSS and remain stable:

- **Runners:** Implement custom execution logic with contract schemas.
- **Connectors:** Build connectors using the contract test kit.
- **Webhooks:** Subscribe to orchestration events.
- **Marketplace:** Host or mirror registries with trust signals.
- **Observability Exporters:** Ship metrics/logs to your chosen backend.

These extension points are reflected in the distribution config so forks can lock them in without touching cloud-only code paths.

## Feature Flags and Distribution Config

Feature flags are config-driven and environment-controlled. The distribution mode is selected by:

- `CONTROLPLANE_DISTRIBUTION` (`oss` or `cloud`)
- `CONTROLPLANE_DISTRIBUTION_CONFIG` (optional path override)

The canonical configs live in:

- `config/distribution.oss.json`
- `config/distribution.cloud.json`

OSS mode requires all cloud flags to be **false**, enforced by CI via `scripts/verify-distribution.js`.

## CI Enforcement

CI runs boundary validation for both modes to ensure:

- OSS builds without cloud-only dependencies.
- Cloud configuration remains isolated and explicit.
- Feature flags are consistent and intentional.

See `.github/workflows/ci.yml` for the verification steps.
