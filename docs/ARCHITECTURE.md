# Architecture Overview

## The "Reality Map"

ControlPlane is designed around the principle of **orchestrated truth**. The system creates a verifiable chain of execution from intent to outcome.

## Core Components

### TruthCore

The source of truth for the entire ecosystem.

- Stores assertions (subject-predicate-object triples)
- Provides query capabilities
- Maintains confidence levels
- Tracks provenance and lineage

```typescript
// Example truth assertion
{
  id: "uuid",
  subject: "job-123",
  predicate: "status",
  object: "completed",
  confidence: 1.0,
  timestamp: "2024-01-...",
  source: "runner-example"
}
```

### JobForge

The orchestration engine that manages job lifecycle.

- Accepts job submissions
- Queues and prioritizes work
- Routes to appropriate runners
- Monitors execution
- Handles retries and failures
- Records outcomes to TruthCore

Key capabilities:
- Priority-based scheduling
- Automatic retry with backoff
- Circuit breaker patterns
- Graceful degradation

### Runners

Pluggable execution modules that perform actual work.

- Self-register with JobForge
- Advertise capabilities
- Execute jobs
- Report progress
- Store results

Runner architecture:
- Stateless (state in TruthCore)
- Capability-based routing
- Health-checked
- Auto-scalable

## Data Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│ JobForge │────▶│  Queue   │
└──────────┘     └──────────┘     │ (Redis)  │
     │                            └──────────┘
     │                                   │
     │                            ┌──────▼──────┐
     │                            │   Runner    │
     │                            │  (Execute)  │
     │                            └──────┬──────┘
     │                                   │
     │                            ┌──────▼──────┐
     └────────────────────────────│  TruthCore  │
                                  │  (Store)    │
                                  └─────────────┘
```

## Execution Flow

1. **Submission**
   - Client submits job to JobForge
   - JobForge validates contract schema
   - Job enqueued with priority
   - Acknowledgment returned to client

2. **Routing**
   - JobForge polls queue
   - Matches job type to runner capability
   - Checks runner health
   - Routes to available runner

3. **Execution**
   - Runner receives job
   - Validates payload schema
   - Executes capability logic
   - Reports progress (optional)

4. **Completion**
   - Runner stores results in TruthCore
   - Runner reports completion to JobForge
   - JobForge updates job status
   - Client can query results

## Error Handling Strategy

### No Hard-500s

All errors return structured `ErrorEnvelope` objects:

```typescript
{
  id: "uuid",
  category: "TIMEOUT",
  severity: "error",
  code: "JOB_EXECUTION_TIMEOUT",
  message: "Job exceeded 30s timeout",
  retryable: true,
  retryAfter: 5000,
  contractVersion: { major: 1, minor: 0, patch: 0 }
}
```

### Retry Semantics

- **Retryable**: Temporary failures (network, timeout)
- **Non-retryable**: Permanent failures (validation, auth)
- **Backoff**: Exponential with jitter
- **Max retries**: Configurable per job

### Graceful Degradation

| Service Down | Behavior |
|-------------|----------|
| Runner | Queue for retry, alert ops |
| TruthCore | Queue results, retry write |
| JobForge | Client receives 503 with retry-after |
| Redis | Circuit breaker, degraded mode |

## Contract Authority

The `@controlplane/contracts` package is the **single source of truth** for:

- All request/response schemas (Zod)
- Event types and payloads
- Error codes and categories
- Version compatibility

Every repo validates against these contracts in CI.

## Security Model

### Least Privilege

- Services authenticate via mTLS
- Minimal required permissions per service
- No service can access another's data directly

### Validation Layers

1. Contract schema validation (edge)
2. Business logic validation (domain)
3. Database constraints (persistence)

## Scalability Patterns

### Horizontal Scaling

- **JobForge**: Multiple instances, shared Redis
- **Runners**: Auto-scaled based on queue depth
- **TruthCore**: Read replicas, sharded writes

### Backpressure

- Queue depth monitoring
- Circuit breakers on slow runners
- Priority queue for critical jobs

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│              ControlPlane Stack             │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │TruthCore│  │JobForge │  │Runner Pool  │ │
│  │(x3)     │  │(x2)     │  │(auto-scale) │ │
│  └────┬────┘  └────┬────┘  └──────┬──────┘ │
│       └─────────────┴─────────────┘        │
│                    │                       │
│  ┌─────────────────▼─────────────────┐    │
│  │           Redis Cluster           │    │
│  └───────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Monitoring & Observability

### Health Endpoints

Every service exposes:
- `GET /health` - Overall health
- `GET /health/ready` - Ready to accept traffic
- `GET /health/live` - Process is alive

### Metrics

- Request latency (p50, p95, p99)
- Queue depth
- Job completion rate
- Error rate by category
- Runner utilization

### Distributed Tracing

- Correlation IDs propagated across services
- Causation IDs track job chains
- OpenTelemetry compatible
