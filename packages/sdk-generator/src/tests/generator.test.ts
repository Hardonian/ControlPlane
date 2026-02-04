import { describe, it, expect } from 'vitest';
import { extractSchemas, validateSchemas, DEFAULT_CONFIG } from '../core.js';
import { generateTypeScriptSDK } from '../generators/typescript.js';
import { generatePythonSDK } from '../generators/python.js';
import { generateGoSDK } from '../generators/go.js';

describe('SDK Generator', () => {
  describe('Core functionality', () => {
    it('should extract schemas from contracts', async () => {
      const schemas = await extractSchemas();
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas.some((s) => s.name === 'JobRequest')).toBe(true);
      expect(schemas.some((s) => s.name === 'ErrorEnvelope')).toBe(true);
      expect(schemas.some((s) => s.name === 'ContractVersion')).toBe(true);
    });

    it('should validate schemas successfully', async () => {
      const schemas = await extractSchemas();
      const validation = validateSchemas(schemas);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect duplicate schema names', () => {
      const schemas = [
        { name: 'Test', schema: {} as any, jsonSchema: {}, category: 'types' as const },
        { name: 'Test', schema: {} as any, jsonSchema: {}, category: 'types' as const },
      ];
      const validation = validateSchemas(schemas);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate schema names found: Test');
    });
  });

  describe('TypeScript SDK', () => {
    it('should generate TypeScript SDK files', async () => {
      const schemas = await extractSchemas();
      const sdk = generateTypeScriptSDK(schemas, DEFAULT_CONFIG);

      expect(sdk.language).toBe('typescript');
      expect(sdk.files.has('src/types.ts')).toBe(true);
      expect(sdk.files.has('src/client.ts')).toBe(true);
      expect(sdk.files.has('src/index.ts')).toBe(true);
      expect(sdk.files.has('README.md')).toBe(true);
      expect(sdk.packageConfig.name).toBe('@controlplane/sdk');
    });

    it('should generate valid TypeScript types', async () => {
      const schemas = await extractSchemas();
      const sdk = generateTypeScriptSDK(schemas, DEFAULT_CONFIG);
      const typesContent = sdk.files.get('src/types.ts');

      expect(typesContent).toContain('export interface');
      expect(typesContent).toContain('export type');
      expect(typesContent).toContain('Auto-generated from ControlPlane contracts');
    });
  });

  describe('Python SDK', () => {
    it('should generate Python SDK files', async () => {
      const schemas = await extractSchemas();
      const sdk = generatePythonSDK(schemas, DEFAULT_CONFIG);

      expect(sdk.language).toBe('python');
      expect(sdk.files.has('controlplane_sdk/types.py')).toBe(true);
      expect(sdk.files.has('controlplane_sdk/client.py')).toBe(true);
      expect(sdk.files.has('controlplane_sdk/__init__.py')).toBe(true);
      expect(sdk.packageConfig.name).toBe('controlplane-sdk');
    });

    it('should generate valid Python code', async () => {
      const schemas = await extractSchemas();
      const sdk = generatePythonSDK(schemas, DEFAULT_CONFIG);
      const typesContent = sdk.files.get('controlplane_sdk/types.py');

      expect(typesContent).toContain('class');
      expect(typesContent).toContain('BaseModel');
      expect(typesContent).toContain('Auto-generated from ControlPlane contracts');
    });
  });

  describe('Go SDK', () => {
    it('should generate Go SDK files', async () => {
      const schemas = await extractSchemas();
      const sdk = generateGoSDK(schemas, DEFAULT_CONFIG);

      expect(sdk.language).toBe('go');
      expect(sdk.files.has('types.go')).toBe(true);
      expect(sdk.files.has('client.go')).toBe(true);
      expect(sdk.files.has('README.md')).toBe(true);
    });

    it('should generate valid Go code', async () => {
      const schemas = await extractSchemas();
      const sdk = generateGoSDK(schemas, DEFAULT_CONFIG);
      const typesContent = sdk.files.get('types.go');

      expect(typesContent).toContain('package controlplane');
      expect(typesContent).toContain('type');
      expect(typesContent).toContain('Auto-generated from ControlPlane contracts');
    });
  });
});
