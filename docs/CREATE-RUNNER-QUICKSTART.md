# Create a Runner in 15 Minutes

Get your first ControlPlane runner up and running quickly.

## Prerequisites

- Node.js 18+ and pnpm 8+
- Docker and Docker Compose (for full stack)
- Basic TypeScript knowledge

## Quick Start

### 1. Scaffold Your Runner (2 min)

```bash
# Install create-runner globally
npm install -g @controlplane/create-runner

# Create a new runner
create-runner my-first-runner --template queue-worker

# Or use interactive mode
create-runner my-first-runner --interactive
```

### 2. Install Dependencies (1 min)

```bash
cd my-first-runner
pnpm install
```

### 3. Configure Environment (2 min)

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
# The defaults work for local development
```

### 4. Start Development Server (2 min)

```bash
# Start the runner
pnpm run dev

# In another terminal, check health
curl http://localhost:3000/health
```

### 5. Run Contract Tests (2 min)

```bash
# Validate against ControlPlane contracts
pnpm run contract:test
```

### 6. Test Job Execution (3 min)

```bash
# Submit a test job
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "test-job",
    "payload": {"test": true},
    "priority": 1,
    "maxRetries": 3,
    "timeout": 60000,
    "createdAt": "2024-03-15T10:00:00Z",
    "contractVersion": {"major": 1, "minor": 0, "patch": 0}
  }'
```

### 7. Integrate with ControlPlane (3 min)

```bash
# Start the full ControlPlane stack
cd /path/to/controlplane
pnpm run dev:stack

# Your runner will automatically register with JobForge
# Check the runner registry
curl http://localhost:8080/runners
```

## Template Options

### Queue Worker Runner

Processes jobs from a Redis queue. Best for:
- Background job processing
- Batch operations
- Long-running tasks

```bash
create-runner my-worker --template queue-worker
```

**Features:**
- Redis queue integration
- Automatic job polling
- Heartbeat to JobForge
- Graceful shutdown

### HTTP Connector Runner

Connects to external APIs. Best for:
- External API integration
- Webhook processing
- Third-party connectors

```bash
create-runner my-connector --template http-connector
```

**Features:**
- External API client
- Health check for dependencies
- Configurable endpoints
- Automatic retry logic

## Customizing Your Runner

### 1. Add Custom Job Types

Edit `src/index.ts`:

```typescript
// Add custom job handler
async function executeJob(job) {
  switch (job.type) {
    case 'my-custom-job':
      return await handleCustomJob(job.payload);
    case 'data-processing':
      return await processData(job.payload);
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
```

### 2. Add Metrics

```typescript
import { MetricsCollector, METRIC_NAMES } from '@controlplane/observability';

const metrics = new MetricsCollector();

// Track custom metrics
metrics.increment('custom_jobs_completed', {
  job_type: job.type,
  status: 'success'
});
```

### 3. Add Logging

```typescript
import { createLogger } from '@controlplane/observability';

const logger = createLogger({
  service: 'my-runner',
  version: '1.0.0'
});

logger.info('Processing job', { jobId: job.jobId });
```

### 4. Configure Capabilities

Edit `CAPABILITY.md` to document what your runner can do:

```json
{
  "capabilities": ["execute", "stream"],
  "supportedJobTypes": ["my-custom-job", "data-processing"],
  "maxConcurrentJobs": 5
}
```

## Testing

### Unit Tests

```bash
pnpm run test
```

### Contract Tests

```bash
# Validate against ControlPlane schemas
pnpm run contract:test

# Or run all tests
pnpm run test:e2e
```

### Integration Tests

Start the full stack:

```bash
# Terminal 1: Start ControlPlane
cd /path/to/controlplane
pnpm run dev:stack

# Terminal 2: Start your runner
cd my-first-runner
pnpm run dev

# Terminal 3: Submit jobs and verify
curl -X POST http://localhost:8080/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test-job",
    "payload": {"data": "test"}
  }'
```

## Deployment

### Docker

```bash
# Build Docker image
docker build -t my-first-runner .

# Run container
docker run -p 3000:3000 \
  -e JOBFORGE_URL=http://jobforge:8080 \
  my-first-runner
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-first-runner
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-first-runner
  template:
    spec:
      containers:
      - name: runner
        image: my-first-runner:latest
        ports:
        - containerPort: 3000
        env:
        - name: JOBFORGE_URL
          value: "http://jobforge:8080"
```

## Next Steps

- [Runner Guide](./RUNNER-GUIDE.md) - Detailed runner development
- [Observability Contract](./OBSERVABILITY-CONTRACT.md) - Logging and metrics
- [Contract Test Kit](../packages/contract-test-kit/README.md) - Testing utilities
- [Release Policy](./RELEASE-POLICY.md) - Versioning and releases

## Troubleshooting

### Runner not registering with JobForge

Check:
1. JOBFORGE_URL environment variable
2. Network connectivity: `curl $JOBFORGE_URL/health`
3. Runner logs for errors

### Contract tests failing

```bash
# Check contract version compatibility
pnpm run compat:check

# Update contracts package
pnpm add @controlplane/contracts@latest
```

### Health check failing

```bash
# Check runner health
curl http://localhost:3000/health

# Check dependencies (Redis, external APIs)
redis-cli ping
curl $EXTERNAL_API_URL/health
```

## Support

- [Open an issue](https://github.com/Hardonian/ControlPlane/issues)
- [Runbook](./RUNBOOK.md) - Operational troubleshooting
- [Contract Documentation](../packages/contracts/README.md)
