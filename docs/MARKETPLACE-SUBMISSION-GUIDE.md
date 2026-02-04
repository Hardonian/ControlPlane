# Marketplace Submission Guide

This guide explains how to publish runners and connectors to the ControlPlane Marketplace.

## Overview

The ControlPlane Marketplace is a **read-only, trust-verified** registry of pluggable runners and connectors. All submissions undergo automated validation and security scanning before being discoverable.

## Submission Requirements

### 1. Basic Metadata

Every marketplace item must provide:

```typescript
{
  id: "unique-identifier",
  name: "Human Readable Name",
  version: "1.0.0",
  description: "What this does (max 200 chars)",
  author: {
    name: "Your Name",
    email: "you@example.com",
    organization?: "Your Org"
  },
  license: "MIT" | "Apache-2.0" | "BSD-3-Clause" | "GPL-3.0" | "Proprietary",
  repository: {
    url: "https://github.com/your/repo",
    type: "git",
    branch: "main"
  }
}
```

### 2. Contract Compliance

All submissions **must**:

- [ ] Use the latest `@controlplane/contracts` package
- [ ] Pass all contract validation tests
- [ ] Implement required capability schemas
- [ ] Declare compatible contract version ranges
- [ ] Include proper error envelope handling

Run validation locally:

```bash
pnpm install @controlplane/contracts
pnpm exec contract-test
```

### 3. Testing Requirements

| Test Type | Minimum Coverage | Required |
|-----------|-----------------|----------|
| Unit Tests | 70% | Yes |
| Integration Tests | Core flows | Yes |
| Contract Tests | 100% pass | Yes |
| E2E Tests | Major user paths | Recommended |

### 4. Documentation Requirements

- [ ] `README.md` with installation and usage instructions
- [ ] API documentation (typedoc/jsdoc)
- [ ] Configuration examples
- [ ] Changelog (following Keep a Changelog format)
- [ ] Security policy (for official/verified publishers)

### 5. Security Requirements

All submissions are automatically scanned for:

- **Critical vulnerabilities** (must fix)
- **High-risk dependencies** (must address)
- **Secrets leakage** (automatic rejection)
- **Supply chain risks** (flagged for review)

Security scan status appears in marketplace trust signals.

## Trust Levels

| Level | Badge | Requirements |
|-------|-------|--------------|
| **Verified** | ✓ | Passing all tests + security scan + automated CI verification |
| **Pending** | ⏳ | Submitted, awaiting verification or partial test results |
| **Community** | ○ | Published without automated verification (buyer beware) |
| **Unverified** | ? | No trust signals available |
| **Failed** | ✗ | Failed tests or security scan (hidden by default) |

## Submission Process

### Step 1: Prepare Your Package

```bash
# 1. Create your runner/connector following the runner guide
cd packages/create-runner
pnpm exec create-runner

# 2. Implement capabilities with proper schemas
# 3. Add comprehensive tests
# 4. Document thoroughly
```

### Step 2: Validate Locally

```bash
# Run all validation checks
pnpm run contract:validate
pnpm run test
pnpm run typecheck
pnpm run lint

# Build marketplace index locally
pnpm exec marketplace build --include-unverified --output=./marketplace-test.json
```

### Step 3: Submit for Review

Submit via the CLI:

```bash
pnpm exec marketplace submit \
  --id=my-runner \
  --type=runner \
  --repository=https://github.com/your/repo \
  --author="Your Name <you@example.com>"
```

Or via PR to the marketplace registry repository:

1. Fork the registry repository
2. Add your submission to `submissions/pending/`
3. Include `marketplace.json` metadata file
4. Submit PR with description of your runner/connector

### Step 4: Automated Verification

Once submitted, automated checks run:

1. **Schema validation** (2 min)
2. **Contract tests** (5 min)
3. **Security scan** (10 min)
4. **Integration tests** (15 min)

### Step 5: Review & Publish

- **Automated pass**: Published immediately with "verified" badge
- **Issues found**: PR review with feedback
- **Critical issues**: Rejected with remediation guidance

## Versioning & Compatibility

### Semantic Versioning

Follow SemVer for all releases:

