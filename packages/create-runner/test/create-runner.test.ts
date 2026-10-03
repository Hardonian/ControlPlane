import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('create-runner CLI scaffolding', () => {
  const testDir = join(tmpdir(), `test-runner-${Date.now()}`);
  const runnerName = 'test-scaffolded-runner';
  const runnerPath = join(testDir, runnerName);

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('scaffolds a queue-worker runner with valid manifest and contracts', async () => {
    const cliPath = join(__dirname, '..', 'dist', 'cli.js');

    const { stdout } = await execFileAsync(process.execPath, [
      cliPath,
      runnerName,
      '--template',
      'queue-worker',
      '--directory',
      testDir,
      '--skip-install',
      '--skip-git',
    ]);

    expect(stdout).toContain('Runner scaffolded successfully');
    expect(existsSync(join(runnerPath, 'package.json'))).toBe(true);
    expect(existsSync(join(runnerPath, 'runner.manifest.json'))).toBe(true);
    expect(existsSync(join(runnerPath, 'CAPABILITY.md'))).toBe(true);
    expect(existsSync(join(runnerPath, 'schemas', 'input.json'))).toBe(true);
    expect(existsSync(join(runnerPath, 'schemas', 'output.json'))).toBe(true);
    expect(existsSync(join(runnerPath, 'test', 'contract.test.ts'))).toBe(true);

    // Validate runner.manifest.json
    const manifest = JSON.parse(readFileSync(join(runnerPath, 'runner.manifest.json'), 'utf8'));
    expect(manifest.name).toBe(runnerName);
    expect(manifest.entrypoint.command).toBe('node');
    expect(manifest.capabilities).toContain('execute');

    // Validate generated contract test contains valid schema fields
    const testCode = readFileSync(join(runnerPath, 'test', 'contract.test.ts'), 'utf8');
    expect(testCode).toContain('JobRequest');
    expect(testCode).toContain('RunnerCapability');
    expect(testCode).toContain('HealthCheck');
    expect(testCode).toContain('maxConcurrency: 10');
  });

  it('scaffolds an http-connector runner successfully', async () => {
    const cliPath = join(__dirname, '..', 'dist', 'cli.js');

    const { stdout } = await execFileAsync(process.execPath, [
      cliPath,
      'test-http-runner',
      '--template',
      'http-connector',
      '--directory',
      testDir,
      '--skip-install',
      '--skip-git',
    ]);

    expect(stdout).toContain('Runner scaffolded successfully');
    expect(existsSync(join(testDir, 'test-http-runner', 'runner.manifest.json'))).toBe(true);
  });
});
