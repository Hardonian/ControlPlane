import { z } from 'zod';
import type { VersionedRunnerManifest, RegistryState } from '@controlplane/contracts';
import { VersionedRunnerManifest as VersionedRunnerManifestSchema } from '@controlplane/contracts';

/**
 * Deterministic Module Discovery and Registry
 *
 * Provides:
 * - Explicit search paths with stable ordering
 * - Load-time validation of all modules
 * - Centralized discovery logic
 * - JSON/text registry reports
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface DiscoveryConfig {
  /** Explicit search paths (in priority order) */
  paths: string[];

  /** Discovery options */
  options: {
    /** Follow symbolic links */
    followSymlinks: boolean;

    /** Maximum directory depth */
    maxDepth: number;

    /** Include hidden directories */
    includeHidden: boolean;

    /** Cache results */
    cache: boolean;

    /** Cache TTL in milliseconds */
    cacheTtlMs: number;
  };

  /** Validation configuration */
  validation: {
    /** Strict mode - fail on any validation error */
    strict: boolean;

    /** Validate schema compatibility */
    validateSchema: boolean;

    /** Check entrypoint exists */
    checkEntrypoint: boolean;

    /** Check required environment variables */
    checkRequiredEnv: boolean;

    /** Minimum contract version required */
    minimumContractVersion?: string;
  };
}

export interface DiscoveredModule {
  manifest: VersionedRunnerManifest;
  source: {
    path: string;
    type: 'runners' | 'cache' | 'sibling' | 'custom';
    discoveredAt: string;
  };
  status: 'valid' | 'invalid' | 'incompatible' | 'unreachable' | 'disabled';
  validation: {
    schemaValid: boolean;
    versionCompatible: boolean;
    entrypointExists: boolean;
    requiredEnvPresent: boolean;
    errors: string[];
  };
  lastValidatedAt: string;
}

// ============================================================================
// Default Discovery Configuration
// ============================================================================

export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  paths: [
    // Primary: runners directory
    './runners',

    // Secondary: cached repositories
    './.cache/repos',

    // Tertiary: sibling directories
    '../truthcore',
    '../JobForge',
    '../autopilot-suite',
    '../finops-autopilot',
    '../ops-autopilot',
    '../growth-autopilot',
    '../support-autopilot',
    '../aias',
  ],

  options: {
    followSymlinks: false,
    maxDepth: 2,
    includeHidden: false,
    cache: true,
    cacheTtlMs: 60000, // 1 minute
  },

  validation: {
    strict: false,
    validateSchema: true,
    checkEntrypoint: true,
    checkRequiredEnv: false,
    minimumContractVersion: '1.0.0',
  },
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a manifest against the versioned schema
 */
