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

  // TypeScript 规则（不使用 project，提高速度，类型检查交给 tsc --noEmit）
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

  // TypeScript 特定规则（所有自定义规则都保留）
  {
    files: ['**/*.ts', '**/*.tsx'],
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
      // 这些规则需要类型信息，暂时关闭，让 lint 更快，类型检查交给 tsc --noEmit
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      // 禁止使用 as unknown as 双重类型断言（P1-2.2.1）
      // 推荐使用 @lytjs/common-assertions 中的 unsafeCast 或其他安全替代方案
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[type.annotation.typeName.name="unknown"] > TSAsExpression',
          message:
            '禁止使用 "as unknown as" 双重类型断言。请使用 @lytjs/common-assertions 中的 unsafeCast<T>() 或其他更安全的类型断言方式。',
        },
      ],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
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

  // devtools 扩展浏览器脚本（运行于浏览器环境，非 Node）
  {
    files: ['packages/tools/packages/devtools/extension/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
  },

  // benchmarks 浏览器基准脚本与 server.js
  {
    files: [
      'benchmarks/js-framework-benchmark/frameworks/**/main*.js',
      'benchmarks/js-framework-benchmark/frameworks/**/server.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // reactivity 临时调试脚本（不参与发布）
  {
    files: ['packages/reactivity/debug-*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-console': 'off',
    },
  },

  // CommonJS 脚本（.cjs 允许 require）
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Prettier 兼容（必须放最后）
  eslintConfigPrettier,
);
