#!/usr/bin/env node

import {
  runAllContractTestsDetailed,
  PredefinedTestSuites,
  type ContractTestResultDetail,
} from './index.js';
import chalk from 'chalk';

interface CLIOptions {
  format: 'pretty' | 'json' | 'junit';
  verbose: boolean;
  exitOnFailure: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  
  return {
    format: args.includes('--json') ? 'json' : args.includes('--junit') ? 'junit' : 'pretty',
    verbose: args.includes('--verbose') || args.includes('-v'),
    exitOnFailure: !args.includes('--no-exit-code'),
  };
}

function formatPretty(
  result: {
    passed: number;
    failed: number;
    details: string[];
    results: ContractTestResultDetail[];
  },
  verbose: boolean
): string {
  let output = '\n';
  output += chalk.bold.blue('╔══════════════════════════════════════════════════════════╗\n');
  output += chalk.bold.blue('║      ControlPlane Contract Test Results                 ║\n');
  output += chalk.bold.blue('╚══════════════════════════════════════════════════════════╝\n\n');
  
  const resultsBySuite = new Map<string, Map<string, ContractTestResultDetail>>();
  for (const detail of result.results) {
    if (!resultsBySuite.has(detail.suiteName)) {
      resultsBySuite.set(detail.suiteName, new Map());
    }
    resultsBySuite.get(detail.suiteName)?.set(detail.testName, detail);
  }

  for (const suite of PredefinedTestSuites) {
    output += chalk.bold.white(`${suite.name}\n`);
    output += chalk.gray('─'.repeat(50)) + '\n';
    
    for (const test of suite.tests) {
      const detail = resultsBySuite.get(suite.name)?.get(test.name);
      const actualValid = detail?.actualValid ?? false;
      const errors = detail?.errors ?? [];
      const success = actualValid === test.expectedValid;
      
      if (success) {
        output += chalk.green(`  ✓ ${test.name}\n`);
      } else {
        output += chalk.red(`  ✗ ${test.name}\n`);
        output += chalk.red(`    Expected: ${test.expectedValid ? 'valid' : 'invalid'}\n`);
        output += chalk.red(`    Actual: ${actualValid ? 'valid' : 'invalid'}\n`);
      }
      
      if (verbose && !success && errors.length > 0) {
        for (const error of errors) {
          output += chalk.yellow(`    - ${error.path}: ${error.message}\n`);
        }
      }
    }
    output += '\n';
  }
  
  output += chalk.gray('─'.repeat(50)) + '\n';
  output += chalk.bold('Summary:\n');
  output += chalk.green(`  ✓ Passed: ${result.passed}\n`);
  output += result.failed > 0 ? chalk.red(`  ✗ Failed: ${result.failed}\n`) : chalk.gray(`  ✗ Failed: ${result.failed}\n`);
  output += '\n';
  
  if (result.failed === 0) {
    output += chalk.bold.green('All contract tests passed! ✓\n');
  } else {
    output += chalk.bold.red(`${result.failed} contract test(s) failed.\n`);
  }
  
  return output;
}

function formatJSON(result: { passed: number; failed: number; details: string[] }): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    total: result.passed + result.failed,
    passed: result.passed,
    failed: result.failed,
    success: result.failed === 0,
    details: result.details,
  }, null, 2);
}

function formatJUnit(result: { passed: number; failed: number; details: string[] }): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuite name="Contract Tests" tests="${result.passed + result.failed}" failures="${result.failed}" timestamp="${new Date().toISOString()}">\n`;
  
  for (const detail of result.details) {
    const [name, counts] = detail.split(':');
    xml += `  <testcase name="${name.trim()}" classname="ContractTest">\n`;
    xml += `    <system-out>${counts.trim()}</system-out>\n`;
    xml += `  </testcase>\n`;
  }
  
  xml += '</testsuite>\n';
  return xml;
}

async function main() {
  const options = parseArgs();
  
  console.error(chalk.gray('Running ControlPlane contract tests...\n'));
  
  const detailedResult = runAllContractTestsDetailed();
  const result = {
    passed: detailedResult.passed,
    failed: detailedResult.failed,
    details: detailedResult.details,
  };
  
  let output: string;
  switch (options.format) {
    case 'json':
      output = formatJSON(result);
      break;
    case 'junit':
      output = formatJUnit(result);
      break;
    case 'pretty':
    default:
      output = formatPretty(detailedResult, options.verbose);
      break;
  }
  
  console.log(output);
  
  if (options.exitOnFailure && result.failed > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(2);
});
