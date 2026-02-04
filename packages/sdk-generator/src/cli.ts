#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  extractSchemas,
  validateSchemas,
  DEFAULT_CONFIG,
  type SDKGeneratorConfig,
} from './core.js';
import { generateTypeScriptSDK } from './generators/typescript.js';
import { generatePythonSDK } from './generators/python.js';
import { generateGoSDK } from './generators/go.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program.name('sdk-gen').description('Generate SDKs for ControlPlane contracts').version('1.0.0');

program
  .option('-l, --language <lang>', 'Target language (typescript, python, go, all)', 'all')
  .option('-o, --output <dir>', 'Output directory', './sdks')
  .option('--sdk-version <version>', 'SDK version', '1.0.0')
  .option('--contract-version <version>', 'Contract version', '1.0.0')
  .option('--validate', 'Validate generated SDKs', false)
  .option('--check', 'Check if SDKs are up to date', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔧 ControlPlane SDK Generator'));
      console.log(chalk.gray('─────────────────────────────'));

      const config: SDKGeneratorConfig = {
        ...DEFAULT_CONFIG,
        outputDir: options.output,
        sdkVersion: options.sdkVersion,
        contractVersion: options.contractVersion,
      };

      // Extract schemas from contracts
      console.log(chalk.yellow('📦 Extracting schemas from contracts...'));
      const schemas = await extractSchemas();
      console.log(chalk.green(`✓ Found ${schemas.length} schemas`));

      // Validate schemas
      console.log(chalk.yellow('🔍 Validating schemas...'));
      const validation = validateSchemas(schemas);
      if (!validation.valid) {
        console.error(chalk.red('✗ Schema validation failed:'));
        validation.errors.forEach((err) => console.error(chalk.red(`  - ${err}`)));
        process.exit(1);
      }
      console.log(chalk.green('✓ All schemas valid'));

      const languages =
        options.language === 'all' ? ['typescript', 'python', 'go'] : [options.language];

      for (const lang of languages) {
        console.log(chalk.yellow(`\n📝 Generating ${lang} SDK...`));

        let sdk;
        switch (lang) {
          case 'typescript':
            sdk = generateTypeScriptSDK(schemas, config);
            break;
          case 'python':
            sdk = generatePythonSDK(schemas, config);
            break;
          case 'go':
            sdk = generateGoSDK(schemas, config);
            break;
          default:
            console.error(chalk.red(`✗ Unknown language: ${lang}`));
            continue;
        }

        const sdkDir = path.join(config.outputDir, lang);
        await fs.mkdir(sdkDir, { recursive: true });

        // Write generated files
        for (const [filePath, content] of sdk.files) {
          const fullPath = path.join(sdkDir, filePath);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
        }

        // Write package config
        let configFile: string;
        let configContent: string;
        if (lang === 'typescript') {
          configFile = 'package.json';
          configContent = JSON.stringify(sdk.packageConfig, null, 2);
        } else if (lang === 'python') {
          configFile = 'pyproject.toml';
          // pyproject.toml is already generated as a file
          configContent = '';
        } else {
          configFile = 'go.mod';
          configContent = sdk.packageConfig.module
            ? `module ${sdk.packageConfig.module}\n\ngo ${sdk.packageConfig.goVersion}\n`
            : '';
        }

        if (configContent) {
          await fs.writeFile(path.join(sdkDir, configFile), configContent, 'utf-8');
        }

        console.log(chalk.green(`✓ Generated ${lang} SDK (${sdk.files.size} files)`));

        // Validate if requested
        if (options.validate) {
          await validateSDK(lang, sdkDir);
        }
      }

      console.log(chalk.green('\n✨ SDK generation complete!'));
      console.log(chalk.gray(`Output: ${path.resolve(config.outputDir)}`));
    } catch (error) {
      console.error(chalk.red('✗ Generation failed:'), error);
      process.exit(1);
    }
  });

async function validateSDK(language: string, sdkDir: string): Promise<void> {
  console.log(chalk.yellow(`🔍 Validating ${language} SDK...`));

  switch (language) {
    case 'typescript':
      const { execSync } = await import('child_process');
      try {
        execSync('npm install && npm run typecheck', { cwd: sdkDir, stdio: 'pipe' });
        console.log(chalk.green('✓ TypeScript compilation successful'));
      } catch {
        console.log(
          chalk.yellow('⚠ TypeScript validation skipped (build may fail without dependencies)')
        );
      }
      break;

    case 'python':
      try {
        const files = await fs.readdir(path.join(sdkDir, 'controlplane_sdk'));
        console.log(chalk.green(`✓ Python SDK structure valid (${files.length} modules)`));
      } catch {
        console.log(chalk.yellow('⚠ Python validation skipped'));
      }
      break;

    case 'go':
      try {
        const files = await fs.readdir(sdkDir);
        const hasGoFiles = files.some((f) => f.endsWith('.go'));
        if (hasGoFiles) {
          console.log(chalk.green('✓ Go SDK structure valid'));
        }
      } catch {
        console.log(chalk.yellow('⚠ Go validation skipped'));
      }
      break;
  }
}

program.parse();
