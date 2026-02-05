import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRunnerManifest } from '@controlplane/contract-kit';

export type RunnerEntrypoint = {
  command: string;
  args: string[];
};

export type RunnerManifest = {
  name: string;
  version: string;
  description: string;
  entrypoint: RunnerEntrypoint;
  capabilities?: string[];
  requiredEnv?: string[];
  outputs?: string[];
  docs?: string;
};

export type RunnerRecord = RunnerManifest & {
  source: string;
};

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..'
);

const runnerRoots = [
  path.join(repoRoot, 'runners'),
  path.join(repoRoot, '.cache', 'repos')
];

const readJson = (filePath: string) => {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
};

const isManifestFile = (filePath: string) =>
  filePath.endsWith('runner.manifest.json');

const collectManifestFiles = () => {
  const manifests: string[] = [];
  for (const root of runnerRoots) {
    try {
      const entries = readdirSync(root);
      for (const entry of entries) {
        const fullPath = path.join(root, entry);
        if (statSync(fullPath).isDirectory()) {
          const manifestPath = path.join(fullPath, 'runner.manifest.json');
          if (statSync(manifestPath, { throwIfNoEntry: false })) {
            manifests.push(manifestPath);
          }
        } else if (isManifestFile(fullPath)) {
          manifests.push(fullPath);
        }
      }
    } catch {
      continue;
    }
  }
  return manifests;
};

const parseManifest = (filePath: string): RunnerRecord => {
  const payload = readJson(filePath);
  const result = validateRunnerManifest(payload);
  if (!result.valid) {
    throw new Error(
      `Invalid runner manifest at ${filePath}: ${result.errors.join(', ')}`
    );
  }
  return {
    ...(payload as RunnerManifest),
    source: filePath
  };
};

export const listRunners = (): RunnerRecord[] => {
  const manifests = collectManifestFiles();
  return manifests.map(parseManifest);
};

export const resolveRunner = (
  name: string,
  versionRange?: string
): RunnerRecord => {
  const runners = listRunners().filter((runner) => runner.name === name);
  if (runners.length === 0) {
    throw new Error(`Runner not found: ${name}`);
  }
  if (!versionRange) return runners[0];
  const exact = runners.find((runner) => runner.version === versionRange);
  if (!exact) {
    throw new Error(`Runner ${name} does not satisfy ${versionRange}`);
  }
  return exact;
};
