import { SchemaDefinition, GeneratedSDK, SDKGeneratorConfig } from '../core.js';

export function generateTypeScriptSDK(
  schemas: SchemaDefinition[],
  config: SDKGeneratorConfig
): GeneratedSDK {
  const files = new Map<string, string>();

  const typesContent = generateTypesFile(schemas);
  files.set('src/types.ts', typesContent);

  const clientContent = generateClientFile(config);
  files.set('src/client.ts', clientContent);

  const indexContent = generateIndexFile();
  files.set('src/index.ts', indexContent);

  const validationContent = generateValidationFile(schemas);
  files.set('src/validation.ts', validationContent);

  const readmeContent = generateReadme('TypeScript', config);
  files.set('README.md', readmeContent);

  const packageConfig = {
    name: `${config.packagePrefix}/sdk`,
    version: config.sdkVersion,
    description: 'ControlPlane SDK for TypeScript - generated from canonical contracts',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
    },
    scripts: {
      build: 'tsup src/index.ts --format esm,cjs --dts',
      typecheck: 'tsc --noEmit',
      test: 'vitest run',
    },
    dependencies: {
      zod: '^3.22.4',
    },
    devDependencies: {
      '@types/node': '^20.10.0',
      tsup: '^8.0.1',
      typescript: '^5.3.3',
      vitest: '^1.1.0',
    },
    engines: {
      node: '>=18.0.0',
    },
    license: 'Apache-2.0',
  };

  return {
    language: 'typescript',
    files,
    packageConfig,
  };
}

