// Polyfill TypeScript 5/6 compiler constants required by @typescript-eslint / ts-api-utils under TypeScript 7
try {
  const fs = require('fs');
  const path = require('path');
  const ts = require('typescript');

  // If running with TypeScript 7 native, patch with TS 5.x compiler API from pnpm store if present
  let ts5;
  const pnpmDir = path.resolve(__dirname, 'node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const tsEntry = fs.readdirSync(pnpmDir).find((d) => d.startsWith('typescript@5.'));
    if (tsEntry) {
      try {
        ts5 = require(path.join(pnpmDir, tsEntry, 'node_modules/typescript'));
      } catch {}
    }
  }

  if (ts5) {
    Object.assign(ts, ts5);
  }

  if (ts && !ts.TypeFlags) {
    ts.TypeFlags = {
      Any: 1,
      Unknown: 2,
      String: 4,
      Number: 8,
      Boolean: 16,
      Enum: 32,
      BigInt: 64,
      StringLiteral: 128,
      NumberLiteral: 256,
      BooleanLiteral: 512,
      EnumLiteral: 1024,
      BigIntLiteral: 2048,
      ESSymbol: 4096,
      UniqueESSymbol: 8192,
      Void: 16384,
      Undefined: 32768,
      Null: 65536,
      Never: 131072,
      TypeParameter: 262144,
      Object: 524288,
      Union: 1048576,
      Intersection: 2097152,
      Index: 4194304,
      IndexedAccess: 8388608,
      Conditional: 16777216,
      Substitution: 33554432,
      NonPrimitive: 67108864,
      TemplateLiteral: 134217728,
      StringMapping: 268435456,
      Intrinsic: 67108864,
    };
  }
  if (ts && !ts.ObjectFlags) {
    ts.ObjectFlags = {
      Class: 1,
      Interface: 2,
      Reference: 4,
      Tuple: 8,
      Anonymous: 16,
      Mapped: 32,
      Instantiated: 64,
      ObjectLiteral: 128,
      EvolvingArray: 256,
      ObjectRestType: 512,
      ReverseMapped: 1024,
      JsxAttributes: 2048,
      MarkerType: 4096,
      JSLiteral: 8192,
      FreshLiteral: 16384,
      ArrayLiteral: 32768,
      ClassOrInterface: 3,
    };
  }
  if (ts && !ts.SymbolFlags) {
    ts.SymbolFlags = {
      None: 0,
      FunctionScopedVariable: 1,
      BlockScopedVariable: 2,
      Property: 4,
      EnumMember: 8,
      Function: 16,
      Class: 32,
      Interface: 64,
      ConstEnum: 128,
      RegularEnum: 256,
      ValueModule: 512,
      NamespaceModule: 1024,
      TypeLiteral: 2048,
      ObjectLiteral: 4096,
      Method: 8192,
      Constructor: 16384,
      GetAccessor: 32768,
      SetAccessor: 65536,
      TypeAlias: 524288,
    };
  }
  if (ts && !ts.SyntaxKind) {
    ts.SyntaxKind = {};
  }
  if (ts && !ts.Extension) {
    ts.Extension = {
      Ts: '.ts',
      Tsx: '.tsx',
      Dts: '.d.ts',
      Js: '.js',
      Jsx: '.jsx',
      Json: '.json',
      TsBuildInfo: '.tsbuildinfo',
      Mjs: '.mjs',
      Mts: '.mts',
      Dmts: '.d.mts',
      Cjs: '.cjs',
      Cts: '.cts',
      Dcts: '.d.cts',
    };
  }
  if (ts && !ts.ScriptTarget) {
    ts.ScriptTarget = {
      ES3: 0,
      ES5: 1,
      ES2015: 2,
      ES2016: 3,
      ES2017: 4,
      ES2018: 5,
      ES2019: 6,
      ES2020: 7,
      ES2021: 8,
      ES2022: 9,
      ES2023: 10,
      ESNext: 99,
      JSON: 100,
      Latest: 99,
    };
  }
  if (ts && !ts.ScriptKind) {
    ts.ScriptKind = {
      Unknown: 0,
      JS: 1,
      JSX: 2,
      TS: 3,
      TSX: 4,
      External: 5,
      JSON: 6,
      Deferred: 7,
    };
  }
  if (ts && !ts.ModuleKind) {
    ts.ModuleKind = {
      None: 0,
      CommonJS: 1,
      AMD: 2,
      UMD: 3,
      System: 4,
      ES2015: 5,
      ES2020: 6,
      ES2022: 7,
      ESNext: 99,
      Node16: 100,
      NodeNext: 199,
    };
  }
  if (ts && !ts.ModuleResolutionKind) {
    ts.ModuleResolutionKind = {
      Classic: 1,
      NodeJs: 2,
      Node16: 3,
      NodeNext: 99,
      Bundler: 100,
    };
  }
  if (ts && !ts.JsxEmit) {
    ts.JsxEmit = {
      None: 0,
      Preserve: 1,
      React: 2,
      ReactNative: 3,
      ReactJSX: 4,
      ReactJSXDev: 5,
    };
  }
} catch {
  // Ignore
}

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
  },
};
