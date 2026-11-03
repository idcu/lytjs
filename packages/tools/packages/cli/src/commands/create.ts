/**
 * @lytjs/cli - create command
 *
 * Creates a new LytJS project from a template.
 */

import type { CreateOptions } from '../types';
import { logger } from '../utils/logger';
import { ensureDir, writeFile, exists, isEmptyDir } from '../utils/fs';
import { detectPackageManager, getInstallCommand } from '../utils/package';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const TEMPLATES = {
  default: 'Default template with TypeScript and Vite',
  minimal: 'Minimal template without extra dependencies',
  ssr: 'SSR-enabled template',
  router: 'Template with Router integration',
  store: 'Template with Store integration',
  full: 'Full-featured template with Router, Store, and UI components',
};

/**
 * Create a new LytJS project
 */
export async function create(
  projectName?: string,
  options: Partial<CreateOptions> = {},
): Promise<void> {
  if (!projectName) {
    logger.error('Please provide a project name.');
    logger.info('Usage: lyt create <project-name>');
    process.exit(1);
  }
  const targetDir = resolve(process.cwd(), projectName);

  // Check if directory exists and is not empty
  if (exists(targetDir) && !isEmptyDir(targetDir) && !options.force) {
    logger.error(`Directory "${projectName}" already exists and is not empty.`);
    logger.info('Use --force to overwrite.');
    process.exit(1);
  }

  logger.info(`Creating a new LytJS project in ${targetDir}...`);

  // Create directory
  ensureDir(targetDir);

  // Generate project files
  generateProjectFiles(targetDir, projectName, options.template || 'default');

  // Install dependencies
  logger.info('Installing dependencies...');
  const pm = detectPackageManager();
  try {
    execSync(getInstallCommand(pm), { cwd: targetDir, stdio: 'inherit' });
    logger.success('Dependencies installed successfully!');
  } catch (_error) {
    logger.warning('Failed to install dependencies automatically.');
    logger.info(`Please run "${getInstallCommand(pm)}" manually.`);
  }

  // Print next steps
  logger.success(`Project "${projectName}" created successfully!`);
  logger.info('');
  logger.heading('Next steps:');
  logger.info(`  cd ${projectName}`);
  logger.info(`  ${pm === 'npm' ? 'npm run' : pm} dev`);
}

/**
 * Generate project files
 *
 * ⚠️ 2026-11-03：导出以便**门禁直接对生成的目录做自洽性校验**
 *   （`scripts/check-scaffold.mjs`）。此前只能对模板源码做正则断言 ——
 *   「模板字符串里写对了」不等于「生成出来的项目能用」。
 */
