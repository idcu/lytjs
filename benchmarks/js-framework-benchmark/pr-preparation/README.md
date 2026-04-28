# PR 提交指南 — 将 Lyt.js 添加到 js-framework-benchmark

本指南详细说明如何将 Lyt.js 框架作为新实现提交到 [krausest/js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) 仓库。

## 前置条件

- Node.js >= v20.9.0
- npm >= 10.1.0
- Git
- Chrome 浏览器（用于运行 benchmark）

## 步骤 1: Fork 仓库

1. 访问 https://github.com/krausest/js-framework-benchmark
2. 点击右上角的 **Fork** 按钮
3. 克隆你 fork 的仓库到本地：

```bash
git clone https://github.com/<your-username>/js-framework-benchmark.git
cd js-framework-benchmark
```

## 步骤 2: 创建功能分支

```bash
git checkout -b add-lytjs-framework
```

## 步骤 3: 复制 Lyt.js 实现

### 3.1 Keyed 实现

将 Lyt.js 的 keyed 实现复制到 `frameworks/keyed/lytjs/` 目录：

```bash
# 创建目录
mkdir -p frameworks/keyed/lytjs/src

# 复制源文件
cp <lytjs-source>/benchmarks/js-framework-benchmark/lytjs/src/keyed-signal.ts frameworks/keyed/lytjs/src/main.ts
cp <lytjs-source>/benchmarks/js-framework-benchmark/lytjs/src/shared.ts frameworks/keyed/lytjs/src/shared.ts
```

### 3.2 Non-Keyed 实现

将 Lyt.js 的 non-keyed 实现复制到 `frameworks/non-keyed/lytjs/` 目录：

```bash
# 创建目录
mkdir -p frameworks/non-keyed/lytjs/src

# 复制源文件
cp <lytjs-source>/benchmarks/js-framework-benchmark/lytjs/src/non-keyed-signal.ts frameworks/non-keyed/lytjs/src/main.ts
cp <lytjs-source>/benchmarks/js-framework-benchmark/lytjs/src/shared.ts frameworks/non-keyed/lytjs/src/shared.ts
```

### 3.3 复制 Lyt.js 框架源码

将 Lyt.js 的核心包复制到各实现的 `src/` 目录中（因为 benchmark 要求通过 `npm install` + `npm run build-prod` 构建）：

```bash
# 对于 keyed 实现
cp -r <lytjs-source>/packages/reactivity frameworks/keyed/lytjs/src/reactivity
cp -r <lytjs-source>/packages/common frameworks/keyed/lytjs/src/common

# 对于 non-keyed 实现
cp -r <lytjs-source>/packages/reactivity frameworks/non-keyed/lytjs/src/reactivity
cp -r <lytjs-source>/packages/common frameworks/non-keyed/lytjs/src/common
```

## 步骤 4: 创建配置文件

### 4.1 Keyed `package.json`

在 `frameworks/keyed/lytjs/package.json` 中创建：

```json
{
  "name": "lytjs",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "js-framework-benchmark": {
    "frameworkHomeURL": "https://gitee.com/lytjs/lytjs",
    "customURL": false
  },
  "scripts": {
    "build-prod": "node esbuild.mjs",
    "dev": "node esbuild.mjs --dev"
  },
  "devDependencies": {
    "esbuild": "^0.20.0",
    "typescript": "^5.0.1"
  }
}
```

### 4.2 Non-Keyed `package.json`

在 `frameworks/non-keyed/lytjs/package.json` 中创建（同上）。

### 4.3 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

### 4.4 `esbuild.mjs` (构建脚本)

```javascript
import * as esbuild from 'esbuild';

const isDev = process.argv.includes('--dev');

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'esm',
  target: 'es2020',
  minify: !isDev,
  sourcemap: false,
  treeShaking: true,
  alias: {
    '@lytjs/reactivity/signal': './src/reactivity/signal.ts',
    '@lytjs/common': './src/common/index.ts',
  },
});

console.log(`Build ${isDev ? 'dev' : 'prod'} complete`);
```

### 4.5 `index.html`

使用 benchmark 提供的 bootstrap CSS，参考 `file-placement.md` 中的 HTML 模板。

## 步骤 5: 需要修改的配置文件列表

| 文件 | 修改内容 |
|------|----------|
| `frameworks/keyed/lytjs/package.json` | 新建：包配置 |
| `frameworks/keyed/lytjs/tsconfig.json` | 新建：TypeScript 配置 |
| `frameworks/keyed/lytjs/esbuild.mjs` | 新建：构建脚本 |
| `frameworks/keyed/lytjs/index.html` | 新建：HTML 入口 |
| `frameworks/keyed/lytjs/src/main.ts` | 新建：keyed benchmark 实现 |
| `frameworks/keyed/lytjs/src/shared.ts` | 新建：共享工具函数 |
| `frameworks/non-keyed/lytjs/package.json` | 新建：包配置 |
| `frameworks/non-keyed/lytjs/tsconfig.json` | 新建：TypeScript 配置 |
| `frameworks/non-keyed/lytjs/esbuild.mjs` | 新建：构建脚本 |
| `frameworks/non-keyed/lytjs/index.html` | 新建：HTML 入口 |
| `frameworks/non-keyed/lytjs/src/main.ts` | 新建：non-keyed benchmark 实现 |
| `frameworks/non-keyed/lytjs/src/shared.ts` | 新建：共享工具函数 |

## 步骤 6: 构建验证

```bash
# 进入 keyed 实现目录
cd frameworks/keyed/lytjs

# 安装依赖（必须支持 --ignore-scripts）
npm install --ignore-scripts

# 构建生产版本
npm run build-prod

# 验证构建产物
ls -la dist/
# 应该看到 dist/main.js

# 返回根目录
cd ../../..

# 对 non-keyed 实现重复上述步骤
cd frameworks/non-keyed/lytjs
npm install --ignore-scripts
npm run build-prod
ls -la dist/
cd ../../..
```

## 步骤 7: 本地运行 Benchmark

```bash
# 启动本地服务器
npm start

# 在另一个终端中运行 benchmark
cd webdriver-ts
npm ci
npm run compile

# 运行 keyed benchmark
npm run bench keyed/lytjs

# 运行 non-keyed benchmark
npm run bench non-keyed/lytjs

# 验证 keyed/non-keyed 分类是否正确
npm run isKeyed keyed/lytjs
```

## 步骤 8: 提交 PR

### 8.1 提交代码

```bash
git add frameworks/keyed/lytjs frameworks/non-keyed/lytjs
git commit -m "Add Lyt.js framework (keyed + non-keyed)"
git push origin add-lytjs-framework
```

### 8.2 创建 Pull Request

1. 访问你 fork 的仓库页面
2. 点击 **New Pull Request**
3. 填写 PR 描述（参考 `pr-description.md`）
4. 等待 CI 检查通过
5. 等待维护者审核

## 注意事项

- 所有依赖必须支持 `npm install --ignore-scripts` 安装
- 必须使用 benchmark 提供的 bootstrap CSS（位于 `css/` 目录）
- HTML 中的按钮 ID 必须与 benchmark 要求一致
- 导出的全局函数名必须符合 benchmark API 规范
- `npm run build-prod` 必须能成功构建
- 建议先在本地完整运行一次 benchmark 确保没有错误
