import {
  CapabilityRegistry,
  RegisteredRunner,
  ConnectorInstance,
  RunnerCategory,
  RunnerCategoryDescriptions,
  createEmptyRegistry,
  calculateRegistryChecksum,
  PredefinedConnectors,
  TruthCoreCompatibility,
  ContractVersion,
  CONTRACT_VERSION_CURRENT,
} from '@controlplane/contracts';
import { glob } from 'glob';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface DiscoveryOptions {
  workspaceRoot: string;
  environment?: 'development' | 'staging' | 'production';
  includeOffline?: boolean;
}

export interface DiscoveryResult {
  registry: CapabilityRegistry;
  errors: string[];
  warnings: string[];
}

interface PackageManifest {
  name: string;
  version: string;
  controlplane?: {
    runner?: {
      category?: string;
      capabilities?: string[];
      connectors?: string[];
    };
  };
}

/**
 * Discover all runners from the workspace
 */
export async function discoverRunners(
  options: DiscoveryOptions
): Promise<{ runners: RegisteredRunner[]; errors: string[] }> {
  const runners: RegisteredRunner[] = [];
  const errors: string[] = [];

  try {
    // Look for runner manifests in services directory
    const servicePaths = glob.sync('services/*/package.json', {
      cwd: options.workspaceRoot,
      absolute: true,
    });

    for (const pkgPath of servicePaths) {
      try {
        const content = readFileSync(pkgPath, 'utf-8');
        const pkg: PackageManifest = JSON.parse(content);

        // Check if this is a runner package
        if (pkg.controlplane?.runner) {
          const runnerConfig = pkg.controlplane.runner;
          const category = (runnerConfig.category as RunnerCategory) || 'custom';

          // Create a mock runner metadata (in production, this would come from the actual service)
          const runner: RegisteredRunner = {
            metadata: {
              id: `${pkg.name}-${Date.now()}`,
              name: pkg.name,
              version: pkg.version,
              contractVersion: CONTRACT_VERSION_CURRENT,
              capabilities: [], // Would be populated from actual runner
              supportedContracts: ['1.0.0'],
              healthCheckEndpoint: `http://localhost:3000/health`,
              registeredAt: new Date().toISOString(),
              lastHeartbeatAt: new Date().toISOString(),
              status: 'healthy',
              tags: [category],
            },
            category,
            connectors: runnerConfig.connectors || [],
            health: {
              status: 'healthy',
              activeJobs: 0,
              queuedJobs: 0,
            },
            capabilities: [],
          };

          runners.push(runner);
        }
      } catch (error) {
        errors.push(`Failed to parse runner manifest at ${pkgPath}: ${error}`);
      }
    }

    // Also check for runner declarations in packages
    const packagePaths = glob.sync('packages/*/package.json', {
      cwd: options.workspaceRoot,
      absolute: true,
    });

    for (const pkgPath of packagePaths) {
      try {
        const content = readFileSync(pkgPath, 'utf-8');
        const pkg: PackageManifest = JSON.parse(content);

        // Skip the contracts and test-kit packages themselves
        if (
          pkg.name === '@controlplane/contracts' ||
          pkg.name === '@controlplane/contract-test-kit'
        ) {
          continue;
        }

        // Check for runner configuration
        if (pkg.controlplane?.runner) {
          const runnerConfig = pkg.controlplane.runner;
          const category = (runnerConfig.category as RunnerCategory) || 'custom';

          const runner: RegisteredRunner = {
            metadata: {
              id: `${pkg.name}-local`,
              name: pkg.name,
              version: pkg.version,
              contractVersion: CONTRACT_VERSION_CURRENT,
              capabilities: [],
              supportedContracts: ['1.0.0'],
              healthCheckEndpoint: 'http://localhost:3000/health',
              registeredAt: new Date().toISOString(),
              lastHeartbeatAt: new Date().toISOString(),
              status: 'offline',
              tags: [category, 'package'],
            },
            category,
            connectors: runnerConfig.connectors || [],
            health: {
              status: options.includeOffline ? 'offline' : 'healthy',
              activeJobs: 0,
              queuedJobs: 0,
            },
            capabilities: [],
          };

          runners.push(runner);
        }
      } catch (error) {
        errors.push(`Failed to parse package manifest at ${pkgPath}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to discover runners: ${error}`);
  }

  return { runners, errors };
}

/**
 * Discover connectors from configuration
 */
export async function discoverConnectors(
  options: DiscoveryOptions
): Promise<{ connectors: ConnectorInstance[]; errors: string[] }> {
  const connectors: ConnectorInstance[] = [];
  const errors: string[] = [];

  try {
    // Look for connector configuration files
    const configPaths = [
      join(options.workspaceRoot, 'config', 'connectors.json'),
      join(options.workspaceRoot, '.env'),
    ];

    // Check for environment-based connectors
    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          if (configPath.endsWith('.json')) {
            const content = readFileSync(configPath, 'utf-8');
            const config = JSON.parse(content);

            if (config.connectors && Array.isArray(config.connectors)) {
              for (const connConfig of config.connectors) {
                const predefined = PredefinedConnectors.find((c) => c.id === connConfig.id);
                if (predefined) {
                  connectors.push({
                    config: predefined,
                    status: 'unknown',
                    metadata: connConfig,
                  });
                }
              }
            }
          }
        } catch (error) {
          errors.push(`Failed to load connector config from ${configPath}: ${error}`);
        }
      }
    }

    // If no connectors found, add predefined ones as templates
    if (connectors.length === 0) {
      for (const predefined of PredefinedConnectors) {
        connectors.push({
          config: predefined,
          status: 'unknown',
          metadata: {},
        });
      }
    }
  } catch (error) {
    errors.push(`Failed to discover connectors: ${error}`);
  }

  return { connectors, errors };
}

