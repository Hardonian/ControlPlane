import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateReport,
  type ValidationResult
} from '@controlplane/contract-kit';
import { listRunners, resolveRunner, type RunnerRecord } from './registry/index.js';
import {
  runEntrypoint,
  readJsonFile,
  ensureAbsolutePath,
  type InvocationResult
} from './invoke/index.js';

export type RunRunnerOptions = {
  runner: string;
  input: unknown;
  outputPath?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

export type RunnerExecution = {
  runner: RunnerRecord;
  invocation: InvocationResult;
  report: unknown;
  validation: ValidationResult;
};

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

const writeInputFile = (input: unknown, cwd: string) => {
  const inputPath = path.join(cwd, `controlplane-input-${Date.now()}.json`);
  writeFileSync(inputPath, JSON.stringify(input, null, 2));
  return inputPath;
};

const buildArgs = (baseArgs: string[], inputPath: string, outputPath: string) => {
  const args = [...baseArgs];
  if (!args.includes('--input')) {
    args.push('--input', inputPath);
  }
  if (!args.includes('--out')) {
    args.push('--out', outputPath);
  }
  if (!args.includes('--format')) {
    args.push('--format', 'json');
  }
  return args;
};

export const runRunner = async (
  options: RunRunnerOptions
): Promise<RunnerExecution> => {
  const runner = resolveRunner(options.runner);
  const cwd = repoRoot;
  const inputPath = writeInputFile(options.input, cwd);
  const outputPath = ensureAbsolutePath(
    options.outputPath ?? path.join(cwd, `${runner.name}-report.json`),
    cwd
  );

  const args = buildArgs(runner.entrypoint.args, inputPath, outputPath);
  const invocation = await runEntrypoint(runner.entrypoint.command, args, {
    cwd,
    env: options.env,
    timeoutMs: options.timeoutMs,
    redactEnvKeys: runner.requiredEnv ?? []
  });

  const report = readJsonFile(outputPath);
  const validation = validateReport(report);

  return {
    runner,
    invocation,
    report,
    validation
  };
};

export const listRunnerManifests = () => listRunners();

export const validateReportPayload = validateReport;

export { discoverSiblings, findMissingSiblings } from './discovery.js';
export type { SiblingRepo, SiblingManifest } from './discovery.js';
export { validateCompatibility } from './compatibility.js';
export type { CompatCheck, CompatReport } from './compatibility.js';
export { ControlPlaneError, Errors, formatError } from './errors.js';
export type { ErrorCode } from './errors.js';

export class ControlPlaneClient {
  listRunners() {
    return listRunnerManifests();
  }

  async runRunner(options: RunRunnerOptions) {
    return runRunner(options);
  }

  validateReport(payload: unknown) {
    return validateReportPayload(payload);
  }
}
