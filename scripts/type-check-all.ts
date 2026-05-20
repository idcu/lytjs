/* eslint-disable @typescript-eslint/no-unused-vars */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

function hasTsConfig(dir: string): boolean {
  try {
    return statSync(join(dir, 'tsconfig.json')).isFile();
  } catch {
    return false;
  }
}

function runTypeCheck(dir: string, label: string): boolean {
  try {
    console.log(`⏳ Type checking: ${label}`);
    execSync('npx tsc --noEmit', {
      cwd: dir,
      stdio: 'pipe',
    });
    console.log(`✅ Type check passed: ${label}`);
    return true;
  } catch (err) {
    console.error(`❌ Type check failed: ${label}`);
    console.error((err as Error).message);
    return false;
  }
}

const packagesToCheck: string[] = [
  // core packages
  'packages/shared-types',
  'packages/host-contract',
  'packages/reactivity',
  'packages/vdom',
  'packages/component',
  'packages/renderer',
  'packages/adapter-web',
  'packages/dom',
  'packages/web',
  'packages/dom-runtime',
  'packages/compiler',
  'packages/core',
  'packages/core-signal',
  'packages/core-vnode',
  
  // common packages
  'packages/common/packages/constants',
  'packages/common/packages/is',
  'packages/common/packages/security',
  'packages/common/packages/string',
  'packages/common/packages/path',
  'packages/common/packages/object',
  'packages/common/packages/error',
  'packages/common/packages/warn',
  'packages/common/packages/events',
  'packages/common/packages/cache',
  'packages/common/packages/timing',
  'packages/common/packages/algorithm',
  'packages/common/packages/vnode',
  'packages/common/packages/scheduler',
  'packages/common/packages/dom',
  'packages/common/packages/query',
  'packages/common/packages/dom-helpers',
  'packages/common/packages/a11y',
  'packages/common/packages/keyboard',
  'packages/common/packages/storage',
  'packages/common/packages/validate',
  'packages/common/packages/http',
  'packages/common/packages/raf',
  'packages/common/packages/render-queue',
  'packages/common/packages/event-normalizer',
  'packages/common/packages/node-cache',
  'packages/common/packages/async-scheduler',
  'packages/common/packages/transition-engine',
  'packages/common/packages/performance',
  'packages/common/packages/assertions',
  'packages/common/packages/memory',
  
  // ecosystem packages
  'packages/ecosystem/packages/api',
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/router-fs',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/ui',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/platform-adapter',
  'packages/ecosystem/packages/bundler',
  'packages/ecosystem/packages/hmr',
  'packages/ecosystem/packages/runtime-edge',
  
  // web-framework packages
  'packages/ecosystem/packages/web-framework/packages/api',
  'packages/ecosystem/packages/web-framework/packages/middleware',
  'packages/ecosystem/packages/web-framework/packages/middleware-cors',
  'packages/ecosystem/packages/web-framework/packages/middleware-auth',
  'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit',
  'packages/ecosystem/packages/web-framework/packages/metadata',
  'packages/ecosystem/packages/web-framework/packages/http-server',
  'packages/ecosystem/packages/web-framework/packages/router',
  'packages/ecosystem/packages/web-framework/packages/router-fs',
  
  // plugins
  'packages/plugins/packages/plugin-vite',
  'packages/plugins/packages/plugin-theme',
  'packages/plugins/packages/plugin-logger',
  'packages/plugins/packages/plugin-auth',
  'packages/plugins/packages/plugin-storage',
  'packages/plugins/packages/plugin-i18n',
  'packages/plugins/packages/plugin-validation',
  'packages/plugins/packages/plugin-data',
  'packages/plugins/packages/plugin-data-fetch',
  'packages/plugins/packages/plugin-chart',
  'packages/plugins/packages/plugin-animation',
  'packages/plugins/packages/plugin-testing',
  'packages/plugins/packages/plugin-form',
  
  // tools
  'packages/tools/packages/cli',
  'packages/tools/packages/devtools',
  'packages/tools/packages/test-utils',
];

let successCount = 0;
let failureCount = 0;

console.log('🔍 Starting type check for all packages...\n');

for (const pkgPath of packagesToCheck) {
  const fullPath = resolve(ROOT, pkgPath);
  const label = pkgPath.replace('packages/', '');
  
  if (!hasTsConfig(fullPath)) {
    console.log(`⚠️  Skipping: ${label} (no tsconfig.json)`);
    continue;
  }
  
  const passed = runTypeCheck(fullPath, label);
  if (passed) {
    successCount++;
  } else {
    failureCount++;
  }
}

console.log(`\n📊 Type check summary:`);
console.log(`   ✅ Passed: ${successCount}`);
console.log(`   ❌ Failed: ${failureCount}`);

if (failureCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All type checks passed!');
}
