# ControlPlane Reality Map

> Auto-generated system map. Single source of truth for the multi-repo orchestration topology.

## CLI Entrypoints

| Command | Package | Description |
|---------|---------|-------------|
| `controlplane doctor` | `@controlplane/controlplane` | Aggregated health check across all discovered runners |
| `controlplane list` | `@controlplane/controlplane` | List all discovered runner manifests |
| `controlplane run <runner>` | `@controlplane/controlplane` | Execute a single runner with input/output |
| `controlplane plan` | `@controlplane/controlplane` | Dry-run: discover runners, validate contracts, print plan |
| `controlplane run --smoke` | `@controlplane/controlplane` | Execute all runners with golden fixture, validate outputs |
| `controlplane verify-integrations` | `@controlplane/controlplane` | Run all runners against golden fixture, assert schemas |
| `contract-test` | `@controlplane/contract-test-kit` | Validate all contract schemas |
| `contract-sync` | `@controlplane/contract-test-kit` | Sync schemas to implementations |
| `capability-registry` | `@controlplane/contract-test-kit` | Generate capability registry |

## Module Discovery Logic

1. **Primary path**: `<repoRoot>/runners/*/runner.manifest.json`
2. **Fallback path**: `<repoRoot>/.cache/repos/*/runner.manifest.json`
3. Each manifest is validated against `contracts/runner.manifest.schema.json`
4. Returns array of `RunnerRecord` objects with `source` path

## Invocation Graph

```
User
 └─ controlplane plan|run|doctor
     └─ Registry (packages/controlplane/src/registry/)
         ├─ Scan runners/ directory
         ├─ Parse runner.manifest.json per runner
         └─ Validate manifest schema
     └─ Invoker (packages/controlplane/src/invoke/)
         ├─ Write input JSON to temp file
         ├─ Build command: runner.entrypoint.command + args + --input + --out + --format
         ├─ spawn() child process (shell: false)
         ├─ Capture stdout/stderr with secret redaction
         ├─ Enforce timeout (SIGTERM)
         └─ Read output JSON report
     └─ Validator (packages/contract-kit/)
         ├─ validateReport(report) → ValidationResult
         ├─ validateEvent(event) → ValidationResult
         ├─ validateRunnerManifest(manifest) → ValidationResult
         ├─ validateCliSurface(surface) → ValidationResult
         ├─ validateEvidencePacket(evidence) → ValidationResult
         ├─ validateModuleManifest(module) → ValidationResult
         └─ validateAuditTrail(auditTrail) → ValidationResult
```

## Registered Runners

| Runner | Version | Capabilities | Entrypoint |
|--------|---------|-------------|------------|
| truthcore | 0.1.0 | adapter, dry-run | `node scripts/adapters/runner-adapter.mjs --runner truthcore` |
| JobForge | 0.1.0 | adapter, dry-run | `node scripts/adapters/runner-adapter.mjs --runner JobForge` |
| ops-autopilot | 0.1.0 | adapter, dry-run | `node scripts/adapters/runner-adapter.mjs --runner ops-autopilot` |
| finops-autopilot | 0.1.0 | adapter, dry-run | `node scripts/adapters/runner-adapter.mjs --runner finops-autopilot` |
| growth-autopilot | 0.1.0 | adapter, dry-run | `node scripts/adapters/runner-adapter.mjs --runner growth-autopilot` |
| support-autopilot | 0.1.0 | adapter, dry-run | `node scripts/adapters/runner-adapter.mjs --runner support-autopilot` |
| autopilot-suite | 0.1.0 | adapter, dry-run | `node scripts/adapters/runner-adapter.mjs --runner autopilot-suite` |
| aias | 0.1.0 | adapter, dry-run, audit-trail | `node scripts/adapters/runner-adapter.mjs --runner aias` |

## Evidence / Artifact Paths

- **Input temp files**: `<repoRoot>/controlplane-input-<timestamp>.json`
- **Runner reports**: `<repoRoot>/<runner>-report.json` (default) or `--out <path>`
- **Integration results**: `<repoRoot>/test-results/<runner>-report.json`
- **Evidence packets**: `<repoRoot>/artifacts/<runner>/<timestamp>/evidence.json`
- **Logs**: Structured JSON to stdout/stderr with secret redaction

## Package Dependency Graph

```
@controlplane/contracts (Zod schemas - source of truth)
 └─ @controlplane/contract-kit (lightweight validators from JSON schemas)
     └─ @controlplane/controlplane (CLI + SDK)
         └─ @controlplane/contract-test-kit (CLI testing tools)
             └─ @controlplane/integration-tests
```

## Contract Schemas

| Schema | Location | Purpose |
|--------|----------|---------|
| Runner Manifest | `contracts/runner.manifest.schema.json` | Validate runner registration |
| Event Envelope | `contracts/events.schema.json` | Validate structured log events |
| Report Envelope | `contracts/reports.schema.json` | Validate runner output reports |
| CLI Surface | `contracts/cli.schema.json` | Validate CLI command surface |
| Evidence Packet | `contracts/evidence.schema.json` | Validate evidence/artifact bundles |
| Module Manifest | `contracts/module.manifest.schema.json` | Validate module discovery manifests |
| Audit Trail | `contracts/audit-trail.schema.json` | Validate audit trail entries from compliance runners |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | No | Environment identifier |
| `CONTROLPLANE_OFFLINE` | No | Skip external repo cloning |
| `CP_SMOKE_ALLOW_MISSING` | No | Allow missing services in smoke tests |
| `GITHUB_TOKEN` | No | GitHub access for workflow automation |
| `TRUTHCORE_URL` | No | TruthCore base URL for e2e tests |
| `JOBFORGE_URL` | No | JobForge base URL for e2e tests |
| `RUNNER_URL` | No | Runner base URL for e2e tests |
| `RATE_LIMIT_WINDOW_MS` | No | Template runner rate-limit window (ms) |
| `RATE_LIMIT_MAX` | No | Template runner max requests per window |
