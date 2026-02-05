#!/usr/bin/env node
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRunnerManifests, runRunner } from './index.js';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

const exitWith = (code: number, message?: string): never => {
  if (message) {
    console.error(message);
  }
  process.exit(code);
};

const readJsonInput = (value: string) => {
  try {
    const filePath = path.isAbsolute(value)
      ? value
      : path.join(process.cwd(), value);
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as unknown;
  } catch (error) {
    try {
      return JSON.parse(value) as unknown;
    } catch (parseError) {
      throw new Error(`Unable to read input: ${value}`);
    }
  }
};

const getOption = (args: string[], name: string) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const command = process.argv[2];
const args = process.argv.slice(3);

const printHelp = () => {
  console.log(`ControlPlane CLI

Commands:
  controlplane doctor
  controlplane list
  controlplane run <runner> --input <file|json> --out <path>
  controlplane verify-integrations
`);
};

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

const run = async () => {
  if (command === 'doctor') {
    const runners = listRunnerManifests();
    console.log(
      JSON.stringify(
        {
          status: 'ok',
          node: process.version,
          runners: runners.length,
          repoRoot
        },
        null,
        2
      )
    );
    return;
  }

  if (command === 'list') {
    const runners = listRunnerManifests();
    console.log(JSON.stringify(runners, null, 2));
    return;
  }

  if (command === 'run') {
    const runner = args[0];
    if (!runner) {
      exitWith(1, 'Runner name is required.');
      return;
    }
    const inputValue = getOption(args, '--input');
    if (!inputValue) {
      exitWith(1, 'Missing --input <file|json>.');
      return;
    }
    const outputPath = getOption(args, '--out');
    if (!outputPath) {
      exitWith(1, 'Missing --out <path>.');
      return;
    }
    const input = readJsonInput(inputValue);
    const result = await runRunner({
      runner,
      input,
      outputPath
    });
    if (!result.validation.valid) {
      exitWith(
        2,
        `Report validation failed: ${result.validation.errors.join(', ')}`
      );
    }
    console.log(JSON.stringify(result.report, null, 2));
    return;
  }

  if (command === 'verify-integrations') {
    const runners = listRunnerManifests();
    const fixturePath = path.join(repoRoot, 'tests/fixtures/golden-input.json');
    const input = JSON.parse(readFileSync(fixturePath, 'utf-8')) as unknown;
    const resultsRoot = path.join(repoRoot, 'test-results');
    mkdirSync(resultsRoot, { recursive: true });
    const results = [] as { runner: string; ok: boolean; errors?: string[] }[];
    for (const runner of runners) {
      try {
        const outputPath = path.join(resultsRoot, `${runner.name}-report.json`);
        const result = await runRunner({
          runner: runner.name,
          input,
          outputPath,
          timeoutMs: 30_000
        });
        results.push({
          runner: runner.name,
          ok: result.validation.valid,
          errors: result.validation.errors
        });
      } catch (error) {
        results.push({
          runner: runner.name,
          ok: false,
          errors: [
            error instanceof Error ? error.message : 'Unknown execution error'
          ]
        });
      }
    }
    const failures = results.filter((result) => !result.ok);
    console.log(JSON.stringify({ results }, null, 2));
    if (failures.length > 0) {
      exitWith(2, `Integration verification failed for ${failures.length} runner(s).`);
    }
    return;
  }

  printHelp();
  exitWith(1, `Unknown command: ${command}`);
};

run().catch((error) => {
  exitWith(2, error instanceof Error ? error.message : 'Unexpected error');
});
