import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/**/*.ts', 'packages/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        node: true,
        browser: true,
        es2020: true,
      },
    },
    rules: {
      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-unused-vars': 'off',
      'no-constant-condition': 'off',
      'no-useless-assignment': 'off',
      'no-control-regex': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'warn',

      // 对于未使用变量的规则 - 更宽松一些
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_', // 允许下划线开头的变量名
        caughtErrorsIgnorePattern: '^_' // 允许下划线开头的错误变量名
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'comma-dangle': ['warn', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never'
      }],
    },
  },
  {
    files: ['packages/**/__tests__/**/*.ts', 'packages/**/__tests__/**/*.tsx'],
    rules: {
      // 对于测试文件，直接关闭这个规则，因为测试文件经常会导入一些东西但不使用
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
);
