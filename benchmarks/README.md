# ControlPlane Performance Benchmarks

This directory contains honest, reproducible benchmarks for the ControlPlane orchestration system.

## Hard Rules

1. **No cherry-picking**: All runs included, no "best of 3"
2. **No synthetic-only**: Real-world scenarios with actual failures
3. **Reproducible**: Environment locked, documented, version-pinned
4. **Transparent**: Raw data included, limitations stated upfront

## Benchmark Scenarios

### 1. Orchestration Latency
- **What**: Time from job submission to completion
- **Metrics**: p50, p95, p99 latency
- **Workload**: Varying job counts (10, 100, 500 concurrent jobs)
- **Load**: Sustained (3-minute runs with warmup)

### 2. Degraded Mode Behavior
- **What**: System behavior under partial failure
- **Scenarios**:
  - Runner unavailable (jobs queue, retry, eventually timeout)
  - TruthCore unavailable (circuit breaker trips, graceful fallback)
  - Network partition between JobForge and Redis
- **Metrics**: Recovery time, error rates, queue depth

### 3. Scale-Out Runner Execution
- **What**: Performance with 1, 3, 5 concurrent runners
- **Workload**: Mixed job types (compute-heavy, I/O-heavy, fast)
- **Metrics**: Throughput (jobs/sec), latency distribution, resource utilization

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all benchmarks
pnpm run benchmark

# Run specific benchmark
pnpm run benchmark:latency
pnpm run benchmark:degraded
pnpm run benchmark:scale

# Generate report
pnpm run benchmark:report
```

## Environment Requirements

- Node.js 18+
- Redis 7 (local or Docker)
- Docker & Docker Compose (for full stack)
- 4GB RAM minimum
- 2 CPU cores minimum

## Results Location

Raw results: `benchmarks/results/YYYY-MM-DD-HHMMSS/`
Latest report: `benchmarks/results/LATEST_REPORT.md`

## Interpreting Results

- **p50**: Typical user experience
- **p95**: Worst-case for 95% of users
- **p99**: Outlier behavior (outliers matter for SLAs)
- **Reproducibility tolerance**: ±15% for latency, ±10% for throughput

## Contributing Benchmarks

1. Define scenario in `benchmarks/scenarios/`
2. Implement harness in `benchmarks/src/`
3. Document methodology in this README
4. Ensure runs complete in < 10 minutes
