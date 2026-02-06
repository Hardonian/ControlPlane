# Deployment Guide

This repo ships contracts, tooling, and runner templates. There is no production ControlPlane service in this repo; deployments focus on CI/tooling and generated runners.

## Local Development

### Prerequisites
- Node.js 18+
- pnpm 8+

### Install Dependencies

```bash
pnpm install
```

### Core Validation

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

### Contract Validation

```bash
pnpm run build:contracts
pnpm run build:test-kit
pnpm run contract:validate
```

### E2E Tests (requires running services)

```bash
pnpm run test:e2e
```

## Runner Template Deployment

Generated runners are standard Node.js services. For the Express templates in `packages/create-runner/templates/*`:

1. Copy `.env.example` and configure values for your environment.
2. Start the service (example):

```bash
pnpm install
pnpm run build
node dist/index.js
```

### Required Environment Variables

Use `.env.example` as the source of truth. At minimum, configure:

- `JOBFORGE_URL`
- `EXTERNAL_API_URL` / `EXTERNAL_API_KEY` (http-connector template)
- `REDIS_URL` (queue-worker template)
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` (if overriding defaults)

## Production Notes

- Deploy generated runners behind a reverse proxy that terminates TLS.
- Configure per-runner authentication/authorization at the edge.
- For rate limiting beyond the in-memory defaults, use a shared store (Redis) or API gateway.
- Capture structured logs (JSON) from stdout/stderr to your observability stack.
