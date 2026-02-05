#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
};

const runner = getArg('--runner');
const inputValue = getArg('--input');
const outputValue = getArg('--out');
const format = getArg('--format') ?? 'json';

if (!runner) {
  console.error('Missing --runner <name>.');
  process.exit(1);
}

if (!inputValue) {
  console.error('Missing --input <file|json>.');
  process.exit(1);
}

if (!outputValue) {
  console.error('Missing --out <path>.');
  process.exit(1);
}

if (format !== 'json') {
  console.error('Only --format json is supported.');
  process.exit(1);
}

const readInput = (value) => {
  try {
    const filePath = path.isAbsolute(value)
      ? value
      : path.join(process.cwd(), value);
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    try {
      return JSON.parse(value);
    } catch (parseError) {
      throw new Error(`Unable to read input: ${value}`);
    }
  }
};

let input;
try {
  input = readInput(inputValue);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid input');
  process.exit(1);
}

const startedAt = new Date().toISOString();
const finishedAt = new Date().toISOString();
const report = {
  runner: {
    name: runner,
    version: '0.1.0',
    source: 'controlplane-adapter'
  },
  status: 'success',
  startedAt,
  finishedAt,
  summary: `Adapter executed for ${runner}`,
  metrics: {
    durationMs: 0
  },
  artifacts: [
    {
      name: 'input-echo',
      path: 'inline',
      mediaType: 'application/json'
    }
  ],
  errors: [],
  data: {
    input
  }
};

const outputPath = path.isAbsolute(outputValue)
  ? outputValue
  : path.join(process.cwd(), outputValue);
writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
