/**
 * Lyt CLI 增强版项目脚手架模块
 * 实现 `lytx create <name>` 命令，支持多种模板和功能选项
 * 纯 Node.js 原生实现，不依赖任何第三方包
 */

import * as path from 'path';
import { ensureDir, writeFile, fileExists, colorText, logger } from './utils';

// ============================================================
// 类型定义
// ============================================================

/** 增强版脚手架选项 */
export interface ScaffoldOptions {
  /** 项目名称 */
  name: string;
  /** 项目模板类型 */
  template: 'spa' | 'ssr' | 'ssg';
  /** 是否使用 TypeScript */
  ts: boolean;
  /** 是否包含路由 */
  router: boolean;
  /** 是否包含状态管理 */
  store: boolean;
  /** 是否包含 ESLint 配置 */
  eslint: boolean;
}

/** 项目文件定义 */
interface ProjectFile {
  /** 相对于项目根目录的文件路径 */
  filePath: string;
  /** 文件内容生成函数或字符串 */
  content: string;
}

// ============================================================
// 模板内容生成器
// ============================================================

/**
 * 生成 package.json
 */
function generatePackageJson(options: ScaffoldOptions): string {
  const pkg: Record<string, any> = {
    name: options.name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'lytx dev',
      build: 'lytx build',
      preview: 'lytx preview',
    },
    dependencies: {
      lyt: '^2.0.0',
    },
  };

  if (options.ts) {
    pkg.devDependencies = {
      typescript: '^5.0.0',
    };
  }

  if (options.eslint) {
    pkg.devDependencies = pkg.devDependencies || {};
    pkg.devDependencies.eslint = '^8.0.0';
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.lint = 'eslint src --ext .ts,.js';
  }

  if (options.router) {
    pkg.dependencies['@lytjs/router'] = '^2.0.0';
  }

  if (options.store) {
    pkg.dependencies['@lytjs/store'] = '^2.0.0';
  }

  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * 生成 tsconfig.json
 */
function generateTsConfig(options: ScaffoldOptions): string {
  const config: Record<string, any> = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      jsx: 'preserve',
      resolveJsonModule: true,
      isolatedModules: true,
      esModuleInterop: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      noEmit: true,
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['node_modules', 'dist'],
  };

  if (options.template === 'ssr') {
    config.compilerOptions.types = ['node'];
  }

  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * 生成 index.html
 */
function generateIndexHtml(options: ScaffoldOptions): string {
  const ext = options.ts ? '.ts' : '.js';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <title>${options.name}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main${ext}"></script>
</body>
</html>
`;
}

/**
 * 生成 lytx.config.ts
 */
function generateLytxConfig(options: ScaffoldOptions): string {
  const configLines: string[] = [
    `// Lytx 配置文件`,
    `import { defineConfig } from 'lyt'`,
    ``,
    `export default defineConfig({`,
    `  // 构建模式`,
    `  mode: '${options.template}',`,
  ];

  if (options.router) {
    configLines.push(`  // 路由配置`);
    configLines.push(`  router: {`);
    configLines.push(`    historyMode: true,`);
    configLines.push(`  },`);
  }

  if (options.store) {
    configLines.push(`  // 状态管理配置`);
    configLines.push(`  store: {`);
    configLines.push(`    strict: true,`);
    configLines.push(`  },`);
  }

  configLines.push(`})`);
  configLines.push(``);

  return configLines.join('\n');
}

/**
 * 生成 src/main.ts
 */
function generateMainTs(options: ScaffoldOptions): string {
  const ext = options.ts ? '.ts' : '.js';
  const lines: string[] = [
    `import { createApp } from 'lyt'`,
    `import App from './App.lyt'`,
    `import './styles/main.css'`,
  ];

  if (options.router) {
    lines.push(`import { router } from './router'`);
  }

  if (options.store) {
    lines.push(`import { store } from './store'`);
  }

  lines.push(``);
  lines.push(`// 创建应用实例`);
  lines.push(`const app = createApp(App)`);

  if (options.router) {
    lines.push(`app.use(router)`);
  }

  if (options.store) {
    lines.push(`app.use(store)`);
  }

  lines.push(``);
  lines.push(`// 将应用挂载到 #app 元素`);
  lines.push(`app.mount('#app')`);

  return lines.join('\n') + '\n';
}

/**
 * 生成 src/App.lyt (SFC 根组件)
 */
function generateAppLyt(): string {
  return `<template>
  <div class="app">
    <Header />
    <main>
      <h1>Hello Lyt!</h1>
      <p>欢迎使用 Lyt 框架</p>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'lyt'
import Header from './components/Header'

export default defineComponent({
  name: 'App',
  components: {
    Header,
  },
})
</script>

<style scoped>
.app {
  text-align: center;
  padding: 20px;
}
</style>
`;
}

/**
 * 生成 src/pages/index.ts (首页)
 */
function generatePageIndex(): string {
  return `import { defineComponent } from 'lyt'

export default defineComponent({
  name: 'HomePage',

  template: \`
    <div class="page-home">
      <h1>首页</h1>
      <p>这是首页内容</p>
    </div>
  \`,
})
`;
}

/**
 * 生成 src/pages/about.ts (关于页)
 */
function generatePageAbout(): string {
  return `import { defineComponent } from 'lyt'

export default defineComponent({
  name: 'AboutPage',

  template: \`
    <div class="page-about">
      <h1>关于</h1>
      <p>这是关于页面</p>
    </div>
  \`,
})
`;
}

/**
 * 生成 src/components/Header.ts
 */
