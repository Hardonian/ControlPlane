import type { BenchmarkConfig, BenchmarkResult, BenchmarkMetric } from '../contracts/index.js';
import { BenchmarkRunner } from './base-runner.js';
import {
  JobRequest,
  JobResponse,
  TruthAssertion,
  TruthQuery,
  ErrorEnvelope,
} from '@controlplane/contracts';

interface ValidationMetrics {
  schema: string;
  iterations: number;
  totalTimeMs: number;
  successCount: number;
  failureCount: number;
  errors: Error[];
}

export class ContractValidationRunner extends BenchmarkRunner {
  async run(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const startTime = new Date().toISOString();
    const startTimestamp = Date.now();

    this.log(`Starting contract validation benchmark: ${config.name}`);

    const iterationCount = config.iterations || 10000;
    const warmupIterations = Math.floor(iterationCount * 0.1);

    this.log(`Warmup: ${warmupIterations} iterations, Test: ${iterationCount} iterations`);

    await this.warmup(warmupIterations);

    const metrics: ValidationMetrics[] = [];

    metrics.push(await this.benchmarkJobRequestValidation(iterationCount));
    metrics.push(await this.benchmarkJobResponseValidation(iterationCount));
    metrics.push(await this.benchmarkTruthAssertionValidation(iterationCount));
    metrics.push(await this.benchmarkTruthQueryValidation(iterationCount));
    metrics.push(await this.benchmarkErrorEnvelopeValidation(iterationCount));
    metrics.push(await this.benchmarkComplexNestedValidation(iterationCount));

    const endTimestamp = Date.now();
    const endTime = new Date().toISOString();
    const duration = endTimestamp - startTimestamp;

    const benchmarkMetrics: BenchmarkMetric[] = [];

    for (const metric of metrics) {
      const avgTime = metric.totalTimeMs / metric.iterations;
      const throughput = metric.iterations / (metric.totalTimeMs / 1000);
      const successRate = metric.iterations > 0 ? metric.successCount / metric.iterations : 0;

      benchmarkMetrics.push(
        {
          name: `${metric.schema}_avg_time`,
          value: Number(avgTime.toFixed(4)),
          unit: 'ms',
          description: `Average validation time for ${metric.schema}`,
        },
        {
          name: `${metric.schema}_throughput`,
          value: Number(throughput.toFixed(2)),
          unit: 'ops',
          description: `Validations per second for ${metric.schema}`,
        },
        {
          name: `${metric.schema}_total_time`,
          value: Number(metric.totalTimeMs.toFixed(2)),
          unit: 'ms',
          description: `Total validation time for ${metric.schema}`,
        },
        {
          name: `${metric.schema}_success_rate`,
          value: Number((successRate * 100).toFixed(2)),
          unit: 'percent',
          description: `Validation success rate for ${metric.schema}`,
        }
      );
    }

    const totalValidations = metrics.reduce((sum, m) => sum + m.iterations, 0);
    const totalTime = metrics.reduce((sum, m) => sum + m.totalTimeMs, 0);
    const overallThroughput = totalValidations / (totalTime / 1000);

    benchmarkMetrics.push(
      {
        name: 'total_validations',
        value: totalValidations,
        unit: 'count',
        description: 'Total number of schema validations performed',
      },
      {
        name: 'overall_throughput',
        value: Number(overallThroughput.toFixed(2)),
        unit: 'ops',
        description: 'Overall validations per second across all schemas',
      },
      {
        name: 'schemas_tested',
        value: metrics.length,
        unit: 'count',
        description: 'Number of different schemas tested',
      }
    );

    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    const allSuccess = metrics.every((m) => m.failureCount === 0);
    if (!allSuccess) {
      status = 'failed';
    }

    const result = this.createBaseResult(config, startTime, endTime, duration, status);
    result.metrics = benchmarkMetrics;
    result.metadata = {
      iterationCount,
      warmupIterations,
      schemas: metrics.map((m) => m.schema),
    };

    this.log(
      `Contract validation benchmark complete: ${totalValidations} validations at ${overallThroughput.toFixed(2)} ops/sec`
    );

    return result;
  }

  private async warmup(iterations: number): Promise<void> {
    for (let i = 0; i < iterations; i++) {
      JobRequest.safeParse(this.generateJobRequest());
    }
  }

  private async benchmarkJobRequestValidation(iterations: number): Promise<ValidationMetrics> {
    const metrics: ValidationMetrics = {
      schema: 'JobRequest',
      iterations: 0,
      totalTimeMs: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const data = this.generateJobRequest();
      const result = JobRequest.safeParse(data);

      metrics.iterations++;
      if (result.success) {
        metrics.successCount++;
      } else {
        metrics.failureCount++;
      }
    }

    metrics.totalTimeMs = Date.now() - start;
    return metrics;
  }

