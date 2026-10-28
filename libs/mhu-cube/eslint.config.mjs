import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    // Shipped code declares its return types; specs, test helpers and the harness may infer them.
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', 'src/testing/**', 'harness/**'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true, allowHigherOrderFunctions: true },
      ],
    },
  },
  {
    files: ['**/package.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
            '{projectRoot}/**/testing/**',
            // The manual browser harness is a dev tool and never part of the package.
            '{projectRoot}/harness/**',
          ],
        },
      ],
    },
  },
];
