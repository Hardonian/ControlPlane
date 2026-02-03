# Contract Upgrade Guide

How to upgrade your repository to use the canonical contracts package.

## Overview

The `@controlplane/contracts` package provides:
- Zod schemas for all request/response payloads
- TypeScript types
- Error envelopes
- Version utilities

## Upgrade Steps

### 1. Install the Package

```bash
npm install @controlplane/contracts
# or
yarn add @controlplane/contracts
# or
pnpm add @controlplane/contracts
```

### 2. Install the Test Kit (Dev Dependency)

```bash
npm install -D @controlplane/contract-test-kit
# or
yarn add -D @controlplane/contract-test-kit
# or
pnpm add -D @controlplane/contract-test-kit
```

### 3. Replace Local Schemas

Before:
```typescript
// src/types/job.ts - your local schema
export interface JobRequest {
  id: string;
  type: string;
  payload: unknown;
}
```

After:
```typescript
// src/types/job.ts
import { JobRequest } from '@controlplane/contracts';
export type { JobRequest };
```

Or use directly:
```typescript
// src/handlers/job.ts
import { JobRequest, JobResponse } from '@controlplane/contracts';
import { z } from 'zod';

export async function handleJob(request: z.infer<typeof JobRequest>) {
  // JobRequest is a Zod schema, so we can parse/validate
  const validated = JobRequest.parse(request);
  // ... handle job
}
```

### 4. Update Error Handling

Before:
```typescript
// Your custom error format
res.status(500).json({
  error: 'Something went wrong',
  code: 'ERR_001',
});
```

After:
```typescript
import { createErrorEnvelope, ErrorCategory } from '@controlplane/contracts';

const error = createErrorEnvelope({
  category: 'RUNTIME_ERROR',
  severity: 'error',
  code: 'EXECUTION_FAILED',
  message: 'Something went wrong',
  service: 'my-service',
  retryable: true,
});

res.status(500).json({ error });
```

### 5. Add Contract Tests

Create `test/contracts.spec.ts`:

```typescript
import { test, expect } from 'vitest';
import {
  ContractValidator,
  PredefinedTestSuites,
} from '@controlplane/contract-test-kit';
import { JobRequest } from '@controlplane/contracts';

test('validates against canonical contracts', () => {
  const validator = new ContractValidator();
  
  // Run predefined tests
  const { passed, failed } = validator.runTestSuite(PredefinedTestSuites[0]);
  expect(failed).toBe(0);
});

test('my custom request is valid', () => {
  const validator = new ContractValidator();
  
  const myRequest = {
    id: 'uuid',
    type: 'my.job',
    // ...
  };
  
  const result = validator.validate(JobRequest, myRequest);
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

### 6. Add CI Gate

Add to your CI workflow:

```yaml
# .github/workflows/ci.yml
- name: Contract Tests
  run: npx contract-test --json
```

Or use the test kit directly:
```yaml
- name: Contract Tests
  run: npm run test:contracts
```

### 7. Version Declaration

Add contract version to your service health endpoint:

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    contractVersion: { major: 1, minor: 0, patch: 0 },
    supportedContracts: ['^1.0.0'],
  });
});
```

## Migration Checklist

- [ ] Install `@controlplane/contracts`
- [ ] Install `@controlplane/contract-test-kit` (dev)
- [ ] Replace local schemas with imports
- [ ] Update error handling to use `ErrorEnvelope`
- [ ] Add contract test file
- [ ] Add CI gate for contract tests
- [ ] Update health endpoint with contract version
- [ ] Run full test suite
- [ ] Update documentation

## Example: Full Migration

### JobForge Migration

```typescript
// Before: src/types/index.ts
export interface Job {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'done';
  data: any;
}

// After: src/types/index.ts
export {
  JobRequest,
  JobResponse,
  JobStatus,
  JobEvent,
} from '@controlplane/contracts';

// Use in handler
import { JobRequest } from '@controlplane/contracts';

export async function createJob(req: Request, res: Response) {
  const validated = JobRequest.parse(req.body);
  // ...
}
```

### TruthCore Migration

```typescript
// Before: src/truth.ts
export interface Assertion {
  subject: string;
  predicate: string;
  object: any;
}

// After: src/truth.ts
export {
  TruthAssertion,
  TruthQuery,
  TruthQueryResult,
} from '@controlplane/contracts';
```

### Runner Migration

```typescript
// Before: src/capabilities.ts
export interface Capability {
  id: string;
  name: string;
  execute: (input: any) => any;
}

// After: src/capabilities.ts
import { RunnerCapability, RunnerExecutionRequest } from '@controlplane/contracts';

export type Capability = z.infer<typeof RunnerCapability>;

export async function execute(request: z.infer<typeof RunnerExecutionRequest>) {
  // ...
}
```

## Verifying Your Migration

Run these commands to verify:

```bash
# 1. Contract validation
npx contract-test

# 2. Type checking
npm run typecheck

# 3. Unit tests
npm test

# 4. Full integration (with stack running)
npm run test:integration
```

## Troubleshooting

### "Cannot find module '@controlplane/contracts'"

Make sure you've built the contracts package:
```bash
cd packages/contracts && pnpm run build
```

### Type errors after migration

Check that you're using Zod schemas correctly:
```typescript
// Wrong - schema is not a type
const job: JobRequest = { ... };

// Right - infer the type from the schema
const job: z.infer<typeof JobRequest> = { ... };

// Or validate and get typed result
const job = JobRequest.parse(rawData);
```

### Schema validation fails

Check your data against the schema:
```typescript
const result = JobRequest.safeParse(myData);
if (!result.success) {
  console.log(result.error.issues);
}
```

## Getting Help

- Review the [contract source](../packages/contracts/src/)
- Check [example tests](../packages/contract-test-kit/src/index.ts)
- Open an issue on GitHub
