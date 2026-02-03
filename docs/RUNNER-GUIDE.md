# How to Add a New Runner

This guide walks you through creating a new module runner for ControlPlane.

## What is a Runner?

A runner is a service that:
- Registers itself with JobForge
- Advertises capabilities it can execute
- Receives jobs via HTTP/webhook
- Executes the requested capability
- Reports results back to JobForge/TruthCore

## Quick Start

### 1. Create Project Structure

```bash
mkdir -p services/my-runner
cd services/my-runner
npm init -y
```

### 2. Install Dependencies

```bash
npm install @controlplane/contracts zod express
npm install -D typescript @types/express @types/node
```

### 3. Create the Runner

```typescript
// src/index.ts
import express from 'express';
import { z } from 'zod';
import {
  RunnerRegistrationRequest,
  RunnerExecutionRequest,
  RunnerExecutionResponse,
  RunnerHeartbeat,
  ErrorEnvelope,
  createErrorEnvelope,
} from '@controlplane/contracts';

const app = express();
app.use(express.json());

const JOBFORGE_URL = process.env.JOBFORGE_URL || 'http://localhost:3002';
const PORT = process.env.PORT || 3000;
const RUNNER_NAME = process.env.RUNNER_NAME || 'my-runner';
const RUNNER_VERSION = '1.0.0';

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: RUNNER_NAME,
    version: RUNNER_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Execute endpoint
app.post('/execute', async (req, res) => {
  try {
    const request = RunnerExecutionRequest.parse(req.body);
    
    // Route to capability handler
    const result = await executeCapability(request);
    
    const response: RunnerExecutionResponse = {
      jobId: request.jobId,
      success: true,
      data: result,
      executionTimeMs: 0, // Calculate actual time
      runnerId: process.env.RUNNER_ID || 'unknown',
    };
    
    res.json(response);
  } catch (error) {
    const errorEnvelope = createErrorEnvelope({
      category: 'RUNTIME_ERROR',
      severity: 'error',
      code: 'EXECUTION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
      service: RUNNER_NAME,
      retryable: true,
    });
    
    res.status(500).json({
      success: false,
      error: errorEnvelope,
    });
  }
});

// Capability handlers
async function executeCapability(request: RunnerExecutionRequest): Promise<unknown> {
  switch (request.capabilityId) {
    case 'my-capability':
      return handleMyCapability(request.payload);
    default:
      throw new Error(`Unknown capability: ${request.capabilityId}`);
  }
}

async function handleMyCapability(payload: Record<string, unknown>): Promise<unknown> {
  // Your business logic here
  return { processed: true, input: payload };
}

// Registration with JobForge
async function register() {
  const registration = {
    name: RUNNER_NAME,
    version: RUNNER_VERSION,
    contractVersion: { major: 1, minor: 0, patch: 0 },
    capabilities: [
      {
        id: 'my-capability',
        name: 'My Capability',
        version: '1.0.0',
        description: 'Does something useful',
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        supportedJobTypes: ['my.job.type'],
        maxConcurrency: 5,
        timeoutMs: 30000,
        resourceRequirements: {},
      },
    ],
    healthCheckEndpoint: `http://localhost:${PORT}/health`,
    tags: ['custom', 'v1'],
  };
  
  const response = await fetch(`${JOBFORGE_URL}/runners/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registration),
  });
  
  if (!response.ok) {
    throw new Error(`Registration failed: ${response.status}`);
  }
  
  console.log('Registered with JobForge');
}

// Heartbeat
async function sendHeartbeat() {
  const heartbeat: RunnerHeartbeat = {
    runnerId: process.env.RUNNER_ID || 'unknown',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    activeJobs: 0,
    queuedJobs: 0,
    metrics: {},
  };
  
  await fetch(`${JOBFORGE_URL}/runners/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(heartbeat),
  });
}

// Start server
app.listen(PORT, async () => {
  console.log(`${RUNNER_NAME} v${RUNNER_VERSION} listening on port ${PORT}`);
  
  try {
    await register();
    setInterval(sendHeartbeat, 30000);
  } catch (error) {
    console.error('Failed to register:', error);
  }
});
```

### 4. Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### 5. Add to docker-compose.yml

```yaml
  my-runner:
    build:
      context: ./services/my-runner
      dockerfile: Dockerfile
    container_name: controlplane-my-runner
    ports:
      - "3004:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - JOBFORGE_URL=http://jobforge:3000
      - CONTRACT_VERSION=1.0.0
      - RUNNER_NAME=my-runner
      - RUNNER_ID=my-runner-001
    depends_on:
      jobforge:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - controlplane
