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
 */
function generateProjectFiles(targetDir: string, projectName: string, template: string): void {
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
    packageJson.scripts['build:client'] = 'vite build --ssrManifest';
    packageJson.scripts['build:server'] = 'vite build --ssr src/entry-server.ts';
    packageJson.scripts['build'] = 'npm run build:client && npm run build:server';
    packageJson.scripts['preview'] = 'node server';
  }

  // Router template: add @lytjs/router
  if (isRouter) {
    packageJson.dependencies['@lytjs/router'] = '^6.9.6';
  }

  // Store template: add @lytjs/store
  if (isStore) {
    packageJson.dependencies['@lytjs/store'] = '^6.9.6';
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
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
  writeFile(join(targetDir, 'index.html'), indexHtml);

  // src/main.ts
  let mainTs: string;
  if (isSsr) {
    mainTs = `import { createApp } from '@lytjs/core';
import App from './App';
${isRouter ? "import { createRouter, createWebHistory } from '@lytjs/router';" : ''}
${isRouter ? "import Home from './pages/Home';" : ''}
${isRouter ? "import About from './pages/About';" : ''}
${isStore ? "import { createPinia } from '@lytjs/store';" : ''}

// ⚠️ 这里用 createApp 挂载（不是 createSSRApp —— 本仓没有该 API，
//    旧模板里的 '@lytjs/server' 也是不存在的包名）。
// ⚠️ 本仓的 **hydration 尚未实现**（见审计报告）：当前 SSR 只做到
//    「服务端输出 HTML」，客户端仍是全新挂载，不是激活。
const app = createApp(App);
${isStore ? 'app.use(createPinia());' : ''}
${
  isRouter
    ? `
const router = createRouter({
  history: createWebHistory(),
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
  } else if (isRouter || isStore) {
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
`;
    writeFile(join(targetDir, 'src/entry-server.ts'), entryServer);

    // src/entry-client.ts
    const entryClient = `import { createApp } from '@lytjs/core';
import App from './App';

// ⚠️ 本仓 hydration 未实现 ⇒ 这里是全新挂载（不是激活）
createApp(App).mount('#app');
`;
    writeFile(join(targetDir, 'src/entry-client.ts'), entryClient);

    // server.ts - complete SSR server implementation
    const serverTs = `/**
 * LytJS SSR Server
 *
 * Complete SSR server with Vite dev server and production build support.
 * Supports streaming SSR, route prefetching, and static file serving.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '3000', 10);

interface RenderOptions {
  url: string;
  template: string;
  manifest?: Record<string, string[]>;
}

async function renderPage({ url, template, manifest }: RenderOptions): Promise<string> {
  let app: any;
  let vite: any;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app = (await vite.ssrLoadModule(path.join(__dirname, 'src/entry-server.ts'))).default;
  } else {
    app = (await import(path.join(DIST_DIR, 'server/entry-server.js'))).default;
  }

  const html = await app.render(url);
  return template.replace('<!--app-html-->', html);
}

async function createServer() {
  let vite: any;

  // Load index.html template
  let template: string;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  } else {
    template = fs.readFileSync(path.join(DIST_DIR, 'client/index.html'), 'utf-8');
  }

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    try {
      if (!isProduction && url.startsWith('/@')) {
        // Vite dev server requests
        return;
      }

      // Static assets
      if (url.startsWith('/assets/') || url.endsWith('.js') || url.endsWith('.css')) {
        const filePath = isProduction
          ? path.join(DIST_DIR, 'client', url)
          : path.join(__dirname, url);

        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath);
          const contentType = ext === '.css' ? 'text/css' : 'application/javascript';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(fs.readFileSync(filePath));
          return;
        }
      }

      // SSR rendering
      const html = await renderPage({
        url,
        template,
        manifest: isProduction
          ? JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'client/ssr-manifest.json'), 'utf-8'))
          : undefined
      });

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (err: any) {
      if (!isProduction && vite) {
        vite.ssrFixStacktrace(err);
      }
      console.error('SSR Error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(PORT, () => {
    console.log(\`LytJS SSR server running at http://localhost:\${PORT}\`);
    console.log(\`Mode: \${isProduction ? 'Production' : 'Development'}\`);
  });
}

createServer().catch(console.error);
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
    include: ['src/**/*.ts'],
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
