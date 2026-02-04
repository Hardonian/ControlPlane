import type { BenchmarkConfig, BenchmarkResult, BenchmarkMetric } from '../contracts/index.js';
import { BenchmarkRunner } from './base-runner.js';

interface QueueMetrics {
  operation: 'enqueue' | 'dequeue' | 'peek' | 'depth';
  timestamp: number;
  durationMs: number;
  success: boolean;
  queueDepth?: number;
  error?: Error;
}

export class QueuePerformanceRunner extends BenchmarkRunner {
  async run(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const startTime = new Date().toISOString();
    const startTimestamp = Date.now();

    this.log(`Starting queue performance benchmark: ${config.name}`);
    this.log(`Duration: ${config.durationMs}ms, Concurrency: ${config.concurrency}`);

    const warmupEnd = startTimestamp + config.warmupMs;
    const testEnd = startTimestamp + config.durationMs;

    const enqueueMetrics: QueueMetrics[] = [];
    const dequeueMetrics: QueueMetrics[] = [];
    const depthMetrics: QueueMetrics[] = [];

    await this.clearQueues();

    const enqueueWorkers: Promise<void>[] = [];
    const dequeueWorkers: Promise<void>[] = [];
    const monitorWorkers: Promise<void>[] = [];

    const enqueueConcurrency = Math.max(1, Math.floor(config.concurrency * 0.6));
    const dequeueConcurrency = config.concurrency - enqueueConcurrency;

    for (let i = 0; i < enqueueConcurrency; i++) {
      enqueueWorkers.push(this.enqueueWorker(i, warmupEnd, testEnd, enqueueMetrics));
    }

    for (let i = 0; i < dequeueConcurrency; i++) {
      dequeueWorkers.push(this.dequeueWorker(i, warmupEnd, testEnd, dequeueMetrics));
    }

    monitorWorkers.push(this.monitorQueueDepth(warmupEnd, testEnd, depthMetrics));

    await Promise.all([...enqueueWorkers, ...dequeueWorkers, ...monitorWorkers]);

    const endTimestamp = Date.now();
    const endTime = new Date().toISOString();
    const duration = endTimestamp - startTimestamp;

    const successfulEnqueues = enqueueMetrics.filter((m) => m.success);
    const successfulDequeues = dequeueMetrics.filter((m) => m.success);

    const enqueueMetrics_calculated = this.calculateOperationMetrics(enqueueMetrics, 'enqueue');
    const dequeueMetrics_calculated = this.calculateOperationMetrics(dequeueMetrics, 'dequeue');

    const queueDepthStats = this.calculateQueueDepthStats(depthMetrics);

    const totalMessages = successfulEnqueues.length;
    const processedMessages = successfulDequeues.length;
    const throughput = totalMessages / (duration / 1000);
    const processingRate = processedMessages / (duration / 1000);

    const metrics: BenchmarkMetric[] = [
      {
        name: 'total_messages_enqueued',
        value: totalMessages,
        unit: 'count',
        description: 'Total messages successfully enqueued',
      },
      {
        name: 'total_messages_dequeued',
        value: processedMessages,
        unit: 'count',
        description: 'Total messages successfully dequeued/processed',
      },
      {
        name: 'enqueue_throughput',
        value: Number(throughput.toFixed(2)),
        unit: 'req/s',
        description: 'Messages enqueued per second',
      },
      {
        name: 'dequeue_throughput',
        value: Number(processingRate.toFixed(2)),
        unit: 'req/s',
        description: 'Messages dequeued per second',
      },
      {
        name: 'processing_lag',
        value: totalMessages - processedMessages,
        unit: 'count',
        description: 'Messages remaining in queue (lag)',
      },
      ...enqueueMetrics_calculated,
      ...dequeueMetrics_calculated,
      ...queueDepthStats,
    ];

    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    const lag = totalMessages - processedMessages;
    const lagRatio = totalMessages > 0 ? lag / totalMessages : 0;

    if (lagRatio > 0.1) {
      this.log(`Warning: Queue lag is ${(lagRatio * 100).toFixed(1)}%`);
    }

    const result = this.createBaseResult(config, startTime, endTime, duration, status);
    result.metrics = metrics;
    result.metadata = {
      totalEnqueued: totalMessages,
      totalDequeued: processedMessages,
      lag: totalMessages - processedMessages,
      enqueueWorkers: enqueueConcurrency,
      dequeueWorkers: dequeueConcurrency,
    };

    this.log(
      `Queue performance benchmark complete: ${totalMessages} enqueued, ${processedMessages} dequeued`
    );

    await this.clearQueues();

    return result;
  }

  private async clearQueues(): Promise<void> {
    this.log('Clearing queues...');
    try {
      await fetch(`${this.context.jobforgeUrl}/admin/queue/clear`, {
        method: 'POST',
      });
    } catch {
      this.log('Queue clear endpoint not available');
    }
  }

