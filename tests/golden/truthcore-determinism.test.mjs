#!/usr/bin/env node
/**
 * TruthCore Determinism Golden Test
 *
 * Verifies that TruthCore evaluation is deterministic:
 * - Same input -> same evidence hash
 * - Stable sort of evidence items
 * - Stable hashing algorithm
 * - Rule engine outputs consistent decisions
 * - Adversarial inputs produce consistent results
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const resultsDir = path.join(repoRoot, 'test-results/golden');
mkdirSync(resultsDir, { recursive: true });

const adapterPath = path.join(repoRoot, 'scripts/adapters/runner-adapter.mjs');

let passed = 0;
let failed = 0;
const failures = [];

const assert = (label, condition, detail) => {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    failures.push({ label, detail });
    console.log(`  [FAIL] ${label}: ${detail || 'assertion failed'}`);
  }
};

const runTruthCore = (inputPath, outputPath) => {
  execFileSync('node', [
    adapterPath,
    '--runner', 'truthcore',
    '--input', inputPath,
    '--out', outputPath,
    '--format', 'json',
  ], { cwd: repoRoot, encoding: 'utf-8', timeout: 15000 });
  return JSON.parse(readFileSync(outputPath, 'utf-8'));
};

console.log('\nTruthCore Determinism Golden Tests\n' + '='.repeat(50));

// Test 1: Same input produces same evidence hash across 3 runs
console.log('\n--- Determinism: same input -> same hash ---');
const goldenInput = path.join(repoRoot, 'tests/fixtures/golden-input.json');
const hashes = [];
for (let i = 0; i < 3; i++) {
  const outPath = path.join(resultsDir, `determinism-run-${i}.json`);
  const report = runTruthCore(goldenInput, outPath);
  const evidence = report.data?.evidence;
  hashes.push(evidence?.hash);
}
assert('3 runs produce identical evidence hash', hashes[0] === hashes[1] && hashes[1] === hashes[2],
  `Hashes: ${JSON.stringify(hashes)}`);

// Test 2: Evidence items are sorted by key
console.log('\n--- Stable sort of evidence items ---');
{
  const outPath = path.join(resultsDir, 'sort-check.json');
  const report = runTruthCore(goldenInput, outPath);
  const items = report.data?.evidence?.items || [];
  const keys = items.map((i) => i.key);
  const sortedKeys = [...keys].sort();
  assert('Evidence items sorted by key', JSON.stringify(keys) === JSON.stringify(sortedKeys),
    `Keys: ${JSON.stringify(keys)}`);
}

// Test 3: Decision structure is complete
console.log('\n--- Decision structure validation ---');
{
  const outPath = path.join(resultsDir, 'decision-check.json');
  const report = runTruthCore(goldenInput, outPath);
  const decision = report.data?.evidence?.decision || report.data?.decision;
  assert('Decision has outcome', decision && typeof decision.outcome === 'string');
  assert('Decision has reasons array', decision && Array.isArray(decision.reasons));
  assert('Decision has confidence', decision && typeof decision.confidence === 'number');
  if (decision?.reasons) {
    for (const reason of decision.reasons) {
      assert(`Reason ${reason.ruleId} has message`, typeof reason.message === 'string');
      assert(`Reason ${reason.ruleId} has evidenceRefs`, Array.isArray(reason.evidenceRefs));
    }
  }
}

// Test 4: Adversarial input produces valid output
console.log('\n--- Adversarial input handling ---');
{
  const adversarialInput = path.join(repoRoot, 'tests/fixtures/adversarial-input.json');
  const outPath = path.join(resultsDir, 'adversarial-check.json');
  const report = runTruthCore(adversarialInput, outPath);
  assert('Adversarial input produces valid report', report.status === 'success');
  assert('Adversarial input has evidence', !!report.data?.evidence);

  // Check secret redaction
  const reportStr = JSON.stringify(report);
  assert('Secrets are redacted in output', !reportStr.includes('should-be-redacted'),
    'Found unredacted secret in output');
}

// Test 5: Hash algorithm is SHA-256
console.log('\n--- Hash algorithm verification ---');
{
  const outPath = path.join(resultsDir, 'hash-algo-check.json');
  const report = runTruthCore(goldenInput, outPath);
  const hash = report.data?.evidence?.hash;
  assert('Evidence hash is 64 hex chars (SHA-256)', hash && /^[a-f0-9]{64}$/.test(hash),
    `Hash: ${hash}`);
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.label}: ${f.detail || ''}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