export function generateProjectFiles(
  targetDir: string,
  projectName: string,
  template: string,
): void {
  // Determine template-specific settings
  const isMinimal = template === 'minimal';
  const isSsr = template === 'ssr';
  const isRouter = template === 'router' || template === 'full';
  const isStore = template === 'store' || template === 'full';
  const isFull = template === 'full';

  // package.json - use explicit type to allow property access
  interface PackageJsonTemplate {
    name: string;
    version: string;
    type: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }

  const packageJson: PackageJsonTemplate = {
    name: projectName,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      // ⚠️ 版本必须与主仓实际版本一致（此前硬编码 `^6.0.0`，与实测 6.9.6 不符）
      '@lytjs/core': '^6.9.6',
    },
    devDependencies: {
      // ⚠️ 不再依赖 `@lytjs/plugin-vite`：该包已迁出本仓（见 ../plugins），
      // 在仓内无法保证可安装（`pnpm install` 会直接失败）。
      // 模板改用 `.ts` + `template` 字符串 —— 由 @lytjs/core 的**运行时模板编译**
      // 直接支持（2026-09-26 打通），因此不需要任何构建期插件。
      vite: '^5.0.0',
    },
  };

  // Minimal template: no vitest, no test script
  if (!isMinimal) {
    packageJson.scripts.test = 'vitest';
    packageJson.devDependencies.vitest = '^1.0.0';
  }

  // SSR template: add @lytjs/ssr dependency
  if (isSsr) {
    // ⚠️ `@lytjs/server` **并不存在**（此前是错的包名）⇒ 改为真实的 `@lytjs/ssr`
    packageJson.dependencies['@lytjs/ssr'] = '^6.9.6';
    // ⚠️ 2026-11-03：产物目录必须与 server.ts 读取的路径一致（此前三处各写各的）
    packageJson.scripts['build:client'] = 'vite build --ssrManifest';
    packageJson.scripts['build:server'] =
      'vite build --ssr src/entry-server.ts --outDir dist/server';
    packageJson.scripts['build'] = 'npm run build:client && npm run build:server';
    // ⚠️ `node server` 跑不了 `.ts`（此前必失败）；用 tsx 直接执行
    packageJson.scripts['preview'] = 'tsx server.ts';
    packageJson.devDependencies['tsx'] = '^4.0.0';
  }

  // Router template: add @lytjs/router
  if (isRouter) {
    packageJson.dependencies['@lytjs/router'] = '^6.9.6';
  }

  // Store template: add @lytjs/store
  if (isStore) {
    packageJson.dependencies['@lytjs/store'] = '^6.9.6';
    // ⚠️ 2026-11-03：`src/stores/counter.ts` 直接 `import { ref, computed } from '@lytjs/reactivity'`，
    //   但依赖表里只有 @lytjs/store ⇒ pnpm 的严格 node_modules 下解析不到，装完构建即失败。
    packageJson.dependencies['@lytjs/reactivity'] = '^6.9.6';
  }

  // Full template: add @lytjs/ui
  if (isFull) {
    packageJson.dependencies['@lytjs/ui'] = '^6.9.6';
  }

  writeFile(join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // vite.config.ts
  let viteConfig: string;
  if (isSsr) {
    viteConfig = `import { defineConfig } from 'vite';

// 不需要构建期插件：模板字符串由 @lytjs/core 在运行时编译
// （此前这里 import '@lytjs/plugin-vite' —— 该包不在本仓，安装即失败）。
export default defineConfig({
  build: {
    ssrManifest: true,
    outDir: 'dist/client',
  },
});
`;
  } else {
    viteConfig = `import { defineConfig } from 'vite';

// 不需要构建期插件：模板字符串由 @lytjs/core 在运行时编译。
export default defineConfig({});
`;
  }
  writeFile(join(targetDir, 'vite.config.ts'), viteConfig);

  // index.html
  //
  // ⚠️ 2026-11-03：SSR 模板此前**没有** `<!--app-html-->` 占位符，而 server.ts 做的是
  //   `template.replace('<!--app-html-->', html)` ⇒ 空操作 ⇒ 服务端渲染结果被整段丢弃，
  //   用户拿到的是空壳 HTML（但状态码 200，看起来一切正常）。
  const appMount = isSsr ? '<div id="app"><!--app-html--></div>' : '<div id="app"></div>';
  const clientEntry = isSsr ? '/src/entry-client.ts' : '/src/main.ts';
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    ${appMount}
    <script type="module" src="${clientEntry}"></script>
  </body>
</html>
`;
  writeFile(join(targetDir, 'index.html'), indexHtml);

  // src/main.ts —— 仅非 SSR 模板需要。
  //
  // ⚠️ 2026-11-03：SSR 模板此前**同时**生成 `main.ts` 与 `entry-client.ts`，
  //   而 `index.html` 只引用其中一个 ⇒ 另一个永远是死文件，且两份入口逻辑还不一致。
  //   现在 SSR 模板只保留 `entry-client.ts`（由 index.html 引用）。
  if (!isSsr) {
    let mainTs: string;
    if (isRouter || isStore) {
      mainTs = `import { createApp } from '@lytjs/core';
import App from './App';
${isRouter ? "import { createRouter, createWebHistory } from '@lytjs/router';" : ''}
${isRouter ? "import Home from './pages/Home';" : ''}
${isRouter ? "import About from './pages/About';" : ''}
${isStore ? "import { createPinia } from '@lytjs/store';" : ''}

const app = createApp(App);
${isStore ? 'app.use(createPinia());' : ''}
${
  isRouter
    ? `
const router = createRouter({
  history: createWebHistory(),
  // ⚠️ 使用静态导入：本仓的 RouterView 尚未处理「懒加载返回 Promise」
  //（\`() => import('./pages/Home')\` 会被同步调用，拿到 Promise 而非组件）。
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});
app.use(router);
`
    : ''
}
app.mount('#app');
`;
    } else {
      mainTs = `import { createApp } from '@lytjs/core';
import App from './App';

createApp(App).mount('#app');
`;
    }
    writeFile(join(targetDir, 'src/main.ts'), mainTs);
  }

  // src/App.ts
  // ⚠️ 用 `.ts` + `template` 字符串（不再用 `.lyt` SFC）：
  // SFC 需要构建期插件，而 `@lytjs/plugin-vite` 已迁出本仓（无从安装）；
  // 模板字符串则由 @lytjs/core 的**运行时模板编译**直接支持（2026-09-26 打通）
  // ⇒ 脚手架生成后**开箱即跑**，无需任何构建插件。
  let appTs: string;
  if (isMinimal) {
    appTs = `import { defineComponent } from '@lytjs/core';

export default defineComponent({
  name: 'App',
  setup() {
    const title = 'Hello LytJS!';
    return { title };
  },
  template: ${JSON.stringify('<div class="app"><h1>{{ title }}</h1></div>')},
});
`;
  } else if (isRouter) {
    appTs = `import { defineComponent } from '@lytjs/core';
import { RouterLink, RouterView } from '@lytjs/router';

export default defineComponent({
  name: 'App',
  // 局部注册：模板里用 <RouterLink> / <RouterView> 时需能解析到它们
  components: { RouterLink, RouterView },
  template: ${JSON.stringify(
    '<div class="app"><nav class="nav"><RouterLink to="/">Home</RouterLink><RouterLink to="/about">About</RouterLink></nav><RouterView /></div>',
  )},
});
`;
  } else {
    appTs = `import { defineComponent } from '@lytjs/core';

export default defineComponent({
  name: 'App',
  setup() {
    const title = 'Hello LytJS!';
    return { title };
  },
  template: ${JSON.stringify(
    '<div class="app"><h1>{{ title }}</h1><p>Welcome to your LytJS app!</p></div>',
  )},
});
`;
  }
  writeFile(join(targetDir, 'src', 'App.ts'), appTs);

  // Router template: add pages and store
  if (isRouter) {
    // Home page
    const homeTemplate =
      '<div class="home"><h1>Home</h1>' +
      (isStore
        ? '<p>Count: {{ count }}</p><button @click="increment">Increment</button><button @click="decrement">Decrement</button>'
        : '') +
      '<p>Welcome to the Home page!</p></div>';

    const homePage = `import { defineComponent } from '@lytjs/core';
${isStore ? "import { useCounterStore } from '../stores/counter';" : ''}

export default defineComponent({
  name: 'Home',
${
  isStore
    ? `  setup() {
    const store = useCounterStore();
    return { count: store.count, increment: store.increment, decrement: store.decrement };
  },
`
    : ''
}  template: ${JSON.stringify(homeTemplate)},
});
`;
    ensureDir(join(targetDir, 'src', 'pages'));
    writeFile(join(targetDir, 'src', 'pages', 'Home.ts'), homePage);

    // About page
    const aboutPage = `import { defineComponent } from '@lytjs/core';

export default defineComponent({
  name: 'About',
  template: ${JSON.stringify(
    '<div class="about"><h1>About</h1><p>This is the About page!</p></div>',
  )},
});
`;
    writeFile(join(targetDir, 'src', 'pages', 'About.ts'), aboutPage);
  }

  // Store template: add example store
  if (isStore) {
    const counterStore = `import { defineStore } from '@lytjs/store';
// ⚠️ 用 ref 而非 signal：组件的 setupState 会经 proxyRefs 自动解包 ref，
// 因此 \`store.count\` 在模板里能直接渲染出值；signal 不会被解包。
import { ref, computed } from '@lytjs/reactivity';

export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0);

  // Getters
  const doubleCount = computed(() => count.value * 2);

  // Actions
  function increment() {
    count.value++;
  }

  function decrement() {
    count.value--;
  }

  function reset() {
    count.value = 0;
  }

  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset,
  };
});
`;
    ensureDir(join(targetDir, 'src', 'stores'));
    writeFile(join(targetDir, 'src', 'stores', 'counter.ts'), counterStore);
  }

  // SSR-specific files
  if (isSsr) {
    // src/entry-server.ts
    const entryServer = `import { h } from '@lytjs/core';