function generateComponentHeader(): string {
  return `import { defineComponent } from 'lyt'

export default defineComponent({
  name: 'Header',

  template: \`
    <header class="header">
      <nav>
        <a href="/">首页</a>
        <a href="/about">关于</a>
      </nav>
    </header>
  \`,
})
`;
}

/**
 * 生成 src/router/index.ts
 */
function generateRouterIndex(): string {
  return `import { createRouter, createWebHistory } from '@lytjs/router'
import HomePage from '../pages/index'
import AboutPage from '../pages/about'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomePage,
    },
    {
      path: '/about',
      component: AboutPage,
    },
  ],
})
`;
}

/**
 * 生成 src/store/index.ts
 */
function generateStoreIndex(): string {
  return `import { createStore } from '@lytjs/store'

export const store = createStore({
  state: {
    count: 0,
    message: 'Hello Lyt!',
  },

  mutations: {
    increment(state: any) {
      state.count++
    },

    setMessage(state: any, message: string) {
      state.message = message
    },
  },

  actions: {
    async fetchMessage({ commit }: any) {
      commit('setMessage', 'Fetched from API')
    },
  },

  getters: {
    doubleCount: (state: any) => state.count * 2,
  },
})
`;
}

/**
 * 生成 src/styles/main.css
 */
function generateMainCss(): string {
  return `/* 全局样式 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

a {
  color: #42b883;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
`;
}

/**
 * 生成 public/favicon.svg
 */
function generateFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#42b883"/>
  <text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-weight="bold">L</text>
</svg>
`;
}

/**
 * 生成 .eslintrc.json (如果 eslint: true)
 */
function generateEslintConfig(): string {
  const config = {
    root: true,
    env: {
      browser: true,
      es2021: true,
      node: true,
    },
    extends: ['eslint:recommended'],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  };
  return JSON.stringify(config, null, 2) + '\n';
}

// ============================================================
// 核心功能
// ============================================================

/**
 * 创建新的 Lyt 项目（增强版脚手架）
 *
 * @param options - 脚手架选项
 *
 * 生成的项目结构：
 * ```
 * <name>/
 * ├── package.json
 * ├── tsconfig.json
 * ├── index.html
 * ├── lytx.config.ts
 * ├── src/
 * │   ├── main.ts
 * │   ├── App.lyt
 * │   ├── pages/
 * │   │   ├── index.ts
 * │   │   └── about.ts
 * │   ├── components/
 * │   │   └── Header.ts
 * │   ├── router/
 * │   │   └── index.ts       (if router: true)
 * │   ├── store/
 * │   │   └── index.ts       (if store: true)
 * │   └── styles/
 * │       └── main.css
 * └── public/
 *     └── favicon.svg
 * ```
 */
export async function createProject(options: ScaffoldOptions): Promise<void> {
  const { name, template, ts, router, store, eslint } = options;
  const targetDir = path.resolve(process.cwd(), name);

  logger.info(`正在创建 Lyt 项目: ${colorText(name, 'brightCyan')}`);
  logger.info(`使用模板: ${colorText(template, 'brightCyan')}`);

  // 检查目标目录是否已存在
  if (fileExists(targetDir)) {
    logger.error(`目录 "${name}" 已存在，请选择其他名称或删除已有目录`);
    throw new Error(`Directory "${name}" already exists`);
  }

  // 创建项目根目录
  ensureDir(targetDir);

  // 定义所有需要生成的文件
  const files: ProjectFile[] = [
    {
      filePath: 'package.json',
      content: generatePackageJson(options),
    },
    {
      filePath: 'index.html',
      content: generateIndexHtml(options),
    },
    {
      filePath: 'lytx.config.ts',
      content: generateLytxConfig(options),
    },
    {
      filePath: 'src/main.ts',
      content: generateMainTs(options),
    },
    {
      filePath: 'src/App.lyt',
      content: generateAppLyt(),
    },
    {
      filePath: 'src/pages/index.ts',
      content: generatePageIndex(),
    },
    {
      filePath: 'src/pages/about.ts',
      content: generatePageAbout(),
    },
    {
      filePath: 'src/components/Header.ts',
      content: generateComponentHeader(),
    },
    {
      filePath: 'src/styles/main.css',
      content: generateMainCss(),
    },
    {
      filePath: 'public/favicon.svg',
      content: generateFaviconSvg(),
    },
  ];

  // TypeScript 配置
  if (ts) {
    files.push({
      filePath: 'tsconfig.json',
      content: generateTsConfig(options),
    });
  }

  // 路由
  if (router) {
    files.push({
      filePath: 'src/router/index.ts',
      content: generateRouterIndex(),
    });
  }

  // 状态管理
  if (store) {
    files.push({
      filePath: 'src/store/index.ts',
      content: generateStoreIndex(),
    });
  }

  // ESLint
  if (eslint) {
    files.push({
      filePath: '.eslintrc.json',
      content: generateEslintConfig(),
    });
  }

  // 逐个创建文件
  for (const file of files) {
    const fullPath = path.join(targetDir, file.filePath);
    writeFile(fullPath, file.content);
    logger.success(`  创建 ${file.filePath}`);
  }

  // 输出完成信息
  console.log('');
  logger.success(`项目 ${colorText(name, 'brightCyan')} 创建成功！`);
  console.log('');
  console.log(`  请执行以下命令启动项目：`);
  console.log('');
  console.log(`    ${colorText('cd', 'brightGreen')} ${name}`);
  console.log(`    ${colorText('npm install', 'brightGreen')}`);
  console.log(`    ${colorText('npm run dev', 'brightGreen')}`);
  console.log('');
}