  private async enqueueWorker(
    workerId: number,
    warmupEnd: number,
    testEnd: number,
    metrics: QueueMetrics[]
  ): Promise<void> {
    let counter = 0;

    while (Date.now() < testEnd) {
      const isWarmup = Date.now() < warmupEnd;
      const timestamp = Date.now();

      try {
        const response = await fetch(`${this.context.jobforgeUrl}/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            type: 'benchmark.queue',
            priority: 50,
            payload: {
              type: 'benchmark',
              version: '1.0.0',
              data: {
                workerId,
                counter,
                timestamp,
              },
              options: {},
            },
            metadata: {
              source: 'benchmark',
              tags: ['queue-test', `worker-${workerId}`],
              createdAt: new Date().toISOString(),
            },
            timeoutMs: 30000,
          }),
        });

        const durationMs = Date.now() - timestamp;

        if (!isWarmup) {
          metrics.push({
            operation: 'enqueue',
            timestamp,
            durationMs,
            success: response.ok,
            error: response.ok ? undefined : new Error(`HTTP ${response.status}`),
          });
        }
      } catch (error) {
        if (!isWarmup) {
          metrics.push({
            operation: 'enqueue',
            timestamp,
            durationMs: Date.now() - timestamp,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }

      counter++;
    }
  }

  private async dequeueWorker(
    workerId: number,
    warmupEnd: number,
    testEnd: number,
    metrics: QueueMetrics[]
  ): Promise<void> {
    while (Date.now() < testEnd) {
      const isWarmup = Date.now() < warmupEnd;
      const timestamp = Date.now();

      try {
        const response = await fetch(`${this.context.jobforgeUrl}/admin/queue/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId: `benchmark-worker-${workerId}`,
            capabilities: ['benchmark.queue'],
          }),
        });

        const durationMs = Date.now() - timestamp;

        if (!isWarmup) {
          if (response.ok) {
            metrics.push({
              operation: 'dequeue',
              timestamp,
              durationMs,
              success: true,
            });
          } else if (response.status !== 204) {
            metrics.push({
              operation: 'dequeue',
              timestamp,
              durationMs,
              success: false,
              error: new Error(`HTTP ${response.status}`),
            });
          }
        }
      } catch (error) {
        if (!isWarmup) {
          metrics.push({
            operation: 'dequeue',
            timestamp,
            durationMs: Date.now() - timestamp,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  private async monitorQueueDepth(
    warmupEnd: number,
    testEnd: number,
    metrics: QueueMetrics[]
  ): Promise<void> {
    while (Date.now() < testEnd) {
      const isWarmup = Date.now() < warmupEnd;
      const timestamp = Date.now();

      try {
        const response = await fetch(`${this.context.jobforgeUrl}/admin/queue/stats`);

        if (response.ok) {
          const data = await response.json();
          const queueDepth = data.pending || data.queued || 0;

          if (!isWarmup) {
            metrics.push({
              operation: 'depth',
              timestamp,
              durationMs: Date.now() - timestamp,
              success: true,
              queueDepth,
            });
          }
        }
      } catch {
        // Ignore monitoring errors
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private calculateOperationMetrics(metrics: QueueMetrics[], operation: string): BenchmarkMetric[] {
    const relevant = metrics.filter((m) => m.operation === operation && m.success);

    if (relevant.length === 0) return [];

    const latencies = relevant.map((m) => m.durationMs);
    const sorted = [...latencies].sort((a, b) => a - b);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || max;

    return [
      {
        name: `${operation}_min_latency`,
        value: min,
        unit: 'ms',
        description: `Minimum ${operation} latency`,
      },
      {
        name: `${operation}_max_latency`,
        value: max,
        unit: 'ms',
        description: `Maximum ${operation} latency`,
      },
      {
        name: `${operation}_avg_latency`,
        value: Number(mean.toFixed(2)),
        unit: 'ms',
        description: `Average ${operation} latency`,
      },
      {
        name: `${operation}_p50_latency`,
        value: p50,
        unit: 'ms',
        description: `50th percentile ${operation} latency`,
      },
      {
        name: `${operation}_p95_latency`,
        value: p95,
        unit: 'ms',
        description: `95th percentile ${operation} latency`,
      },
      {
        name: `${operation}_p99_latency`,
        value: p99,
        unit: 'ms',
        description: `99th percentile ${operation} latency`,
      },
    ];
  }

  private calculateQueueDepthStats(metrics: QueueMetrics[]): BenchmarkMetric[] {
    const depthReadings = metrics
      .filter((m) => m.operation === 'depth' && m.queueDepth !== undefined)
      .map((m) => m.queueDepth!);

    if (depthReadings.length === 0) return [];

    const sorted = [...depthReadings].sort((a, b) => a - b);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = depthReadings.reduce((a, b) => a + b, 0) / depthReadings.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;

    return [
      {
        name: 'queue_depth_min',
        value: min,
        unit: 'count',
        description: 'Minimum queue depth observed',
      },
      {
        name: 'queue_depth_max',
        value: max,
        unit: 'count',
        description: 'Maximum queue depth observed',
      },
      {
        name: 'queue_depth_avg',
        value: Number(mean.toFixed(2)),
        unit: 'count',
        description: 'Average queue depth',
      },
      {
        name: 'queue_depth_p50',
        value: p50,
        unit: 'count',
        description: '50th percentile queue depth',
      },
      {
        name: 'queue_depth_p95',
        value: p95,
        unit: 'count',
        description: '95th percentile queue depth',
      },
    ];
  }
}