import { renderToString } from '@lytjs/ssr';
import App from './App';

/**
 * 服务端渲染入口。
 *
 * ⚠️ 两点与本仓现状相关（详见仓库审计报告）：
 *  1. \`@lytjs/core\` **没有** \`createSSRApp\`（旧模板里的 \`@lytjs/server\` 也是不存在的包名）；
 *  2. 本仓的 **hydration 尚未实现** —— \`entry-client\` 是全新挂载而非激活。
 * ⇒ 当前 SSR 只保证「服务端产出 HTML」这一段可用。
 */
export async function render(_url: string): Promise<string> {
  return renderToString(h(App));
}

// ⚠️ 2026-11-03：**必须**同时提供 default 导出。
//   此前只有 named export，而 server.ts 取的是 \`mod.default\` ⇒ 拿到 undefined
//   ⇒ 每个 SSR 请求 \`entry.render is not a function\` ⇒ 500。
export default { render };
`;
    writeFile(join(targetDir, 'src/entry-server.ts'), entryServer);

    // src/entry-client.ts
    const entryClient = `import { createApp } from '@lytjs/core';
import App from './App';

// ⚠️ 本仓 hydration 未实现 ⇒ 这里是全新挂载（不是激活）
createApp(App).mount('#app');
`;
    writeFile(join(targetDir, 'src/entry-client.ts'), entryClient);

    // server.ts - SSR 服务器（开发用 Vite 中间件，生产读 dist/client）
    //
    // ⚠️ 2026-11-03 重写。旧模板有 4 个致命问题：
    //   ① 开发模式创建了 Vite（middlewareMode）却**从不挂载 `vite.middlewares`**
    //      ⇒ index.html 里的 `/src/entry-client.ts` 请求会走到 SSR 分支，返回 HTML，
    //      浏览器把 HTML 当模块解析 ⇒ 白屏；HMR 也完全不通。
    //   ② 静态文件用 `path.join(__dirname, url)` ⇒ `/assets/../../x.js` 可读到项目外的文件。
    //   ③ 生产路径（dist/client、dist/server）与 build 脚本产物目录不一致。
    //   ④ 读 `mod.default` 而 entry-server 只有 named export ⇒ 每个请求 500。
    const serverTs = `/**
 * LytJS SSR 服务器
 *
 * 开发：Vite 以 middlewareMode 挂载，负责模块转换 / HMR / 静态资源；
 *       未命中的请求才交给 SSR 渲染。
 * 生产：先尝试 dist/client 下的静态文件（含目录穿越防护），再渲染。
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
/** 生产构建的客户端产物目录 */
const CLIENT_DIR = path.join(__dirname, 'dist/client');

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** 把 URL 安全地映射到 CLIENT_DIR 下的文件；越界一律返回 null */
function resolveStatic(url: string): string | null {
  const pathname = decodeURIComponent((url.split('?')[0] || '/'));
  const target = path.normalize(path.join(CLIENT_DIR, pathname));
  // 目录穿越防护：必须仍在 CLIENT_DIR 之内
  if (target !== CLIENT_DIR && !target.startsWith(CLIENT_DIR + path.sep)) return null;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
  return target;
}

