# Security Policy

## Supported Versions

We support the latest release on the default branch. Security fixes are applied to supported releases when possible. Organizations should evaluate releases against their own security and compliance requirements.

## Reporting a Vulnerability

Please **do not** open public issues for security reports.

Instead, use GitHub's private vulnerability reporting:

1. Go to the repository **Security** tab.
2. Click **Report a vulnerability**.
3. Provide details and reproduction steps.

If private reporting is not available, contact the maintainers via the preferred channel listed in [SUPPORT.md](./SUPPORT.md).

## Response Expectations

- **Acknowledgement**: within 72 hours
- **Initial assessment**: within 7 days
- **Resolution plan**: shared once impact is confirmed

Organizations should apply their own incident response procedures when deploying these contracts and tooling in production environments.

## Security Scope

This repository ships contracts and tooling only. There are no runtime services or hosted environments in scope. Consumers should still treat contract inputs as untrusted and validate at runtime. The CLI and adapters run locally and do not open network listeners by default.

## Threat Model (Summary)

**Primary assets**
- Canonical contracts and schemas (`contracts/`, `packages/contracts`)
- CLI tooling outputs and runner reports (`artifacts/`, `demo/`)
- Compatibility matrix and registry outputs (`docs/COMPATIBILITY.md`, capability registry artifacts)

**Likely threats**
- Malicious or malformed runner output that breaks validation pipelines
- Contract drift leading to incompatible releases
- Supply-chain compromise (dependencies)
- Accidental secret leakage in artifacts or logs

**Mitigations**
- Schema validation and contract tests before release
- CI gates for lint, typecheck, tests, build, contract checks
- Secret scanning (`pnpm run secret-scan`)
- Output redaction for sensitive env values in CLI execution

## Webhook Notes

This repo does not expose webhook endpoints. If you implement webhooks in downstream services, ensure:
- Raw request body validation and signature verification
- Idempotency storage for replay protection
- Node.js runtime for signature verification

## Rate Limiting

There are no public HTTP endpoints in this repository. Runner templates in `packages/create-runner` include local HTTP/queue examples; apply rate limiting at the service edge (e.g., in-memory limiter for OSS, Redis/Upstash for production). Document your chosen limiter in your service’s deployment docs.

## Secrets Hygiene

- Do not commit secrets. Use `.env.example` as the canonical template.
- Run `pnpm run secret-scan` before committing.
- Avoid printing secrets to logs; CLI execution redacts configured env keys.
