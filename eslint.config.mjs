import { createRequire } from 'node:module';
import js from '@eslint/js';

const require = createRequire(import.meta.url);
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const nextPlugin = require('@next/eslint-plugin-next');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

const browserGlobals = {
  AbortController: 'readonly',
  Blob: 'readonly',
  DOMException: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  HTMLInputElement: 'readonly',
  Image: 'readonly',
  MouseEvent: 'readonly',
  Node: 'readonly',
  TextDecoder: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  console: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  setTimeout: 'readonly',
  window: 'readonly',
};

const nodeGlobals = {
  Buffer: 'readonly',
  console: 'readonly',
  process: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
};

const tsRules = {
  'no-undef': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-explicit-any': 'warn',
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['backend/src/**/*.ts', 'backend/prisma/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
      globals: nodeGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: tsRules,
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: 'module',
      },
      globals: browserGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@next/next': nextPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      next: {
        rootDir: ['frontend/'],
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...tsRules,
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
