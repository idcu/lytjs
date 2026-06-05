#!/usr/bin/env tsx
import https from 'node:https';

// 获取单个包的信息
function getPackageInfo(packageName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'registry.npmjs.org',
      port: 443,
      path: `/${encodeURIComponent(packageName)}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 404) {
        resolve(null);
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      req.destroy();
      reject(new Error('Timeout'));
    }, 10000);

    req.end();
  });
}

// 已知的包列表
const knownPackages = [
  '@lytjs/adapter-web',
  '@lytjs/ai',
  '@lytjs/api',
  '@lytjs/bundler',
  '@lytjs/cache',
  '@lytjs/cache-isr',
  '@lytjs/cli',
  '@lytjs/common',
  '@lytjs/common-a11y',
  '@lytjs/common-algorithm',
  '@lytjs/common-assertions',
  '@lytjs/common-async-scheduler',
  '@lytjs/common-cache',
  '@lytjs/common-constants',
  '@lytjs/common-dom',
  '@lytjs/common-dom-helpers',
  '@lytjs/common-env',
  '@lytjs/common-error',
  '@lytjs/common-event-normalizer',
  '@lytjs/common-events',
  '@lytjs/common-http',
  '@lytjs/common-is',
  '@lytjs/common-keyboard',
  '@lytjs/common-memory',
  '@lytjs/common-node-cache',
  '@lytjs/common-object',
  '@lytjs/common-path',
  '@lytjs/common-performance',
  '@lytjs/common-query',
  '@lytjs/common-raf',
  '@lytjs/common-rate-limit',
  '@lytjs/common-render-queue',
  '@lytjs/common-scheduler',
  '@lytjs/common-security',
  '@lytjs/common-storage',
  '@lytjs/common-string',
  '@lytjs/common-timing',
  '@lytjs/common-transition-engine',
  '@lytjs/common-validate',
  '@lytjs/common-vnode',
  '@lytjs/common-warn',
  '@lytjs/compat',
  '@lytjs/compiler',
  '@lytjs/component',
  '@lytjs/components',
  '@lytjs/core',
  '@lytjs/core-signal',
  '@lytjs/core-vnode',
  '@lytjs/devtools',
  '@lytjs/devtools-extension',
  '@lytjs/dom',
  '@lytjs/dom-runtime',
  '@lytjs/hmr',
  '@lytjs/host-contract',
  '@lytjs/html-renderer',
  '@lytjs/http-server',
  '@lytjs/lytjs',
  '@lytjs/lytx',
  '@lytjs/metadata',
  '@lytjs/micro-frontend',
  '@lytjs/middleware',
  '@lytjs/middleware-auth',
  '@lytjs/middleware-cors',
  '@lytjs/middleware-rate-limit',
  '@lytjs/performance',
  '@lytjs/platform-adapter',
  '@lytjs/plugin-animation',
  '@lytjs/plugin-auth',
  '@lytjs/plugin-chart',
  '@lytjs/plugin-data',
  '@lytjs/plugin-data-fetch',
  '@lytjs/plugin-form',
  '@lytjs/plugin-highlight',
  '@lytjs/plugin-i18n',
  '@lytjs/plugin-logger',
  '@lytjs/plugin-registry',
  '@lytjs/plugin-storage',
  '@lytjs/plugin-testing',
  '@lytjs/plugin-theme',
  '@lytjs/plugin-validation',
  '@lytjs/plugin-virtual-list',
  '@lytjs/plugin-vite',
  '@lytjs/plugins',
  '@lytjs/reactivity',
  '@lytjs/renderer',
  '@lytjs/router',
  '@lytjs/router-fs',
  '@lytjs/runtime-edge',
  '@lytjs/shared-types',
  '@lytjs/ssg',
  '@lytjs/ssr',
  '@lytjs/store',
  '@lytjs/test-utils',
  '@lytjs/ui',
  '@lytjs/vdom',
  '@lytjs/vscode-extension',
  '@lytjs/web',
];

// 尝试查找第98个包
const possibleMissingPackages = [
  // 检查一些常见的变体
  '@lytjs/plugin-virtual-list',
  '@lytjs/plugin-virtuallist',
  '@lytjs/plugin-virtualList',
  '@lytjs/coreVnode',
  '@lytjs/core-vnode',
  '@lytjs/coreVnode',
  '@lytjs/coreSignal',
  '@lytjs/core-signal',
  '@lytjs/domRuntime',
  '@lytjs/dom-runtime',
  '@lytjs/htmlRenderer',
  '@lytjs/html-renderer',
  '@lytjs/httpServer',
  '@lytjs/http-server',
  '@lytjs/microFrontend',
  '@lytjs/micro-frontend',
  '@lytjs/platformAdapter',
  '@lytjs/platform-adapter',
  '@lytjs/routerFs',
  '@lytjs/router-fs',
  '@lytjs/runtimeEdge',
  '@lytjs/runtime-edge',
  '@lytjs/sharedTypes',
  '@lytjs/shared-types',
  '@lytjs/testUtils',
  '@lytjs/test-utils',
  '@lytjs/vscodeExtension',
  '@lytjs/vscode-extension',
  '@lytjs/devtoolsExtension',
  '@lytjs/devtools-extension',
  // 检查一些可能的新包
  '@lytjs/server',
  '@lytjs/client',
  '@lytjs/app',
  '@lytjs/lib',
  '@lytjs/utils',
  '@lytjs/helpers',
  '@lytjs/vue',
  '@lytjs/react',
  '@lytjs/svelte',
  '@lytjs/next',
  '@lytjs/nuxt',
  '@lytjs/astro',
  '@lytjs/remix',
  '@lytjs/hooks',
  '@lytjs/composables',
  '@lytjs/directives',
  '@lytjs/themes',
  '@lytjs/icons',
  '@lytjs/animations',
  '@lytjs/transitions',
  '@lytjs/router-core',
  '@lytjs/core-router',
  '@lytjs/store-core',
  '@lytjs/core-store',
  '@lytjs/ssr-core',
  '@lytjs/core-ssr',
  '@lytjs/ssg-core',
  '@lytjs/core-ssg',
  '@lytjs/cli-core',
  '@lytjs/core-cli',
  '@lytjs/bundler-core',
  '@lytjs/core-bundler',
  '@lytjs/compiler-core',
  '@lytjs/core-compiler',
  '@lytjs/renderer-core',
  '@lytjs/core-renderer',
  '@lytjs/vdom-core',
  '@lytjs/core-vdom',
  '@lytjs/reactivity-core',
  '@lytjs/core-reactivity',
  '@lytjs/component-core',
  '@lytjs/core-component',
  '@lytjs/web-core',
  '@lytjs/core-web',
  '@lytjs/adapter',
  '@lytjs/adapter-node',
  '@lytjs/node-adapter',
  '@lytjs/plugin-router',
  '@lytjs/plugin-store',
  '@lytjs/plugin-ssr',
  '@lytjs/plugin-ssg',
  '@lytjs/plugin-pwa',
  '@lytjs/plugin-css',
  '@lytjs/plugin-tailwind',
  '@lytjs/plugin-markdown',
  '@lytjs/plugin-mdx',
  '@lytjs/plugin-graphql',
  '@lytjs/plugin-database',
  '@lytjs/plugin-firebase',
  '@lytjs/plugin-supabase',
  '@lytjs/plugin-stripe',
  '@lytjs/plugin-sentry',
  '@lytjs/plugin-datadog',
  '@lytjs/plugin-github',
  '@lytjs/plugin-docker',
  '@lytjs/plugin-k8s',
  '@lytjs/plugin-aws',
  '@lytjs/plugin-gcp',
  '@lytjs/plugin-azure',
  '@lytjs/plugin-vercel',
  '@lytjs/plugin-netlify',
  '@lytjs/plugin-cloudflare',
  // 检查一些旧的包名
  '@lytjs/legacy',
  '@lytjs/old',
  '@lytjs/deprecated',
  '@lytjs/archive',
  '@lytjs/archived',
  '@lytjs/test',
  '@lytjs/dev',
  '@lytjs/alpha',
  '@lytjs/beta',
  '@lytjs/rc',
  '@lytjs/preview',
  '@lytjs/next',
  '@lytjs/canary',
  '@lytjs/nightly',
  '@lytjs/experimental',
  '@lytjs/unstable',
  '@lytjs/stable',
  '@lytjs/lts',
  // 检查一些数字后缀
  '@lytjs/adapter-web-2',
  '@lytjs/adapter-web-v2',
  '@lytjs/router-2',
  '@lytjs/router-v2',
  '@lytjs/core-2',
  '@lytjs/core-v2',
  '@lytjs/reactivity-2',
  '@lytjs/reactivity-v2',
  // 检查一些其他可能的名字
  '@lytjs/create',
  '@lytjs/create-app',
  '@lytjs/create-project',
  '@lytjs/create-lytjs',
  '@lytjs/init',
  '@lytjs/setup',
  '@lytjs/config',
  '@lytjs/configuration',
  '@lytjs/constants',
  '@lytjs/types',
  '@lytjs/typings',
  '@lytjs/definitions',
];

async function main() {
  console.log('🔍 正在查找第98个包...\n');
  
  const foundPackages = [];
  
  for (const pkgName of possibleMissingPackages) {
    // 跳过已经知道的包
    if (knownPackages.includes(pkgName)) {
      continue;
    }
    
    try {
      console.log(`   检查: ${pkgName}`);
      const info = await getPackageInfo(pkgName);
      if (info) {
        console.log(`   ✅ 找到: ${pkgName} (v${info['dist-tags']?.latest || 'N/A'})`);
        foundPackages.push({
          name: pkgName,
          version: info['dist-tags']?.latest,
          versionsCount: Object.keys(info.versions || {}).length,
        });
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  console.log('\n' + '='.repeat(80));
  if (foundPackages.length > 0) {
    console.log('🎉 找到的新包:');
    console.log('='.repeat(80));
    foundPackages.forEach((pkg, i) => {
      console.log(`${i + 1}. ${pkg.name} (v${pkg.version}, ${pkg.versionsCount} versions)`);
    });
  } else {
    console.log('😔 没有找到新的包');
  }
  console.log('='.repeat(80));
}

main().catch(console.error);
