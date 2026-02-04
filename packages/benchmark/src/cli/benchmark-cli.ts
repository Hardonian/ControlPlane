#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { BenchmarkEngine } from '../benchmark-engine.js';
import { BenchmarkReporter } from '../reporter.js';
import type { BenchmarkSuite, BenchmarkConfig } from '../contracts/index.js';
import { writeFileSync } from 'fs';

const program = new Command();

program
  .name('cp-benchmark')
  .description('ControlPlane Performance Benchmark Suite')
  .version('1.0.0');

program
  .option(
    '-s, --suite <type>',
    'Benchmark suite to run (throughput|latency|truthcore|runner|contract|queue|health|all)',
    'all'
  )
  .option('-d, --duration <ms>', 'Benchmark duration in milliseconds', '30000')
  .option('-c, --concurrency <n>', 'Number of concurrent workers', '10')
  .option('-w, --warmup <ms>', 'Warmup duration in milliseconds', '5000')
  .option('--truthcore <url>', 'TruthCore URL', 'http://localhost:3001')
  .option('--jobforge <url>', 'JobForge URL', 'http://localhost:3002')
  .option('--runner <url>', 'Runner URL', 'http://localhost:3003')
  .option('-f, --format <format>', 'Output format (json|table|markdown)', 'table')
  .option('-o, --output <path>', 'Output file path (optional)')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--target-rps <rps>', 'Target requests per second (optional)')
  .option('--iterations <n>', 'Number of iterations for contract validation', '10000')
  .option('--threshold-error-rate <rate>', 'Maximum acceptable error rate (0-1)', '0.05')
  .option('--threshold-max-latency <ms>', 'Maximum acceptable latency in ms')
  .option('--threshold-min-throughput <rps>', 'Minimum acceptable throughput')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('\n🏃 ControlPlane Benchmark Suite\n'));

      const config = createBenchmarkConfig(options);
      const suite = createBenchmarkSuite(options.suite, config, {
        truthcore: options.truthcore,
        jobforge: options.jobforge,
        runner: options.runner,
      });

      const engine = new BenchmarkEngine({
        truthcoreUrl: options.truthcore,
        jobforgeUrl: options.jobforge,
        runnerUrl: options.runner,
        verbose: options.verbose,
      });

      const report = await engine.runSuite(suite);

      const reporter = new BenchmarkReporter(options.format);
      const output = reporter.report(report);

      console.log(output);

      if (options.output) {
        writeFileSync(options.output, JSON.stringify(report, null, 2));
        console.log(chalk.green(`\n✅ Report saved to: ${options.output}\n`));
      }

      const exitCode = report.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    } catch (error) {
      console.error(chalk.red('\n❌ Benchmark failed:'), error);
      process.exit(1);
    }
  });

function createBenchmarkConfig(options: any): BenchmarkConfig {
  const thresholds: any = {};

  if (options.thresholdErrorRate !== undefined) {
    thresholds.maxErrorRate = parseFloat(options.thresholdErrorRate);
  }

  if (options.thresholdMaxLatency !== undefined) {
    thresholds.maxLatencyMs = parseInt(options.thresholdMaxLatency);
  }

  if (options.thresholdMinThroughput !== undefined) {
    thresholds.minThroughput = parseFloat(options.thresholdMinThroughput);
  }

  return {
    name: 'benchmark',
    description: 'ControlPlane performance benchmark',
    suite: options.suite,
    durationMs: parseInt(options.duration),
    warmupMs: parseInt(options.warmup),
    concurrency: parseInt(options.concurrency),
    targetRps: options.targetRps ? parseFloat(options.targetRps) : undefined,
    iterations: options.iterations ? parseInt(options.iterations) : undefined,
    thresholds,
  };
}

function createBenchmarkSuite(
  suiteType: string,
  baseConfig: BenchmarkConfig,
  urls: { truthcore: string; jobforge: string; runner: string }
): BenchmarkSuite {
  const configs: BenchmarkConfig[] = [];

  const suiteDescriptions: Record<string, { name: string; desc: string }> = {
    throughput: {
      name: 'Job Throughput Benchmark',
      desc: 'Measures job submission and acceptance rate',
    },
    latency: {
      name: 'End-to-End Latency Benchmark',
      desc: 'Measures complete job lifecycle latency',
    },
    truthcore: {
      name: 'TruthCore Query Benchmark',
      desc: 'Measures assertion and query performance',
    },
    runner: {
      name: 'Runner Scaling Benchmark',
      desc: 'Measures runner performance at different concurrency levels',
    },
    contract: {
      name: 'Contract Validation Benchmark',
      desc: 'Measures Zod schema validation performance',
    },
    queue: {
      name: 'Queue Performance Benchmark',
      desc: 'Measures message queue enqueue/dequeue rates',
    },
    health: {
      name: 'Health Check Performance Benchmark',
      desc: 'Measures health endpoint response times',
    },
    all: {
      name: 'Complete Benchmark Suite',
      desc: 'Runs all benchmark suites',
    },
  };

  const desc = suiteDescriptions[suiteType] || suiteDescriptions.all;

  if (suiteType === 'all') {
    const suiteTypes: Array<BenchmarkConfig['suite']> = [
      'throughput',
      'latency',
      'truthcore',
      'runner',
      'contract',
      'queue',
      'health',
    ];

    for (const type of suiteTypes) {
      const typeDesc = suiteDescriptions[type];
      configs.push({
        ...baseConfig,
        suite: type,
        name: typeDesc.name,
        description: typeDesc.desc,
        durationMs: Math.floor(baseConfig.durationMs / suiteTypes.length),
      });
    }
  } else {
    configs.push({
      ...baseConfig,
      suite: suiteType as BenchmarkConfig['suite'],
      name: desc.name,
      description: desc.desc,
    });
  }

  return {
    id: crypto.randomUUID(),
    name: desc.name,
    description: desc.desc,
    configs,
    globalConfig: {
      truthcoreUrl: urls.truthcore,
      jobforgeUrl: urls.jobforge,
      runnerUrl: urls.runner,
      outputFormat: 'table',
      verbose: false,
    },
  };
}

program.parse();
