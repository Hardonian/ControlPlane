# ControlPlane Runbook

Operational guide for diagnosing and resolving issues in the ControlPlane ecosystem.

## Quick Diagnostics

### Check System Health

```bash
# Run smoke tests
pnpm run test:smoke

# Check all services
curl http://localhost:8080/health  # JobForge
curl http://localhost:8081/health  # TruthCore
curl http://localhost:3000/health  # Your Runner
```

### View Compatibility Matrix

```bash
# Generate fresh matrix
pnpm run compat:generate

# Check for version drift
pnpm run compat:check
```

### Check Contract Validity

```bash
# Validate contracts
pnpm run contract:validate

# Run contract sync check
pnpm run contract:sync:check
```

## Common Scenarios

### 1. Service Unavailable (503)

**Symptoms**: HTTP 503 errors, health check failures  
**Causes**: Service down, dependency failure, startup delay

**Diagnosis**:
```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs jobforge
docker-compose logs truthcore

# Check health directly
curl -v http://localhost:8080/health
```

**Resolution**:
```bash
# Restart specific service
docker-compose restart jobforge

# Or restart all
docker-compose down && docker-compose up -d

# Wait for healthy
pnpm run wait:healthy
```

### 2. Contract Validation Failures

**Symptoms**: Schema validation errors, contract tests failing  
**Causes**: Version mismatch, breaking change, schema drift

**Diagnosis**:
```bash
# Check contract versions
cat packages/contracts/package.json | grep version

# Run contract tests
pnpm run contract:test

# Check version compatibility
pnpm run compat:check
```

**Resolution**:

For version mismatch:
```bash
# Update to compatible version
pnpm add @controlplane/contracts@^1.0.0

# Run contract tests again
pnpm run contract:test
```

For breaking changes:
```bash
# Check migration guide
cat docs/CONTRACT-UPGRADE.md

# Update code for new schema
# (see migration guide for details)
```

### 3. Job Execution Failures

**Symptoms**: Jobs failing, error responses, timeout errors  
**Causes**: Runner error, timeout, invalid payload, external API failure

**Diagnosis**:

Check runner logs:
```bash
# View runner logs
docker-compose logs runner-example

# Check specific job
# Look for correlation ID in logs
grep "correlation-id" logs/runner.log
```

Check error patterns:
```bash
# View error distribution
grep "error" logs/runner.log | sort | uniq -c
```

**Resolution**:

For timeouts:
```bash
# Check timeout configuration
cat .env | grep TIMEOUT

# Increase timeout temporarily
TIMEOUT=120000 pnpm run dev
```

For runner errors:
```bash
# Restart runner
docker-compose restart runner-example

# Check runner health
curl http://localhost:3000/health
```

### 4. Degraded Performance

**Symptoms**: High latency, queue buildup, slow responses  
**Causes**: Resource constraints, high load, external API latency

**Diagnosis**:

Check metrics:
```bash
# View job metrics
curl http://localhost:8080/metrics | grep jobs

# Check external API latency
curl http://localhost:3000/metrics | grep external_api_duration
```

Check resource usage:
```bash
# Docker stats
docker stats --no-stream

# Check Redis
redis-cli info stats
```

**Resolution**:

Scale horizontally:
```bash
# Add more runners
docker-compose up --scale runner-example=3 -d
```

Tune performance:
```bash
# Increase max concurrent jobs
MAX_CONCURRENT_JOBS=20 pnpm run dev

# Adjust queue polling interval
QUEUE_POLL_INTERVAL=100 pnpm run dev
```

### 5. E2E Test Failures

**Symptoms**: Playwright tests failing, CI red  
**Causes**: Environment issues, race conditions, real failures

**Diagnosis**:

Run tests locally:
```bash
# Ensure clean environment
docker-compose down -v
pnpm run dev:stack

# Run specific test
pnpm run test:e2e -- --grep "happy path"

# Run with UI for debugging
pnpm run test:e2e:ui
```

Check test output:
```bash
# View HTML report
pnpm run test:e2e:report

# Check Playwright traces
ls -la test-results/
```

**Resolution**:

For race conditions:
```bash
# Increase timeouts in playwright.config.ts
# Add explicit waits in tests

# Or run with higher timeout
pnpm run test:e2e -- --timeout=120000
```

For environment issues:
```bash
# Clean restart
docker-compose down -v --rmi local
docker-compose up -d
pnpm run wait:healthy
```

## Degraded Mode Operation

When services are partially available, the system operates in degraded mode:

### TruthCore Unavailable

- JobForge queues jobs for later assertion
- Runners execute without truth validation
- Jobs marked with `truthDeferred: true`

**Recovery**:
```bash
# Restart TruthCore
docker-compose restart truthcore

# Trigger deferred assertions
curl -X POST http://localhost:8081/assertions/batch \
  -H "Content-Type: application/json" \
  -d '{"deferredOnly": true}'
```

### Runner Unavailable

- JobForge retries with exponential backoff
- Jobs requeued for other runners
- Health checks mark runner unhealthy

**Recovery**:
```bash
# Restart runner
docker-compose restart runner-example

# Check runner registration
curl http://localhost:8080/runners
```

## Observability

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f jobforge

# Structured logs (JSON)
docker-compose logs jobforge | jq '.level == "error"'
```

### Metrics Queries

Failure rate by job type:
```bash
curl -s http://localhost:8080/metrics | \
  grep jobs_failed_total | \
  awk '{print $1, $2}'
```

P99 latency:
```bash
curl -s http://localhost:3000/metrics | \
  grep job_duration_seconds_bucket | \
  grep 'le="+Inf"'
```

### Correlation IDs

Trace a request through the system:

```bash
# Find correlation ID in logs
grep "correlationId.*abc-123" logs/*.log

# Trace through services
grep "abc-123" logs/jobforge.log
grep "abc-123" logs/runner.log
grep "abc-123" logs/truthcore.log
```

## Alerting Thresholds

Recommended monitoring thresholds:

| Metric | Warning | Critical |
|--------|---------|----------|
| Job failure rate | >5% | >15% |
| P99 latency | >5s | >10s |
| Queue depth | >100 | >500 |
| Runner heartbeat | >60s | >120s |
| Error rate | >1/min | >5/min |

## Emergency Procedures

### Complete System Restart

```bash
# 1. Stop all services
docker-compose down -v

# 2. Clear Redis (optional)
redis-cli FLUSHALL

# 3. Start fresh
docker-compose up -d

# 4. Verify health
pnpm run test:smoke

# 5. Run E2E tests
pnpm run test:e2e
```

### Rollback Release

```bash
# 1. Check previous version
git tag --sort=-version:refname | head -5

# 2. Checkout previous version
git checkout v1.0.0

# 3. Rebuild and restart
pnpm install
pnpm run build
docker-compose up -d --build

# 4. Verify
pnpm run test:smoke
```

## Escalation

If unable to resolve:

1. **Document**: Save logs, metrics, error messages
2. **Isolate**: Identify failing component
3. **Communicate**: Open issue with details
4. **Mitigate**: Apply temporary workarounds
5. **Monitor**: Watch for recovery

## References

- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Observability Contract](./OBSERVABILITY-CONTRACT.md)
- [Compatibility Matrix](./COMPATIBILITY.md)
- [Release Policy](./RELEASE-POLICY.md)
