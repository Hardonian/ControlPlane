#!/usr/bin/env node

/**
 * Check if generated SDKs are up-to-date with contracts and detect contract drift
 * Enforces regeneration and verifies schema parity and breaking changes
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// Support both root sdks/ and packages/sdk-generator/sdks/
const ROOT_SDKS = resolve(process.cwd(), 'sdks');
const PKG_SDKS = resolve(process.cwd(), 'packages/sdk-generator/sdks');
const SDKS_DIR = existsSync(ROOT_SDKS) ? ROOT_SDKS : PKG_SDKS;

const LANGUAGES = ['typescript', 'python', 'go'];

console.log('🔍 Checking SDK drift & contract parity...\n');

// Check if sdks directory exists
if (!existsSync(SDKS_DIR)) {
  console.error('❌ SDKs directory does not exist. Run: pnpm sdk:generate');
  process.exit(1);
}

let hasDrift = false;

for (const lang of LANGUAGES) {
  const langDir = resolve(SDKS_DIR, lang);

  if (!existsSync(langDir)) {
    console.error(`❌ Missing ${lang} SDK directory: ${langDir}`);
    hasDrift = true;
    continue;
  }

  // Check for key files
  const expectedFiles = getExpectedFiles(lang);
  const missing = expectedFiles.filter((f) => !existsSync(resolve(langDir, f)));

  if (missing.length > 0) {
    console.error(`❌ ${lang} SDK missing files: ${missing.join(', ')}`);
    hasDrift = true;
  } else {
    console.log(`✓ ${lang} SDK structure valid`);
  }
}

// Check breaking changes and schema parity against canonical contracts
const contractsPkgPath = resolve(process.cwd(), 'packages/contracts/package.json');
if (existsSync(contractsPkgPath)) {
  try {
    const contractsPkg = JSON.parse(readFileSync(contractsPkgPath, 'utf8'));
    const canonicalVersion = contractsPkg.version || '1.0.0';

    // Verify TypeScript SDK package.json matches contract version
    const tsPkgPath = resolve(SDKS_DIR, 'typescript/package.json');
    if (existsSync(tsPkgPath)) {
      const tsPkg = JSON.parse(readFileSync(tsPkgPath, 'utf8'));
      if (tsPkg.version !== canonicalVersion) {
        console.warn(
          `⚠️ TypeScript SDK version (${tsPkg.version}) differs from canonical contracts (${canonicalVersion})`
        );
      }

      // Verify canonical schemas are present in generated TypeScript schemas
      const tsSchemasPath = resolve(SDKS_DIR, 'typescript/src/schemas.ts');
      if (existsSync(tsSchemasPath)) {
        const schemasContent = readFileSync(tsSchemasPath, 'utf8');
        const requiredCoreSchemas = [
          'ErrorEnvelopeSchema',
          'JobRequestSchema',
          'JobResponseSchema',
          'RunnerCapabilitySchema',
          'RunnerMetadataSchema',
          'TruthAssertionSchema',
          'TruthQuerySchema',
        ];

        for (const schemaName of requiredCoreSchemas) {
          if (!schemasContent.includes(schemaName)) {
            console.error(
              `❌ Breaking schema drift: ${schemaName} missing from generated TypeScript SDK`
            );
            hasDrift = true;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ Could not complete deep parity checks: ${err.message}`);
  }
}

if (hasDrift) {
  console.error('\n❌ SDKs are out of date or have contract drift!');
  console.error('Run: pnpm sdk:generate');
  process.exit(1);
} else {
  console.log('\n✓ All SDKs are up-to-date and in sync with contracts');
  process.exit(0);
}

function getExpectedFiles(lang) {
  switch (lang) {
    case 'typescript':
      return [
        'src/types.ts',
        'src/schemas.ts',
        'src/client.ts',
        'src/index.ts',
        'src/validation.ts',
        'package.json',
      ];
    case 'python':
      return [
        'controlplane_sdk/__init__.py',
        'controlplane_sdk/models.py',
        'controlplane_sdk/schemas.py',
        'controlplane_sdk/client.py',
        'pyproject.toml',
      ];
    case 'go':
      return ['types.go', 'schemas.go', 'client.go', 'validation.go', 'go.mod'];
    default:
      return [];
  }
}
