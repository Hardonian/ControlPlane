#!/usr/bin/env node
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRunnerManifests, runRunner } from './index.js';
import {
  validateEvidencePacket,
} from '@controlplane/contract-kit';

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
  } catch {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new Error(`Unable to read input: ${value}`);
    }
  }
};

const getOption = (args: string[], name: string) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const hasFlag = (args: string[], name: string) => args.includes(name);

const command = process.argv[2];
const args = process.argv.slice(3);

const printHelp = () => {
  console.log(`ControlPlane CLI

Commands:
  controlplane doctor                                  Aggregated health check
  controlplane list                                    List discovered runners
  controlplane plan                                    Dry-run discovery + validation
  controlplane run <runner> --input <file|json> --out <path>  Execute a runner
  controlplane run --smoke                             Smoke-test all runners
  controlplane verify-integrations                     Full integration verification

Exit Codes:
  0  Success
  1  Invalid arguments
  2  Execution/validation failure
`);
};

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

const run = async () => {
  if (command === 'doctor') {
    const runners = listRunnerManifests();

    const buildTargets = [
      'packages/contracts/dist',
      'packages/contract-kit/dist',
      'packages/controlplane/dist',
    ];
    const buildChecks = buildTargets.map((t) => ({
      target: t,
      exists: existsSync(path.join(repoRoot, t)),
    }));

    const schemaFiles = [
      'contracts/runner.manifest.schema.json',
      'contracts/events.schema.json',
      'contracts/reports.schema.json',
      'contracts/evidence.schema.json',
      'contracts/module.manifest.schema.json',
    ];
    const schemaChecks = schemaFiles.map((s) => ({
      schema: s,
      exists: existsSync(path.join(repoRoot, s)),
    }));

    const allBuildOk = buildChecks.every((b) => b.exists);
    const allSchemasOk = schemaChecks.every((s) => s.exists);

    console.log(
      JSON.stringify(
        {
          status: allBuildOk && allSchemasOk ? 'healthy' : 'degraded',
          node: process.version,
          runners: runners.length,
          runnerNames: runners.map((r) => r.name),
          repoRoot,
          builds: buildChecks,
          schemas: schemaChecks,
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

  if (command === 'plan') {
    const runners = listRunnerManifests();
    const fixturePath = path.join(repoRoot, 'tests/fixtures/golden-input.json');
    const fixtureExists = existsSync(fixturePath);

    const plan = {
      phase: 'plan',
      dryRun: true,
      timestamp: new Date().toISOString(),
      runnersDiscovered: runners.length,
      runners: runners.map((r) => ({
        name: r.name,
        version: r.version,
        capabilities: r.capabilities || [],
        entrypoint: `${r.entrypoint.command} ${r.entrypoint.args.join(' ')}`,
        manifestValid: true,
      })),
      goldenFixture: fixtureExists ? fixturePath : null,
      executionOrder: runners.map((r) => r.name),
      contractSchemas: [
        'runner.manifest.schema.json',
        'events.schema.json',
        'reports.schema.json',
        'evidence.schema.json',
        'module.manifest.schema.json',
      ],
      estimatedSteps: [
        'Discover runner manifests',
        'Validate all manifests against schema',
        'Load golden fixture input',
        ...runners.map((r) => `Execute ${r.name}`),
        'Validate all output reports',
        'Validate all evidence packets',
        'Aggregate results',
      ],
    };

    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (command === 'run') {
    if (hasFlag(args, '--smoke')) {
      const runners = listRunnerManifests();
      const fixturePath = path.join(repoRoot, 'tests/fixtures/golden-input.json');
      const input = JSON.parse(readFileSync(fixturePath, 'utf-8')) as unknown;
      const artifactsRoot = path.join(repoRoot, 'artifacts');
      mkdirSync(artifactsRoot, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const results = [] as {
        runner: string;
        ok: boolean;
        reportValid: boolean;
        evidenceValid: boolean;
        errors?: string[];
        artifactPath?: string;
      }[];

      for (const runner of runners) {
        const runnerArtifactDir = path.join(artifactsRoot, runner.name, timestamp);
        mkdirSync(runnerArtifactDir, { recursive: true });
        const outputPath = path.join(runnerArtifactDir, 'report.json');
        const evidencePath = path.join(runnerArtifactDir, 'evidence.json');

        try {
          const result = await runRunner({
            runner: runner.name,
            input,
            outputPath,
            timeoutMs: 30_000,
          });

          let evidenceValid = false;
          const reportData = result.report as Record<string, unknown> | undefined;
          if (reportData && typeof reportData === 'object') {
            const data = (reportData as Record<string, unknown>).data as Record<string, unknown> | undefined;
            if (data && typeof data === 'object' && data.evidence) {
              const evResult = validateEvidencePacket(data.evidence);
              evidenceValid = evResult.valid;
              writeFileSync(evidencePath, JSON.stringify(data.evidence, null, 2));
            }
          }

          results.push({
            runner: runner.name,
            ok: result.validation.valid,
            reportValid: result.validation.valid,
            evidenceValid,
            artifactPath: runnerArtifactDir,
            errors: result.validation.errors.length > 0 ? result.validation.errors : undefined,
          });
        } catch (error) {
          results.push({
            runner: runner.name,
            ok: false,
            reportValid: false,
            evidenceValid: false,
            errors: [error instanceof Error ? error.message : 'Unknown execution error'],
          });
        }
      }

      const failures = results.filter((r) => !r.ok);
      console.log(JSON.stringify({
        command: 'run --smoke',
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          passed: results.length - failures.length,
          failed: failures.length,
        },
      }, null, 2));

      if (failures.length > 0) {
        exitWith(2, `Smoke test failed for ${failures.length} runner(s).`);
      }
      return;
    }

    const runner = args[0];
    if (!runner || runner.startsWith('--')) {
      exitWith(1, 'Runner name is required. Usage: controlplane run <runner> --input <file|json> --out <path>');
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
      outputPath,
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
          timeoutMs: 30_000,
        });
        results.push({
          runner: runner.name,
          ok: result.validation.valid,
          errors: result.validation.errors,
        });
      } catch (error) {
        results.push({
          runner: runner.name,
          ok: false,
          errors: [
            error instanceof Error ? error.message : 'Unknown execution error',
          ],
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
