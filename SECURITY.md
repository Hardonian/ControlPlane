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

This repository ships contracts and tooling only. There are no runtime services or hosted environments in scope. Consumers should still treat contract inputs as untrusted and validate at runtime.
