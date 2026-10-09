// Linting only. Playlive still ships exactly the files in this folder: eslint
// is a dev dependency like Playwright, never a build step.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'blob-report/**'] },
  js.configs.recommended,
  {
    rules: {
      // Storage and the iframe are wrapped in try/catch on purpose, and there
      // is nothing to do in the catch: the app carries on without them.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }]       // "x != null" is the idiom here
    }
  },
  {
    // The app and the example pages: ES modules in a browser
    files: ['src/**/*.js', 'examples/**/*.js'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, jsyaml: 'readonly' }   // js-yaml comes from cdnjs
    }
  },
  {
    // JS/TS mode's examples: CommonJS, as Jasmine and Mocha document it, with
    // the frameworks' globals.
    // Printing is what the Average example is about, so console is allowed.
    files: ['examples/javascript/*/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jasmine, ...globals.mocha }
    },
    rules: { 'no-console': 'off' }
  },
  {
    // Python mode's worker runs in a worker's globals, not a page's
    files: ['src/code/python/worker.js'],
    languageOptions: { globals: globals.worker }
  },
  {
    // hooks.js is loaded with a plain <script>, so it is not a module
    files: ['examples/html/hooks.js'],
    languageOptions: { sourceType: 'script' }
  },
  {
    // The test suite and the tooling run in Node
    files: ['tests/**/*.{js,mjs}', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser }      // page.evaluate bodies run in the browser
    },
    rules: { 'no-console': 'off' }                          // the test server says where it is listening
  },
];
