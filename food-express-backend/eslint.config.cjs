const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        // Add Jest globals for test files
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',        // Ignore variables starting with _
        'varsIgnorePattern': '^_',        // Ignore variables starting with _
        'caughtErrors': 'none'            // Don't warn about unused catch parameters
      }],
      'no-undef': 'error',
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      'no-console': 'off',
      'no-empty': 'warn', // Change from error to warning for empty blocks
    },
  },
  {
    // Ignore ESLint config file itself from quote rules
    files: ['eslint.config.cjs', 'eslint.config.js'],
    rules: {
      'quotes': 'off',
    },
  },
];