function generateTypesFile(schemas: SchemaDefinition[]): string {
  const lines: string[] = [];
  lines.push('// Auto-generated from ControlPlane contracts');
  lines.push('// DO NOT EDIT MANUALLY - regenerate from source');
  lines.push('');
  lines.push("import { z } from 'zod';");
  lines.push('');

  const groupedSchemas = schemas.reduce(
    (acc, schema) => {
      if (!acc[schema.category]) acc[schema.category] = [];
      acc[schema.category].push(schema);
      return acc;
    },
    {} as Record<string, SchemaDefinition[]>
  );

  for (const [category, categorySchemas] of Object.entries(groupedSchemas) as [
    string,
    SchemaDefinition[],
  ][]) {
    lines.push(`// ${category.toUpperCase()} schemas`);
    lines.push('');

    for (const schema of categorySchemas) {
      lines.push(...generateSchemaCode(schema));
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateSchemaCode(schema: SchemaDefinition): string[] {
  const lines: string[] = [];
  const jsonSchema = schema.jsonSchema;

  if (jsonSchema.enum) {
    lines.push(
      `export type ${schema.name} = ${jsonSchema.enum.map((e: string) => `'${e}'`).join(' | ')};`
    );
    lines.push('');
    lines.push(`export const ${schema.name}Values = [`);
    for (const e of jsonSchema.enum) {
      lines.push(`  '${e}',`);
    }
    lines.push('] as const;');
  } else if (jsonSchema.type === 'object' && jsonSchema.properties) {
    lines.push(`export interface ${schema.name} {`);
    for (const [key, value] of Object.entries(jsonSchema.properties as Record<string, any>)) {
      const required = jsonSchema.required?.includes(key);
      const type = jsonSchemaTypeToTypeScript(value);
      lines.push(`  ${key}${required ? '' : '?'}: ${type};`);
    }
    lines.push('}');
  } else if (jsonSchema.anyOf || jsonSchema.oneOf) {
    const variants = jsonSchema.anyOf || jsonSchema.oneOf;
    const unionType = variants.map((v: any) => jsonSchemaTypeToTypeScript(v)).join(' | ');
    lines.push(`export type ${schema.name} = ${unionType};`);
  } else {
    lines.push(`export type ${schema.name} = ${jsonSchemaTypeToTypeScript(jsonSchema)};`);
  }

  return lines;
}

function jsonSchemaTypeToTypeScript(schema: any): string {
  if (!schema) return 'unknown';

  if (schema.$ref) {
    return schema.$ref.replace('#/definitions/', '');
  }

  if (schema.enum) {
    return schema.enum.map((e: string) => `'${e}'`).join(' | ');
  }

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return 'string'; // Date string
      if (schema.format === 'uuid') return 'string';
      if (schema.format === 'uri') return 'string';
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      if (schema.items) {
        return `${jsonSchemaTypeToTypeScript(schema.items)}[]`;
      }
      return 'unknown[]';
    case 'object':
      if (schema.additionalProperties) {
        return `Record<string, ${jsonSchemaTypeToTypeScript(schema.additionalProperties)}>`;
      }
      if (schema.properties) {
        const props = Object.entries(schema.properties as Record<string, any>)
          .map(([key, value]) => {
            const required = schema.required?.includes(key);
            return `${key}${required ? '' : '?'}: ${jsonSchemaTypeToTypeScript(value)}`;
          })
          .join('; ');
        return `{ ${props} }`;
      }
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

function generateClientFile(config: SDKGeneratorConfig): string {
  return `// Auto-generated ControlPlane SDK Client
// DO NOT EDIT MANUALLY - regenerate from source

import { ContractVersion } from './types.js';

export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export class ControlPlaneClient {
  private config: ClientConfig;
  private contractVersion: ContractVersion = {
    major: ${config.contractVersion.split('.')[0]},
    minor: ${config.contractVersion.split('.')[1]},
    patch: ${config.contractVersion.split('.')[2]},
  };

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  getContractVersion(): ContractVersion {
    return this.contractVersion;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': \`Bearer \${this.config.apiKey}\` }),
          'X-Contract-Version': this.serializeVersion(this.contractVersion),
          ...options?.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private serializeVersion(version: ContractVersion): string {
    return \`\${version.major}.\${version.minor}.\${version.patch}\`;
  }
}
`;
}

function generateIndexFile(): string {
  return `// Auto-generated ControlPlane SDK
// DO NOT EDIT MANUALLY - regenerate from source

export * from './types.js';
export * from './client.js';
export * from './validation.js';
`;
}

function generateValidationFile(schemas: SchemaDefinition[]): string {
  const lines: string[] = [];
  lines.push('// Auto-generated validation utilities');
  lines.push('// DO NOT EDIT MANUALLY - regenerate from source');
  lines.push('');
  lines.push("import { z } from 'zod';");
  lines.push('');
  lines.push('// Validation helpers for runtime type checking');
  lines.push('');
  lines.push('export function validate<T>(schema: z.ZodType<T>, data: unknown): T {');
  lines.push('  return schema.parse(data);');
  lines.push('}');
  lines.push('');
  lines.push(
    'export function safeValidate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {'
  );
  lines.push('  const result = schema.safeParse(data);');
  lines.push('  if (result.success) {');
  lines.push('    return { success: true, data: result.data };');
  lines.push('  }');
  lines.push('  return { success: false, error: result.error };');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

function generateReadme(language: string, config: SDKGeneratorConfig): string {
  return `# ControlPlane SDK for ${language}

Auto-generated SDK from ControlPlane contracts v${config.contractVersion}.

## Installation

\`\`\`bash
npm install ${config.packagePrefix}/sdk
\`\`\`

## Usage

\`\`\`typescript
import { ControlPlaneClient, JobRequest } from '${config.packagePrefix}/sdk';

const client = new ControlPlaneClient({
  baseUrl: 'https://api.controlplane.io',
  apiKey: process.env.CONTROLPLANE_API_KEY,
});
\`\`\`

## Versioning

This SDK follows semantic versioning and tracks the ControlPlane contract version:
- SDK version: ${config.sdkVersion}
- Contract version: ${config.contractVersion}

## Regeneration

This SDK is auto-generated. Do not edit manually.
To regenerate, run: \`sdk-gen --language typescript\`
`;
}