/**
 * Get TruthCore compatibility information
 */
export function getTruthCoreCompatibility(): TruthCoreCompatibility {
  return {
    contractVersion: CONTRACT_VERSION_CURRENT,
    supportedVersions: {
      min: { major: 1, minor: 0, patch: 0 },
      max: { major: 1, minor: 0, patch: 999 },
    },
    features: ['assertions', 'queries', 'subscriptions', 'batch-operations'],
    breakingChanges: [],
    deprecatedFeatures: [],
  };
}

/**
 * Build the complete capability registry
 */
export async function buildCapabilityRegistry(options: DiscoveryOptions): Promise<DiscoveryResult> {
  const registry = createEmptyRegistry();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Set system info
  registry.system.environment = options.environment || 'development';

  // Set TruthCore compatibility
  registry.truthcore = getTruthCoreCompatibility();

  // Discover runners
  const { runners, errors: runnerErrors } = await discoverRunners(options);
  registry.runners = runners;
  errors.push(...runnerErrors);

  // Discover connectors
  const { connectors, errors: connectorErrors } = await discoverConnectors(options);
  registry.connectors = connectors;
  errors.push(...connectorErrors);

  // Calculate summary
  registry.summary = {
    totalRunners: runners.length,
    totalCapabilities: runners.reduce((sum, r) => sum + r.capabilities.length, 0),
    totalConnectors: connectors.length,
    healthyRunners: runners.filter((r) => r.health.status === 'healthy').length,
    healthyConnectors: connectors.filter((c) => c.status === 'connected').length,
    categories: runners.reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  // Update timestamp
  registry.generatedAt = new Date().toISOString();

  return { registry, errors, warnings };
}

/**
 * Filter registry by query parameters
 */
export function filterRegistry(
  registry: CapabilityRegistry,
  filters: {
    category?: RunnerCategory;
    healthStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'offline' | 'any';
  }
): CapabilityRegistry {
  const filtered = { ...registry };

  if (filters.category) {
    filtered.runners = filtered.runners.filter((r) => r.category === filters.category);
  }

  if (filters.healthStatus && filters.healthStatus !== 'any') {
    filtered.runners = filtered.runners.filter((r) => r.health.status === filters.healthStatus);
  }

  // Recalculate summary
  filtered.summary = {
    totalRunners: filtered.runners.length,
    totalCapabilities: filtered.runners.reduce((sum, r) => sum + r.capabilities.length, 0),
    totalConnectors: filtered.connectors.length,
    healthyRunners: filtered.runners.filter((r) => r.health.status === 'healthy').length,
    healthyConnectors: filtered.connectors.filter((c) => c.status === 'connected').length,
    categories: filtered.runners.reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  return filtered;
}

/**
 * Format registry for output
 */
export function formatRegistryOutput(
  registry: CapabilityRegistry,
  format: 'json' | 'yaml' | 'table' = 'json'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(registry, null, 2);

    case 'yaml':
      // Simple YAML-like formatting
      return `# ControlPlane Capability Registry
# Generated: ${registry.generatedAt}
# Version: ${registry.version}

system:
  name: ${registry.system.name}
  version: ${registry.system.version}
  environment: ${registry.system.environment}

truthcore:
  contractVersion: ${registry.truthcore.contractVersion.major}.${registry.truthcore.contractVersion.minor}.${registry.truthcore.contractVersion.patch}
  features:
${registry.truthcore.features.map((f) => `    - ${f}`).join('\n')}

runners:
${registry.runners
  .map(
    (r) => `  - name: ${r.metadata.name}
    category: ${r.category}
    status: ${r.health.status}
    connectors: [${r.connectors.join(', ')}]`
  )
  .join('\n')}

connectors:
${registry.connectors
  .map(
    (c) => `  - id: ${c.config.id}
    name: ${c.config.name}
    type: ${c.config.type}
    status: ${c.status}`
  )
  .join('\n')}

summary:
  totalRunners: ${registry.summary.totalRunners}
  totalCapabilities: ${registry.summary.totalCapabilities}
  totalConnectors: ${registry.summary.totalConnectors}
  healthyRunners: ${registry.summary.healthyRunners}
  healthyConnectors: ${registry.summary.healthyConnectors}
`;

    case 'table':
    default:
      return JSON.stringify(registry, null, 2);
  }
}

// Export category descriptions
export { RunnerCategoryDescriptions };
