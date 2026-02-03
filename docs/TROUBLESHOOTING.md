# Troubleshooting Guide

Common issues and their solutions.

## Quick Diagnostics

Run this first:

```bash
# Check service health
pnpm run test:smoke

# Check contracts
pnpm run contract:validate

# View logs
docker-compose logs -f
```

## Installation Issues

### pnpm not found

```bash
npm install -g pnpm
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Node version too old

```bash
# Check version
node --version  # Need 18+

# Use nvm to install
nvm install 20
nvm use 20
```

## Stack Startup Issues

### Port already in use

**Error:** `bind: address already in use`

```bash
# Find what's using the port
lsof -i :3001  # TruthCore
lsof -i :3002  # JobForge
lsof -i :3003  # Runner
lsof -i :6379  # Redis

# Kill the process
kill -9 <PID>

# Or change ports in docker-compose.yml
ports:
  - "3001:3000"  # Change to "3004:3000"
```

### Docker not running

**Error:** `Cannot connect to the Docker daemon`

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Windows
# Start Docker Desktop from Start menu
```

### Services fail to start

```bash
# Check logs
docker-compose logs truthcore
docker-compose logs jobforge
docker-compose logs runner-example

# Restart a specific service
docker-compose restart truthcore

# Full reset
docker-compose down -v
docker-compose up -d
```

## Contract Validation Failures

### Schema mismatch errors

```bash
# Rebuild contracts
pnpm run build:contracts
pnpm run build:test-kit

# Validate again
pnpm run contract:validate
```

### "Unknown schema version"

Check that all services report the same contract version:

```bash
curl http://localhost:3001/health | jq .contractVersion
curl http://localhost:3002/health | jq .contractVersion
curl http://localhost:3003/health | jq .contractVersion
```

They should all be compatible (same major version).

## E2E Test Failures

### Services not ready

```bash
# Wait for services
pnpm run wait:healthy

# Or manually check
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

### Timeout errors

```bash
# Increase timeout
export E2E_TIMEOUT=60000
pnpm run test:e2e
```

### Network issues in CI

Check the GitHub Actions workflow is using the correct service URLs:
- `TRUTHCORE_URL: http://localhost:3001`
- `JOBFORGE_URL: http://localhost:3002`
- `RUNNER_URL: http://localhost:3003`

## Runtime Errors

### 500 Internal Server Error

**Should never happen in ControlPlane.** If it does:

1. Check service logs:
   ```bash
   docker-compose logs truthcore | tail -50
   ```

2. Verify schema validation is enabled

3. Check error envelope format

### Job stuck in "queued" state

```bash
# Check if runner is registered
curl http://localhost:3002/runners

# Check runner health
curl http://localhost:3003/health

# Check queue depth
# (requires Redis CLI or queue inspection endpoint)
```

### High memory usage

```bash
# Check container stats
docker stats

# Limit memory in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
```

## Performance Issues

### Slow job execution

1. Check runner capacity:
   ```bash
   curl http://localhost:3003/health | jq .activeJobs
   ```

2. Scale runners in docker-compose.yml:
   ```yaml
   runner-example:
     deploy:
       replicas: 3
   ```

3. Check database/query performance

### High latency

```bash
# Add tracing/logging
# Check network between services
docker network inspect controlplane_controlplane
```

## Development Issues

### Hot reload not working

```bash
# Ensure you're using dev mode
pnpm run dev

# Not docker-compose (which is production-like)
```

### Tests pass locally but fail in CI

1. Check for race conditions
2. Verify all async operations are awaited
3. Check test isolation

## Graceful Degradation Scenarios

### Redis is down

Expected behavior:
- JobForge returns 503 with retry-after header
- Jobs are queued in-memory (limited)
- Error: `SERVICE_UNAVAILABLE`

### TruthCore is down

Expected behavior:
- JobForge queues results locally
- Retries TruthCore write
- Error: `TRUTHCORE_ERROR` (retryable)

### Runner is down

Expected behavior:
- JobForge returns job to queue
- Retries with other runners
- Error: `SERVICE_UNAVAILABLE` (retryable)

## Debugging Commands

```bash
# View all logs
docker-compose logs -f --tail=100

# Specific service
docker-compose logs -f truthcore

# Shell into container
docker-compose exec truthcore sh

# Check network
docker network ls
docker network inspect controlplane_controlplane

# List containers
docker-compose ps

# Resource usage
docker-compose stats
```

## Getting Help

1. Check the [GitHub Issues](https://github.com/Hardonian/ControlPlane/issues)
2. Review [Architecture Guide](./ARCHITECTURE.md)
3. Check [Contract Versioning](../packages/contracts/VERSIONING.md)
4. Run diagnostics: `pnpm run test:smoke && pnpm run contract:validate`

## Known Limitations

1. **No authentication** - Services trust each other on the same network
2. **No persistence** - Redis is the only data store in the example setup
3. **Single region** - No multi-region support in the example
4. **Manual scaling** - No auto-scaling in Docker Compose setup

These are intentional for the OSS example. Production deployments should add:
- mTLS between services
- Persistent database backing for TruthCore
- Multi-region deployment
- Kubernetes with HPA
