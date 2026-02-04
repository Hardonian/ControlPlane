import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as path from 'path';
import chalk from 'chalk';

export interface SchemaDefinition {
  name: string;
  schema: z.ZodTypeAny;
  jsonSchema: any;
  category: 'types' | 'errors' | 'versioning';
}

export interface GeneratedSDK {
  language: string;
  files: Map<string, string>;
  packageConfig: any;
}

export interface SDKGeneratorConfig {
  outputDir: string;
  sdkVersion: string;
  contractVersion: string;
  packagePrefix: string;
  organization: string;
}

export const DEFAULT_CONFIG: SDKGeneratorConfig = {
  outputDir: './sdks',
  sdkVersion: '1.0.0',
  contractVersion: '1.0.0',
  packagePrefix: '@controlplane',
  organization: 'controlplane',
};

export async function extractSchemas(): Promise<SchemaDefinition[]> {
  const schemas: SchemaDefinition[] = [];

  // Import from the contracts package dist
  const contracts = await import('@controlplane/contracts');

  // Define schema registry with category mapping
  const schemaRegistry: Array<{
    name: string;
    export: string;
    category: SchemaDefinition['category'];
  }> = [
    // Error schemas
    { name: 'ErrorSeverity', export: 'ErrorSeverity', category: 'errors' },
    { name: 'ErrorCategory', export: 'ErrorCategory', category: 'errors' },
    { name: 'RetryPolicy', export: 'RetryPolicy', category: 'errors' },
    { name: 'ErrorDetail', export: 'ErrorDetail', category: 'errors' },
    { name: 'ErrorEnvelope', export: 'ErrorEnvelope', category: 'errors' },

    // Versioning schemas
    { name: 'ContractVersion', export: 'ContractVersion', category: 'versioning' },
    { name: 'ContractRange', export: 'ContractRange', category: 'versioning' },

    // Type schemas - Jobs
    { name: 'JobId', export: 'JobId', category: 'types' },
    { name: 'JobStatus', export: 'JobStatus', category: 'types' },
    { name: 'JobPriority', export: 'JobPriority', category: 'types' },
    { name: 'JobMetadata', export: 'JobMetadata', category: 'types' },
    { name: 'JobPayload', export: 'JobPayload', category: 'types' },
    { name: 'JobRequest', export: 'JobRequest', category: 'types' },
    { name: 'JobResult', export: 'JobResult', category: 'types' },
    { name: 'JobResponse', export: 'JobResponse', category: 'types' },

    // Type schemas - Runners
    { name: 'RunnerCapability', export: 'RunnerCapability', category: 'types' },
    { name: 'RunnerMetadata', export: 'RunnerMetadata', category: 'types' },
    { name: 'RunnerRegistrationRequest', export: 'RunnerRegistrationRequest', category: 'types' },
    { name: 'RunnerRegistrationResponse', export: 'RunnerRegistrationResponse', category: 'types' },
    { name: 'RunnerHeartbeat', export: 'RunnerHeartbeat', category: 'types' },
    { name: 'ModuleManifest', export: 'ModuleManifest', category: 'types' },
    { name: 'RunnerExecutionRequest', export: 'RunnerExecutionRequest', category: 'types' },
    { name: 'RunnerExecutionResponse', export: 'RunnerExecutionResponse', category: 'types' },

    // Type schemas - Truth
    { name: 'TruthAssertion', export: 'TruthAssertion', category: 'types' },
    { name: 'TruthQuery', export: 'TruthQuery', category: 'types' },
    { name: 'TruthQueryResult', export: 'TruthQueryResult', category: 'types' },
    { name: 'TruthSubscription', export: 'TruthSubscription', category: 'types' },
    { name: 'TruthCoreRequest', export: 'TruthCoreRequest', category: 'types' },
    { name: 'TruthCoreResponse', export: 'TruthCoreResponse', category: 'types' },
    { name: 'ConsistencyLevel', export: 'ConsistencyLevel', category: 'types' },
    { name: 'TruthValue', export: 'TruthValue', category: 'types' },

    // Type schemas - Common
    { name: 'HealthStatus', export: 'HealthStatus', category: 'types' },
    { name: 'HealthCheck', export: 'HealthCheck', category: 'types' },
    { name: 'ServiceMetadata', export: 'ServiceMetadata', category: 'types' },
    { name: 'PaginatedRequest', export: 'PaginatedRequest', category: 'types' },
    { name: 'PaginatedResponse', export: 'PaginatedResponse', category: 'types' },
    { name: 'ApiRequest', export: 'ApiRequest', category: 'types' },
    { name: 'ApiResponse', export: 'ApiResponse', category: 'types' },

    // Type schemas - Registry
    { name: 'CapabilityRegistry', export: 'CapabilityRegistry', category: 'types' },
    { name: 'RegisteredRunner', export: 'RegisteredRunner', category: 'types' },
    { name: 'ConnectorConfig', export: 'ConnectorConfig', category: 'types' },
    { name: 'ConnectorType', export: 'ConnectorType', category: 'types' },
    { name: 'ConnectorInstance', export: 'ConnectorInstance', category: 'types' },
    { name: 'RunnerCategory', export: 'RunnerCategory', category: 'types' },
    { name: 'RegistryQuery', export: 'RegistryQuery', category: 'types' },
    { name: 'RegistryDiff', export: 'RegistryDiff', category: 'types' },

    // Type schemas - Marketplace
    { name: 'MarketplaceIndex', export: 'MarketplaceIndex', category: 'types' },
    { name: 'MarketplaceRunner', export: 'MarketplaceRunner', category: 'types' },
    { name: 'MarketplaceConnector', export: 'MarketplaceConnector', category: 'types' },
    { name: 'MarketplaceQuery', export: 'MarketplaceQuery', category: 'types' },
    { name: 'MarketplaceQueryResult', export: 'MarketplaceQueryResult', category: 'types' },
    { name: 'MarketplaceTrustSignals', export: 'MarketplaceTrustSignals', category: 'types' },
    { name: 'TrustStatus', export: 'TrustStatus', category: 'types' },
    { name: 'SecurityScanStatus', export: 'SecurityScanStatus', category: 'types' },
    { name: 'ContractTestStatus', export: 'ContractTestStatus', category: 'types' },
    { name: 'VerificationMethod', export: 'VerificationMethod', category: 'types' },
  ];

  for (const item of schemaRegistry) {
    const schema = contracts[item.export as keyof typeof contracts];
    if (schema instanceof z.ZodType) {
      try {
        // Cast to any to avoid deep type instantiation issues
        const jsonSchema = zodToJsonSchema(schema as any, item.name);
        schemas.push({
          name: item.name,
          schema: schema as z.ZodTypeAny,
          jsonSchema,
          category: item.category,
        });
      } catch (err) {
        console.warn(chalk.yellow(`Warning: Could not convert ${item.name} to JSON Schema`));
      }
    }
  }

  return schemas;
}

export function validateSchemas(schemas: SchemaDefinition[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const schema of schemas) {
    if (!schema.jsonSchema || typeof schema.jsonSchema !== 'object') {
      errors.push(`Schema ${schema.name} has invalid JSON Schema`);
    }

    if (!schema.name || typeof schema.name !== 'string') {
      errors.push(`Schema has invalid name`);
    }
  }

  const names = schemas.map((s) => s.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate schema names found: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