- `MAJOR`: Breaking changes (requires contract update)
- `MINOR`: New capabilities (backwards compatible)
- `PATCH`: Bug fixes (backwards compatible)

### Compatibility Ranges

Declare supported ControlPlane contract versions:

```typescript
{
  compatibility: {
    minContractVersion: { major: 1, minor: 0, patch: 0 },
    maxContractVersion: { major: 1, minor: 5, patch: 0 },
    testedWith: [
      { 
        contractVersion: { major: 1, minor: 2, patch: 0 },
        testedAt: "2024-01-15T10:00:00Z",
        result: "compatible"
      }
    ]
  }
}
```

### Deprecation Policy

To deprecate a marketplace item:

1. Mark as deprecated in metadata
2. Provide migration guide URL
3. Specify replacement ID (if applicable)
4. Maintain for 6 months before delisting

```typescript
{
  deprecation: {
    isDeprecated: true,
    deprecationDate: "2024-06-01T00:00:00Z",
    replacementId: "new-runner-id",
    migrationGuide: "https://docs.example.com/migration",
    reason: "Superseded by new-runner-id with better performance"
  }
}
```

## Trust Signals Explained

### Contract Test Status

- **Passing**: All contract validation tests pass
- **Failing**: One or more tests failed
- **Not Tested**: No automated tests submitted
- **Stale**: Last test run > 30 days ago

### Security Scan Status

- **Passed**: No critical/high vulnerabilities
- **Failed**: Critical or high-risk issues found
- **Pending**: Scan in progress
- **Not Scanned**: Awaiting security review

### Verification Methods

- **Automated CI**: Passed all automated pipeline checks
- **Manual Review**: Verified by ControlPlane maintainers
- **Community Verified**: Multiple community members vouch for it
- **Official Publisher**: Published by ControlPlane or trusted partner

## Best Practices

### Runner Design

1. **Stateless**: Store state in TruthCore, not locally
2. **Idempotent**: Same input = same output
3. **Observable**: Emit progress events
4. **Resilient**: Handle failures gracefully
5. **Secure**: No secrets in logs or errors

### Connector Design

1. **Health-checkable**: Implement health endpoints
2. **Configurable**: Externalize all settings
3. **Monitored**: Track connection metrics
4. **Fail-fast**: Validate config on startup
5. **Pool-friendly**: Support connection pooling

### Documentation

```markdown
# My Runner

## Overview
Brief description of what this runner does.

## Installation
\`\`\`bash
npm install @myorg/my-runner
\`\`\`

## Configuration
\`\`\`json
{
  "endpoint": "https://api.example.com",
  "timeout": 30000
}
\`\`\`

## Capabilities
- capability-one: Description
- capability-two: Description

## Trust Signals
- Contract Tests: ✓ Passing
- Security Scan: ✓ Passed
- Verified: ✓ Yes

## Changelog
See [CHANGELOG.md](./CHANGELOG.md)
```

## FAQ

**Q: Can I publish proprietary/commercial runners?**  
A: Yes. License field accepts "Proprietary". Note that closed-source runners cannot be fully verified.

**Q: How long does verification take?**  
A: Automated verification: ~30 minutes. Manual review: 2-5 business days.

**Q: Can I update my submission?**  
A: Yes. New versions go through the same verification process.

**Q: What if my submission fails?**  
A: You'll receive detailed feedback. Fix issues and resubmit.

**Q: Are there fees?**  
A: No fees for open-source submissions. Commercial submissions may require partnership agreement.

**Q: Can I delist my runner?**  
A: Yes. Submit a delisting request via PR or email.

## Support

- **Documentation**: [docs.controlplane.io](https://docs.controlplane.io)
- **Discord**: [ControlPlane Discord](https://discord.gg/controlplane)
- **Issues**: GitHub issues on the registry repo
- **Email**: marketplace@controlplane.io

## Quick Reference

```bash
# Build marketplace index locally
pnpm exec marketplace build --env=development

# Query marketplace
pnpm exec marketplace query --type=runner --trust=verified

# Start marketplace API
pnpm exec marketplace serve --port=3001

# Validate submission
pnpm exec contract-test --strict
```