  private async benchmarkJobResponseValidation(iterations: number): Promise<ValidationMetrics> {
    const metrics: ValidationMetrics = {
      schema: 'JobResponse',
      iterations: 0,
      totalTimeMs: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const data = this.generateJobResponse();
      const result = JobResponse.safeParse(data);

      metrics.iterations++;
      if (result.success) {
        metrics.successCount++;
      } else {
        metrics.failureCount++;
      }
    }

    metrics.totalTimeMs = Date.now() - start;
    return metrics;
  }

  private async benchmarkTruthAssertionValidation(iterations: number): Promise<ValidationMetrics> {
    const metrics: ValidationMetrics = {
      schema: 'TruthAssertion',
      iterations: 0,
      totalTimeMs: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const data = this.generateTruthAssertion();
      const result = TruthAssertion.safeParse(data);

      metrics.iterations++;
      if (result.success) {
        metrics.successCount++;
      } else {
        metrics.failureCount++;
      }
    }

    metrics.totalTimeMs = Date.now() - start;
    return metrics;
  }

  private async benchmarkTruthQueryValidation(iterations: number): Promise<ValidationMetrics> {
    const metrics: ValidationMetrics = {
      schema: 'TruthQuery',
      iterations: 0,
      totalTimeMs: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const data = this.generateTruthQuery();
      const result = TruthQuery.safeParse(data);

      metrics.iterations++;
      if (result.success) {
        metrics.successCount++;
      } else {
        metrics.failureCount++;
      }
    }

    metrics.totalTimeMs = Date.now() - start;
    return metrics;
  }

  private async benchmarkErrorEnvelopeValidation(iterations: number): Promise<ValidationMetrics> {
    const metrics: ValidationMetrics = {
      schema: 'ErrorEnvelope',
      iterations: 0,
      totalTimeMs: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const data = this.generateErrorEnvelope();
      const result = ErrorEnvelope.safeParse(data);

      metrics.iterations++;
      if (result.success) {
        metrics.successCount++;
      } else {
        metrics.failureCount++;
      }
    }

    metrics.totalTimeMs = Date.now() - start;
    return metrics;
  }

  private async benchmarkComplexNestedValidation(iterations: number): Promise<ValidationMetrics> {
    const metrics: ValidationMetrics = {
      schema: 'ComplexNested',
      iterations: 0,
      totalTimeMs: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const data = this.generateComplexNested();
      const result = JobRequest.safeParse(data);

      metrics.iterations++;
      if (result.success) {
        metrics.successCount++;
      } else {
        metrics.failureCount++;
      }
    }

    metrics.totalTimeMs = Date.now() - start;
    return metrics;
  }

  private generateJobRequest() {
    return {
      id: crypto.randomUUID(),
      type: 'benchmark.job',
      priority: 50,
      payload: {
        type: 'benchmark',
        version: '1.0.0',
        data: { test: true, index: Math.floor(Math.random() * 1000) },
        options: {},
      },
      metadata: {
        source: 'benchmark',
        tags: ['test', 'benchmark'],
        createdAt: new Date().toISOString(),
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
        backoffMultiplier: 2,
        retryableCategories: [],
        nonRetryableCategories: [],
      },
      timeoutMs: 30000,
    };
  }

  private generateJobResponse() {
    return {
      id: crypto.randomUUID(),
      status: 'completed',
      request: this.generateJobRequest(),
      result: {
        success: true,
        data: { result: 'success' },
        metadata: {
          completedAt: new Date().toISOString(),
          durationMs: 1234,
          attempts: 1,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  private generateTruthAssertion() {
    return {
      id: crypto.randomUUID(),
      subject: `benchmark-${Math.floor(Math.random() * 100)}`,
      predicate: 'benchmark.test',
      object: { data: 'test', index: Math.floor(Math.random() * 1000) },
      confidence: 1.0,
      timestamp: new Date().toISOString(),
      source: 'benchmark',
      metadata: {},
    };
  }

  private generateTruthQuery() {
    return {
      id: crypto.randomUUID(),
      pattern: {
        subject: `benchmark-${Math.floor(Math.random() * 100)}`,
        predicate: 'benchmark.test',
      },
      filters: {},
      limit: 10,
      offset: 0,
    };
  }

  private generateErrorEnvelope() {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      category: 'RUNTIME_ERROR',
      severity: 'error',
      code: 'BENCHMARK_ERROR',
      message: 'Benchmark test error',
      details: [],
      service: 'benchmark',
      retryable: true,
      contractVersion: { major: 1, minor: 0, patch: 0 },
    };
  }

  private generateComplexNested() {
    return {
      ...this.generateJobRequest(),
      payload: {
        type: 'complex',
        version: '1.0.0',
        data: {
          nested: {
            deeply: {
              nested: {
                data: Array.from({ length: 10 }, (_, i) => ({
                  id: i,
                  value: `item-${i}`,
                  metadata: {
                    created: new Date().toISOString(),
                    tags: ['tag1', 'tag2', 'tag3'],
                  },
                })),
              },
            },
          },
        },
        options: {
          complex: true,
          retry: 3,
          timeout: 5000,
          nestedOptions: {
            level1: {
              level2: {
                level3: 'deep-value',
              },
            },
          },
        },
      },
    };
  }
}
