#!/usr/bin/env node

/**
 * Smoke Test Script
 * 
 * Verifies all services in the ControlPlane stack are healthy.
 * Outputs a JSON smoke report suitable for CI/CD pipelines.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

interface ServiceCheck {
  name: string;
  url: string;
  status: 'passed' | 'failed' | 'skipped';
  responseTime: number;
  error?: string;
  version?: string;
}

interface SmokeReport {
  timestamp: string;
  environment: string;
  totalServices: number;
  passed: number;
  failed: number;
  duration: number;
  services: ServiceCheck[];
}

const SERVICES = [
  { name: 'TruthCore', url: process.env.TRUTHCORE_URL || 'http://localhost:3001' },
  { name: 'JobForge', url: process.env.JOBFORGE_URL || 'http://localhost:3002' },
  { name: 'Runner-Example', url: process.env.RUNNER_URL || 'http://localhost:3003' },
  { name: 'Redis', url: 'http://localhost:6379', skip: true }, // Redis doesn't have HTTP health endpoint
];

async function checkService(service: { name: string; url: string; skip?: boolean }): Promise<ServiceCheck> {
  const start = Date.now();
  
  if (service.skip) {
    return {
      name: service.name,
      url: service.url,
      status: 'skipped',
      responseTime: 0,
    };
  }

  try {
    const response = await fetch(`${service.url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    const responseTime = Date.now() - start;

    if (!response.ok) {
      return {
        name: service.name,
        url: service.url,
        status: 'failed',
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    
    return {
      name: service.name,
      url: service.url,
      status: data.status === 'healthy' ? 'passed' : 'failed',
      responseTime,
      version: data.version,
      error: data.status !== 'healthy' ? `Status: ${data.status}` : undefined,
    };
  } catch (error) {
    return {
      name: service.name,
      url: service.url,
      status: 'failed',
      responseTime: Date.now() - start,
      error: (error as Error).message,
    };
  }
}

async function main() {
  const start = Date.now();
  
  console.log('🔍 Running ControlPlane smoke tests...\n');

  const results: ServiceCheck[] = [];
  
  for (const service of SERVICES) {
    process.stdout.write(`Checking ${service.name}... `);
    const result = await checkService(service);
    results.push(result);
    
    if (result.status === 'passed') {
      console.log(`✅ (${result.responseTime}ms)`);
    } else if (result.status === 'skipped') {
      console.log(`⏭️  (skipped)`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  const duration = Date.now() - start;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  const report: SmokeReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    totalServices: SERVICES.length - skipped,
    passed,
    failed,
    duration,
    services: results,
  };

  // Write report to file
  const reportPath = join(process.cwd(), 'smoke-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Smoke Test Summary');
  console.log('='.repeat(50));
  console.log(`Total:     ${report.totalServices}`);
  console.log(`Passed:    ${passed} ✅`);
  console.log(`Failed:    ${failed} ❌`);
  console.log(`Duration:  ${duration}ms`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n✅ All smoke tests passed!');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} service(s) failed smoke tests`);
    console.log(`📄 Report written to: ${reportPath}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Smoke test error:', error);
  process.exit(2);
});
