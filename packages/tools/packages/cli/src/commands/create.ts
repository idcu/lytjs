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
};

/**
 * Create a new LytJS project
 */
export async function create(projectName: string, options: Partial<CreateOptions> = {}): Promise<void> {
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
  } catch (error) {
    logger.warning('Failed to install dependencies automatically.');
    logger.info(`Please run "${getInstallCommand(pm)}" manually.`);
  }
  
  // Print next steps
  logger.success(`Project "${projectName}" created successfully!`);
  logger.info('');
  logger.bold('Next steps:');
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

  // package.json
  const packageJson: Record<string, any> = {
    name: projectName,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@lytjs/core': '^6.0.0',
    },
    devDependencies: {
      '@lytjs/plugin-vite': '^6.0.0',
      'vite': '^5.0.0',
    },
  };

  // Minimal template: no vitest, no test script
  if (!isMinimal) {
    packageJson.scripts.test = 'vitest';
    packageJson.devDependencies.vitest = '^1.0.0';
  }

  // SSR template: add @lytjs/server dependency
  if (isSsr) {
    packageJson.dependencies['@lytjs/server'] = '^6.0.0';
    packageJson.scripts['build:client'] = 'vite build --ssrManifest';
    packageJson.scripts['build:server'] = 'vite build --ssr src/entry-server.ts';
    packageJson.scripts['build'] = 'npm run build:client && npm run build:server';
    packageJson.scripts['preview'] = 'node server';
  }

  writeFile(join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // vite.config.ts
  let viteConfig: string;
  if (isSsr) {
    viteConfig = `import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [lytjs()],
  build: {
    ssrManifest: true,
  },
});
`;
  } else {
    viteConfig = `import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [lytjs()],
});
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
import App from './App.lyt';
import { createSSRApp } from '@lytjs/server';

const app = createSSRApp(App);
app.mount('#app');
`;
  } else {
    mainTs = `import { createApp } from '@lytjs/core';
import App from './App.lyt';

createApp(App).mount('#app');
`;
  }
  writeFile(join(targetDir, 'src/main.ts'), mainTs);

  // src/App.lyt
  let appLyt: string;
  if (isMinimal) {
    appLyt = `<template>
  <div class="app">
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup>
const title = 'Hello LytJS!';
</script>

<style scoped>
.app {
  text-align: center;
}
</style>
`;
  } else {
    appLyt = `<template>
  <div class="app">
    <h1>{{ title }}</h1>
    <p>Welcome to your LytJS app!</p>
  </div>
</template>

<script setup>
const title = 'Hello LytJS!';
</script>

<style scoped>
.app {
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #42b883;
}
</style>
`;
  }
  writeFile(join(targetDir, 'src/App.lyt'), appLyt);

  // SSR-specific files
  if (isSsr) {
    // src/entry-server.ts
    const entryServer = `import { createSSRApp } from '@lytjs/core';
import App from './App.lyt';

export async function render(url: string) {
  const app = createSSRApp(App);
  return app;
}
`;
    writeFile(join(targetDir, 'src/entry-server.ts'), entryServer);

    // src/entry-client.ts
    const entryClient = `import { createApp } from '@lytjs/core';
import App from './App.lyt';

const app = createApp(App);
app.mount('#app');
`;
    writeFile(join(targetDir, 'src/entry-client.ts'), entryClient);

    // server.ts
    const serverTs = `/**
 * LytJS SSR Server
 *
 * A minimal SSR server for development and production.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  let resolve: any;
  let vite: any;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    resolve = (id: string) => vite.resolveUrl(id);
  } else {
    resolve = (id: string) => id;
  }

  // TODO: Set up express/polka server and SSR rendering
  console.log('LytJS SSR server starting...');
}

createServer();
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
    include: ['src/**/*.ts', 'src/**/*.lyt'],
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
  logger.bold('Available templates:');
  for (const [name, description] of Object.entries(TEMPLATES)) {
    logger.info(`  ${name.padEnd(10)} - ${description}`);
  }
}
