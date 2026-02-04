import type { BenchmarkConfig, BenchmarkResult, BenchmarkMetric } from '../contracts/index.js';
import { BenchmarkRunner } from './base-runner.js';

interface HealthCheckStats {
  latencies: number[];
  total: number;
  healthy: number;
}

interface OverallHealthStats {
  latencies: number[];
  total: number;
  healthy: number;
}

export class HealthCheckPerformanceRunner extends BenchmarkRunner {
  async run(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const startTime = new Date().toISOString();
    const startTimestamp = Date.now();

    this.log(`Starting health check performance benchmark: ${config.name}`);
    this.log(`Duration: ${config.durationMs}ms, Concurrency: ${config.concurrency}`);

    const warmupEnd = startTimestamp + config.warmupMs;
    const testEnd = startTimestamp + config.durationMs;

    const services = [
      { name: 'TruthCore', url: this.context.truthcoreUrl },
      { name: 'JobForge', url: this.context.jobforgeUrl },
      { name: 'Runner', url: this.context.runnerUrl },
    ];

    const perServiceStats = new Map<string, HealthCheckStats>();
    const overallStats: OverallHealthStats = { latencies: [], total: 0, healthy: 0 };

    for (const service of services) {
      perServiceStats.set(service.name, { latencies: [], total: 0, healthy: 0 });
    }

    const workers: Promise<void>[] = [];

    for (let i = 0; i < config.concurrency; i++) {
      workers.push(
        this.healthCheckWorker(i, warmupEnd, testEnd, services, perServiceStats, overallStats)
      );
    }

    await Promise.all(workers);

    const endTimestamp = Date.now();
    const endTime = new Date().toISOString();
    const duration = endTimestamp - startTimestamp;

    const metrics: BenchmarkMetric[] = [];

    for (const service of services) {
      const serviceStats = perServiceStats.get(service.name);

      if (!serviceStats || serviceStats.total === 0) continue;

      const latencies = serviceStats.latencies;
      const sorted = [...latencies].sort((a, b) => a - b);

      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || max;

      const healthRate = serviceStats.total > 0 ? serviceStats.healthy / serviceStats.total : 0;

      const throughput = serviceStats.total / (duration / 1000);

      metrics.push(
        {
          name: `${service.name.toLowerCase()}_health_checks`,
          value: serviceStats.total,
          unit: 'count',
          description: `Total health checks for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_health_rate`,
          value: Number((healthRate * 100).toFixed(2)),
          unit: 'percent',
          description: `Health check success rate for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_avg_latency`,
          value: Number(mean.toFixed(2)),
          unit: 'ms',
          description: `Average health check latency for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_min_latency`,
          value: min,
          unit: 'ms',
          description: `Minimum health check latency for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_max_latency`,
          value: max,
          unit: 'ms',
          description: `Maximum health check latency for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_p50_latency`,
          value: p50,
          unit: 'ms',
          description: `50th percentile health check latency for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_p95_latency`,
          value: p95,
          unit: 'ms',
          description: `95th percentile health check latency for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_p99_latency`,
          value: p99,
          unit: 'ms',
          description: `99th percentile health check latency for ${service.name}`,
        },
        {
          name: `${service.name.toLowerCase()}_throughput`,
          value: Number(throughput.toFixed(2)),
          unit: 'req/s',
          description: `Health check throughput for ${service.name}`,
        }
      );
    }

    const totalChecks = overallStats.total;
    const healthyChecks = overallStats.healthy;
    const overallHealthRate = totalChecks > 0 ? healthyChecks / totalChecks : 0;

    const overallLatencies = overallStats.latencies;
    const overallAvg =
      overallLatencies.length > 0
        ? overallLatencies.reduce((a, b) => a + b, 0) / overallLatencies.length
        : 0;

    metrics.push(
      {
        name: 'total_health_checks',
        value: totalChecks,
        unit: 'count',
        description: 'Total health checks across all services',
      },
      {
        name: 'overall_health_rate',
        value: Number((overallHealthRate * 100).toFixed(2)),
        unit: 'percent',
        description: 'Overall health check success rate',
      },
      {
        name: 'overall_avg_latency',
        value: Number(overallAvg.toFixed(2)),
        unit: 'ms',
        description: 'Average health check latency across all services',
      }
    );

    let status: 'passed' | 'failed' | 'skipped' = 'passed';

    if (config.thresholds.maxErrorRate && 1 - overallHealthRate > config.thresholds.maxErrorRate) {
      status = 'failed';
    }

    const result = this.createBaseResult(config, startTime, endTime, duration, status);
    result.metrics = metrics;
    result.metadata = {
      services: services.map((s) => s.name),
      totalChecks,
      healthyChecks,
      failedChecks: totalChecks - healthyChecks,
    };

    this.log(`Health check benchmark complete: ${healthyChecks}/${totalChecks} checks successful`);

    return result;
  }

  private async healthCheckWorker(
    workerId: number,
    warmupEnd: number,
    testEnd: number,
    services: { name: string; url: string }[],
    perServiceStats: Map<string, HealthCheckStats>,
    overallStats: OverallHealthStats
  ): Promise<void> {
    let counter = 0;

    while (Date.now() < testEnd) {
      const isWarmup = Date.now() < warmupEnd;

      for (const service of services) {
        const timestamp = Date.now();
        const stats = perServiceStats.get(service.name);

        if (!stats) continue;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${service.url}/health`, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const responseTimeMs = Date.now() - timestamp;

          if (!isWarmup) {
            if (response.ok) {
              const data = (await response.json()) as { status?: string };
              const isHealthy = data.status === 'healthy' || data.status === 'ok';

              stats.total++;
              stats.latencies.push(responseTimeMs);
              overallStats.total++;
              overallStats.latencies.push(responseTimeMs);
              if (isHealthy) {
                stats.healthy++;
                overallStats.healthy++;
              }
            } else {
              stats.total++;
              stats.latencies.push(responseTimeMs);
              overallStats.total++;
              overallStats.latencies.push(responseTimeMs);
            }
          }
        } catch (error) {
          if (!isWarmup) {
            const responseTimeMs = Date.now() - timestamp;
            stats.total++;
            stats.latencies.push(responseTimeMs);
            overallStats.total++;
            overallStats.latencies.push(responseTimeMs);
          }
        }
      }

      counter++;

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
