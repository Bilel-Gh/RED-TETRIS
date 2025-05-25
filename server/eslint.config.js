import js from '@eslint/js';
// import nodePlugin from 'eslint-plugin-node'; // Temporarily remove direct plugin import if its config causes issues
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'coverage/'],
  },
  js.configs.recommended, // Using ESLint's recommended set
  // nodePlugin.configs.recommended, // Temporarily removed to avoid flat config issue
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node, // Ensure Node.js globals are defined
      },
    },
    rules: {
      // 'node/no-unpublished-import': ['error', { // Rule comes from eslint-plugin-node
      //   'allowModules': ['vitest']
      // }],
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '_', 'varsIgnorePattern': '^[A-Z_]' }],
      // Add any other server-specific rule overrides here
    },
  },
  // Configuration for test files
  {
    files: ['src/__tests__/**/*.js'],
    languageOptions: {
        globals: {
            describe: 'readonly',
            it: 'readonly',
            expect: 'readonly',
            vi: 'readonly',
            beforeEach: 'readonly',
            afterEach: 'readonly',
        }
    },
    // rules: { // 'node/no-extraneous-import' also comes from eslint-plugin-node
    //     'node/no-extraneous-import': 'off',
    // }
  }
];