```

### 6. Add Contract Tests

Create `test/contracts.spec.ts`:

```typescript
import { test, expect } from 'vitest';
import {
  ContractValidator,
  predefinedRunnerRegistration,
} from '@controlplane/contract-test-kit';
import {
  RunnerRegistrationRequest,
  RunnerExecutionRequest,
  RunnerExecutionResponse,
} from '@controlplane/contracts';

test('runner registration is valid', () => {
  const validator = new ContractValidator();
  const result = validator.validate(
    RunnerRegistrationRequest,
    predefinedRunnerRegistration
  );
  expect(result.valid).toBe(true);
});

test('execution request schema is valid', () => {
  const validator = new ContractValidator();
  const result = validator.validate(RunnerExecutionRequest, {
    jobId: '550e8400-e29b-41d4-a716-446655440000',
    moduleId: 'my-module',
    capabilityId: 'my-capability',
    payload: { test: true },
    timeoutMs: 30000,
  });
  expect(result.valid).toBe(true);
});
```

### 7. Build and Run

```bash
# Build
npm run build

# Start (with JobForge running)
JOBFORGE_URL=http://localhost:3002 npm start

# Test registration
curl http://localhost:3004/health
```

## Capability Manifest

Define your capabilities in the runner registration:

```typescript
{
  id: 'unique-capability-id',
  name: 'Human Readable Name',
  version: '1.0.0',
  description: 'What this does',
  inputSchema: {
    type: 'object',
    properties: {
      foo: { type: 'string' },
      bar: { type: 'number' },
    },
    required: ['foo'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'string' },
    },
  },
  supportedJobTypes: ['my.job.type'],
  maxConcurrency: 5,
  timeoutMs: 30000,
}
```

## Best Practices

### 1. Schema Validation

Always validate inputs with Zod schemas:

```typescript
const MyInputSchema = z.object({
  required: z.string(),
  optional: z.number().optional(),
});

const validated = MyInputSchema.parse(payload);
```

### 2. Error Handling

Return structured errors:

```typescript
import { createErrorEnvelope } from '@controlplane/contracts';

const error = createErrorEnvelope({
  category: 'RUNTIME_ERROR',
  severity: 'error',
  code: 'MY_ERROR_CODE',
  message: 'Something went wrong',
  service: 'my-runner',
  retryable: true, // or false
});
```

### 3. Health Checks

Implement all health endpoints:

```typescript
app.get('/health', (req, res) => {
  // Check dependencies
  const redisHealthy = checkRedis();
  const dbHealthy = checkDatabase();
  
  const status = redisHealthy && dbHealthy ? 'healthy' : 'degraded';
  
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    checks: {
      redis: redisHealthy,
      database: dbHealthy,
    },
  });
});
```

### 4. Graceful Shutdown

Handle SIGTERM/SIGINT:

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await deregisterFromJobForge();
  server.close();
  process.exit(0);
});
```

### 5. Observability

Add structured logging:

```typescript
console.log(JSON.stringify({
  level: 'info',
  message: 'Job completed',
  jobId,
  durationMs,
  timestamp: new Date().toISOString(),
}));
```

## Testing Your Runner

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start the stack
pnpm run dev:stack

# Submit a job to your runner
curl -X POST http://localhost:3002/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-job-1",
    "type": "my.job.type",
    "priority": 50,
    "payload": {
      "type": "my-capability",
      "version": "1.0.0",
      "data": { "foo": "bar" }
    }
  }'
```

### Contract Tests

```bash
# Validate your runner against contracts
pnpm run contract:validate
```

## Troubleshooting

### Registration Fails

- Check JobForge is running: `curl http://localhost:3002/health`
- Verify contract version matches
- Check network connectivity in Docker

### Jobs Not Received

- Verify runner is registered: check JobForge logs
- Ensure capability ID matches job type
- Check runner health endpoint

### Execution Errors

- Validate input schema in your handler
- Return proper ErrorEnvelope objects
- Check TruthCore connectivity
