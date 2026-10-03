import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('packages/contract-test-kit/dist/cli.js');

test('contract-test CLI reports success in JSON mode', async () => {
  const { stdout } = await execFileAsync(process.execPath, [cliPath, '--json'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
  });

  const payload = JSON.parse(stdout.trim()) as {
    success: boolean;
    failed: number;
    passed: number;
    total: number;
  };

  expect(payload.success).toBe(true);
  expect(payload.failed).toBe(0);
  expect(payload.total).toBeGreaterThan(0);
  expect(payload.passed).toBe(payload.total);
});

test('contract-test CLI reports valid JUnit XML', async () => {
  const { stdout } = await execFileAsync(process.execPath, [cliPath, '--junit'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
  });

  expect(stdout).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  expect(stdout).toContain('<testsuite name="Contract Tests"');
  expect(stdout).toContain('failures="0"');
  expect(stdout).toContain('</testsuite>');
});