export function validateManifest(
  data: unknown,
  config: DiscoveryConfig['validation']
): { valid: boolean; errors: string[]; manifest?: VersionedRunnerManifest } {
  const errors: string[] = [];

  // Schema validation
  const result = VersionedRunnerManifestSchema.safeParse(data);

  if (!result.success) {
    errors.push(...result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));

    if (config.strict) {
      return { valid: false, errors };
    }
  }

  const manifest = result.data;

  if (!manifest) {
    return { valid: false, errors };
  }

  // Version compatibility check
  if (config.minimumContractVersion && config.validateSchema) {
    const minVersion = config.minimumContractVersion;
    const moduleVersion = manifest.contractVersion;

    if (!isVersionCompatible(moduleVersion, minVersion)) {
      errors.push(
        `Contract version ${moduleVersion} is not compatible ` +
          `with minimum required ${minVersion}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    manifest,
  };
}

/**
 * Check if a version meets minimum requirements
 */
function isVersionCompatible(version: string, minimum: string): boolean {
  const vParts = version.split('.').map(Number);
  const mParts = minimum.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const v = vParts[i] || 0;
    const m = mParts[i] || 0;

    if (v > m) return true;
    if (v < m) return false;
  }

  return true;
}

/**
 * Check if required environment variables are present
 */
export function checkRequiredEnv(required: string[]): {
  present: boolean;
  missing: string[];
} {
  const missing = required.filter((env) => !process.env[env]);

  return {
    present: missing.length === 0,
    missing,
  };
}

// ============================================================================
// Registry Report Generation
// ============================================================================

export interface RegistryReportOptions {
  format: 'json' | 'text' | 'markdown';
  includeErrors: boolean;
  includeWarnings: boolean;
  verbose: boolean;
}

export function generateRegistryReport(
  state: RegistryState,
  options: RegistryReportOptions
): string {
  switch (options.format) {
    case 'json':
      return generateJsonReport(state, options);
    case 'text':
      return generateTextReport(state, options);
    case 'markdown':
      return generateMarkdownReport(state, options);
    default:
      throw new Error(`Unknown report format: ${options.format}`);
  }
}

function generateJsonReport(state: RegistryState, options: RegistryReportOptions): string {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: state.summary,
    modules: state.modules.map((m) => ({
      name: m.manifest.name,
      version: m.manifest.version,
      status: m.status,
      source: m.source,
      ...(options.includeErrors && m.validation.errors.length > 0
        ? { errors: m.validation.errors }
        : {}),
    })),
    ...(options.verbose ? { discovery: state.discovery, validation: state.validation } : {}),
  };

  return JSON.stringify(report, null, 2);
}

function generateTextReport(state: RegistryState, options: RegistryReportOptions): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('Module Registry Report');
  lines.push('======================');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  // Summary
  lines.push('Summary');
  lines.push('-------');
  lines.push(`Total Modules: ${state.summary.total}`);
  lines.push(`  ✅ Valid: ${state.summary.valid}`);
  lines.push(`  ❌ Invalid: ${state.summary.invalid}`);
  lines.push(`  ⚠️  Incompatible: ${state.summary.incompatible}`);
  lines.push(`  🔴 Unreachable: ${state.summary.unreachable}`);
  lines.push(`  ⏸️  Disabled: ${state.summary.disabled}`);
  lines.push('');

  // Module details
  lines.push('Modules');
  lines.push('-------');

  for (const module of state.modules) {
    const icon = getStatusIcon(module.status);
    lines.push(`${icon} ${module.manifest.name}@${module.manifest.version}`);

    if (options.verbose) {
      lines.push(`   Source: ${module.source.type} (${module.source.path})`);
      lines.push(`   Capabilities: ${module.manifest.capabilities.join(', ') || 'none'}`);
    }

    if (options.includeErrors && module.validation.errors.length > 0) {
      for (const error of module.validation.errors) {
        lines.push(`   ⚠️  ${error}`);
      }
    }
  }

  lines.push('');

  return lines.join('\n');
}

function generateMarkdownReport(state: RegistryState, options: RegistryReportOptions): string {
  const lines: string[] = [];

  lines.push('# Module Registry Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total Modules | ${state.summary.total} |`);
  lines.push(`| ✅ Valid | ${state.summary.valid} |`);
  lines.push(`| ❌ Invalid | ${state.summary.invalid} |`);
  lines.push(`| ⚠️ Incompatible | ${state.summary.incompatible} |`);
  lines.push(`| 🔴 Unreachable | ${state.summary.unreachable} |`);
  lines.push(`| ⏸️ Disabled | ${state.summary.disabled} |`);
  lines.push('');

  // Module details
  lines.push('## Modules');
  lines.push('');
  lines.push('| Name | Version | Status | Source |');
  lines.push('|------|---------|--------|--------|');

  for (const module of state.modules) {
    const icon = getStatusIcon(module.status);
    lines.push(
      `| ${module.manifest.name} | ${module.manifest.version} | ` +
        `${icon} ${module.status} | ${module.source.type} |`
    );
  }

  lines.push('');

  return lines.join('\n');
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'valid':
      return '✅';
    case 'invalid':
      return '❌';
    case 'incompatible':
      return '⚠️';
    case 'unreachable':
      return '🔴';
    case 'disabled':
      return '⏸️';
    default:
      return '❓';
  }
}

// ============================================================================
// Registry Cache
// ============================================================================

export class RegistryCache {
  private cache: Map<string, { state: RegistryState; expiresAt: number }> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): RegistryState | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.state;
  }

  set(key: string, state: RegistryState, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    this.cache.set(key, { state, expiresAt });
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  isValid(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && Date.now() <= entry.expiresAt;
  }
}

// Export singleton instance
export const registryCache = new RegistryCache();
