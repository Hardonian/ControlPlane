# 5-Minute Quickstart

Get the entire ControlPlane ecosystem running locally in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check pnpm
pnpm --version

# Check Docker
docker --version
docker-compose --version
```

## Step-by-Step Setup

### 1. Clone and Setup (1 minute)

```bash
git clone https://github.com/Hardonian/ControlPlane.git
cd ControlPlane

# Install dependencies
pnpm install

# Build contracts package
pnpm run build:contracts
```

### 2. Start the Stack (2 minutes)

```bash
# Start all services
pnpm run dev:stack

# Wait for services to be healthy
pnpm run wait:healthy

# Or check manually
pnpm run test:smoke
```

You should see output like:
```
🔍 Running ControlPlane smoke tests...

Checking TruthCore... ✅ (45ms)
Checking JobForge... ✅ (23ms)
Checking Runner-Example... ✅ (18ms)

==================================================
Smoke Test Summary
==================================================
Total:     3
Passed:    3 ✅
Failed:    0 ❌
Duration:  1234ms
==================================================

✅ All smoke tests passed!
```

### 3. Run Your First Job (1 minute)

```bash
# Submit a test job
curl -X POST http://localhost:3002/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "'"$(uuidgen || cat /proc/sys/kernel/random/uuid || echo "test-$(date +%s)")"'",
    "type": "test.echo",
    "priority": 50,
    "payload": {
      "type": "echo",
      "version": "1.0.0",
      "data": { "message": "Hello, ControlPlane!" },
      "options": {}
    },
    "metadata": {
      "source": "quickstart",
      "tags": ["test"],
      "createdAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
    },
    "timeoutMs": 30000
  }'
```

Or use the test script:

```bash
node scripts/submit-test-job.js
```

### 4. Verify with E2E Tests (1 minute)

```bash
# Run the full E2E test suite
pnpm run test:e2e
```

## What Just Happened?

1. **Docker Compose** started 4 services:
   - Redis (message queue)
   - TruthCore (source of truth)
   - JobForge (job orchestration)
   - Runner-Example (execution module)

2. **Services self-registered** with each other

3. **Health checks** verified all services are operational

4. **Contract tests** validated schemas are correct

5. **E2E tests** verified the full job lifecycle works

## Next Steps

- [Add a custom runner](./RUNNER-GUIDE.md)
- [Explore the architecture](./ARCHITECTURE.md)
- [Understand contracts](../packages/contracts/VERSIONING.md)
- [Troubleshooting guide](./TROUBLESHOOTING.md)

## Development Mode

For active development with hot reload:

```bash
# Terminal 1: Start infrastructure only
docker-compose up redis

# Terminal 2: Run contract tests in watch mode
pnpm run test:contracts -- --watch

# Terminal 3: Run E2E tests in UI mode
pnpm run test:e2e:ui
```

## Common Issues

### Port conflicts

```bash
# Check if ports are in use
lsof -i :3001  # TruthCore
lsof -i :3002  # JobForge
lsof -i :3003  # Runner
lsof -i :6379  # Redis

# If occupied, modify docker-compose.yml port mappings
```

### Docker not running

```bash
# Start Docker Desktop or Docker daemon
# On macOS: open -a Docker
# On Linux: sudo systemctl start docker
```

### Contract validation fails

```bash
# Rebuild contracts
pnpm run build:contracts
pnpm run build:test-kit
pnpm run contract:validate
```
