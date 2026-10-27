import atlasng from '@atlasng/eslint-plugin';

/**
 * ESLint configuration built on the shared `@atlasng/eslint-plugin` configs.
 * Repo-specific rules, such as the selector prefix and the module boundaries, stay in this file.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  ...atlasng.configs['flat/base'],
  ...atlasng.configs['flat/javascript'],
  ...atlasng.configs['flat/typescript'],
  ...atlasng.configs['flat/angular'],
  ...atlasng.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'mhu', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'mhu', style: 'kebab-case' }],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
        },
      ],
    },
  },
];
