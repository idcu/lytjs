import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 全局忽略
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'packages/_templates/**',
    ],
  },

  // 基础 JS 规则
  js.configs.recommended,

  // TypeScript 规则
  ...tseslint.configs.recommended,

  // 全局配置
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
  },

  // TypeScript 特定规则
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.base.json',
          './packages/*/tsconfig.json',
          './packages/common/packages/*/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: false,
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
    },
  },

  // 没有 tsconfig.json 的目录，禁用 parserOptions.project（必须在 TypeScript 规则之后，以覆盖 project 设置）
  {
    files: [
      'e2e/**/*',
      'benchmarks/**/*',
      'scripts/**/*',
      '**/tsup.config.ts',
      '**/vitest.config.ts',
      '**/tests/**/*.ts',
      '**/tests/**/*.tsx',
      '**/tests/setup.ts',
      '**/tests/helpers.ts',
      'docs/.vitepress/**/*',
    ],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      // 这些规则需要 type information，在 project: null 时必须禁用
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      // 测试和配置文件放宽规则
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
    },
  },

  // 测试文件宽松规则
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // 脚本文件宽松规则
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Prettier 兼容（必须放最后）
  eslintConfigPrettier,
);