interface SsrEntry {
  render(url: string): Promise<string>;
}

async function loadEntry(): Promise<{ entry: SsrEntry; vite?: any }> {
  if (isProduction) {
    const mod: any = await import(path.join(__dirname, 'dist/server/entry-server.js'));
    return { entry: mod.default ?? mod };
  }
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
  const mod: any = await vite.ssrLoadModule('/src/entry-server.ts');
  return { entry: mod.default ?? mod, vite };
}

async function main(): Promise<void> {
  const { entry, vite } = await loadEntry();

  const readTemplate = (): string =>
    fs.readFileSync(
      isProduction ? path.join(CLIENT_DIR, 'index.html') : path.join(__dirname, 'index.html'),
      'utf-8',
    );

  const renderPage = async (url: string, res: http.ServerResponse): Promise<void> => {
    try {
      const appHtml = await entry.render(url);
      let template = readTemplate();
      if (!isProduction && vite) template = await vite.transformIndexHtml(url, template);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(template.replace('<!--app-html-->', appHtml));
    } catch (error: any) {
      if (!isProduction && vite) vite.ssrFixStacktrace(error);
      console.error('SSR Error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  };

  const server = http.createServer((req, res) => {
    const url = req.url || '/';

    if (isProduction) {
      const file = resolveStatic(url);
      if (file) {
        const type = CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(fs.readFileSync(file));
        return;
      }
      void renderPage(url, res);
      return;
    }

    // 开发：Vite 处理模块 / HMR / 静态；未命中再交给 SSR
    vite.middlewares(req, res, () => {
      void renderPage(url, res);
    });
  });

  server.listen(PORT, () => {
    console.log(\`LytJS SSR server running at http://localhost:\${PORT}\`);
    console.log(\`Mode: \${isProduction ? 'Production' : 'Development'}\`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
    writeFile(join(targetDir, 'server.ts'), serverTs);
  }

  // tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    // ⚠️ 2026-11-03：SSR 模板的 `server.ts` 在根目录，此前不在任何 tsconfig 的 include 里
    //   ⇒ 服务端入口**完全不做类型检查**（写错了要等运行时才发现）。
    include: isSsr ? ['src/**/*.ts', 'server.ts'] : ['src/**/*.ts'],
    references: [{ path: './tsconfig.node.json' }],
  };
  writeFile(join(targetDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

  // tsconfig.node.json
  const tsConfigNode = {
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
    },
    include: ['vite.config.ts'],
  };
  writeFile(join(targetDir, 'tsconfig.node.json'), JSON.stringify(tsConfigNode, null, 2));

  // public/vite.svg —— index.html 里 `<link rel="icon" href="/vite.svg">` 指向它。
  // ⚠️ 2026-11-03：此前只写了引用、从不生成文件 ⇒ 每个新项目一打开就是 404。
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#42b883"/>
  <path d="M9 9h14l-7 15z" fill="#fff"/>
</svg>
`;
  writeFile(join(targetDir, 'public', 'vite.svg'), favicon);

  // .gitignore
  const gitignore = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;
  writeFile(join(targetDir, '.gitignore'), gitignore);
}

/**
 * List available templates
 */
export function listTemplates(): void {
  logger.heading('Available templates:');
  for (const [name, description] of Object.entries(TEMPLATES)) {
    logger.info(`  ${name.padEnd(10)} - ${description}`);
  }
}
