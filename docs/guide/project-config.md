# 项目配置

本文档介绍使用 LytJS 开发项目时的常见配置。

## TypeScript 配置

### tsconfig.json

推荐的基础 TypeScript 配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "jsxImportSource": "@lytjs/core",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

### 路径别名

在 `tsconfig.json` 中配置路径别名后，需要在构建工具中同步配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

## Vite 配置

### 基础配置

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### 环境变量

LytJS 使用 `import.meta.env` 访问环境变量：

```typescript
// .env.development
VITE_APP_TITLE=My App
VITE_API_BASE_URL=http://localhost:3000/api

// .env.production
VITE_APP_TITLE=My App
VITE_API_BASE_URL=https://api.example.com
```

```typescript
// 在代码中使用
console.log(import.meta.env.VITE_APP_TITLE);
console.log(import.meta.env.MODE); // 'development' | 'production'
```

## 代码规范

### ESLint

```bash
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

```javascript
// eslint.config.js
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
```

### Prettier

```bash
pnpm add -D prettier
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```
