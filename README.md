# ControlPlane Orchestrator

> An execution engine for agent-driven systems. Built for orchestration, governance, and reliable automation at scale.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### 1. Install Dependencies

```bash
# Install pnpm if needed
npm install -g pnpm

# Install all dependencies
pnpm install

# Build the contracts
pnpm run build:contracts
```

### 2. Start the Full Stack

```bash
# Start all services with Docker Compose
pnpm run dev:stack

# Or with logs visible
pnpm run dev:stack:logs

# Verify all services are healthy
pnpm run test:smoke
```

### 3. Run Tests

```bash
# Run contract validation
pnpm run contract:validate

# Run unit tests
pnpm run test

# Run E2E tests (stack must be running)
pnpm run test:e2e
```

### 4. Stop the Stack

```bash
pnpm run dev:stack:down
```

## Project Structure

```
ControlPlane/
├── packages/
│   ├── contracts/           # Canonical Zod schemas and types
│   └── contract-test-kit/   # Schema validation toolkit
├── services/
│   ├── truthcore/          # Source of truth service (placeholder)
│   ├── jobforge/           # Job orchestration service (placeholder)
│   └── runner-example/     # Example module runner (placeholder)
├── scripts/
│   ├── smoke-test.js       # Service health verification
│   └── wait-for-healthy.js # Wait for services
├── tests/
│   └── e2e/                # Playwright E2E tests
├── .github/workflows/      # CI/CD automation
├── docker-compose.yml      # Local stack orchestration
├── docs/                   # Documentation
└── README.md              # This file
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm run build` | Build all packages |
| `pnpm run dev:stack` | Start local stack (detached) |
| `pnpm run dev:stack:logs` | Start local stack (with logs) |
| `pnpm run dev:stack:down` | Stop local stack |
| `pnpm run test` | Run unit tests |
| `pnpm run test:e2e` | Run E2E tests |
| `pnpm run test:smoke` | Run smoke tests |
| `pnpm run contract:validate` | Validate contracts |
| `pnpm run lint` | Run linter |
| `pnpm run typecheck` | Run TypeScript checks |
| `pnpm run ci` | Full CI pipeline locally |

## Architecture

ControlPlane consists of three core services:

1. **TruthCore** - The source of truth for assertions and knowledge
2. **JobForge** - Job queue and orchestration engine
3. **Runners** - Pluggable execution modules for specific capabilities

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for details.

## Documentation

- [5-Minute Quickstart](./docs/QUICKSTART.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Adding a New Runner](./docs/RUNNER-GUIDE.md)
- [Contract Versioning](./packages/contracts/VERSIONING.md)
- [OSS vs Cloud Boundary](./docs/OSS-CLOUD-BOUNDARY.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Compatibility Matrix](./docs/COMPATIBILITY.md)

## License

Apache-2.0
