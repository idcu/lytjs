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

// 已知的97个包
const known97 = [
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

// 尝试查找的其他可能
const otherPossibilities = [
  // 没有 scope 的包
  'lytjs',
  'lytx',
  // 常见的拼写错误或变体
  '@lytjs/adapterweb',
  '@lytjs/adapter_web',
  '@lytjs/cacheisr',
  '@lytjs/cache_isr',
  '@lytjs/common-a11y',
  '@lytjs/common-a11y',
  '@lytjs/common-assertions',
  '@lytjs/common-async-scheduler',
  '@lytjs/common-dom-helpers',
  '@lytjs/common-event-normalizer',
  '@lytjs/common-node-cache',
  '@lytjs/common-rate-limit',
  '@lytjs/common-render-queue',
  '@lytjs/common-transition-engine',
  '@lytjs/core-signal',
  '@lytjs/core-vnode',
  '@lytjs/devtools-extension',
  '@lytjs/dom-runtime',
  '@lytjs/host-contract',
  '@lytjs/html-renderer',
  '@lytjs/http-server',
  '@lytjs/micro-frontend',
  '@lytjs/middleware-auth',
  '@lytjs/middleware-cors',
  '@lytjs/middleware-rate-limit',
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
  '@lytjs/router-fs',
  '@lytjs/runtime-edge',
  '@lytjs/shared-types',
  '@lytjs/test-utils',
  '@lytjs/vscode-extension',
  // 其他可能的组合
  '@lytjs/plugin-virtual',
  '@lytjs/plugin-list',
  '@lytjs/virtual-list',
  '@lytjs/plugin-virtualList',
  '@lytjs/plugin-virtuallist',
  // 检查一些单独的 common 模块是否有独立的包
  '@lytjs/a11y',
  '@lytjs/algorithm',
  '@lytjs/assertions',
  '@lytjs/async-scheduler',
  '@lytjs/constants',
  '@lytjs/dom-helpers',
  '@lytjs/env',
  '@lytjs/error',
  '@lytjs/event-normalizer',
  '@lytjs/events',
  '@lytjs/http',
  '@lytjs/is',
  '@lytjs/keyboard',
  '@lytjs/memory',
  '@lytjs/node-cache',
  '@lytjs/object',
  '@lytjs/path',
  '@lytjs/performance',
  '@lytjs/query',
  '@lytjs/raf',
  '@lytjs/rate-limit',
  '@lytjs/render-queue',
  '@lytjs/scheduler',
  '@lytjs/security',
  '@lytjs/storage',
  '@lytjs/string',
  '@lytjs/timing',
  '@lytjs/transition-engine',
  '@lytjs/validate',
  '@lytjs/vnode',
  '@lytjs/warn',
];

async function main() {
  console.log('🔍 更仔细地查找第98个包...\n');
  
  const foundPackages = [];
  
  for (const pkgName of otherPossibilities) {
    // 跳过已经知道的包
    if (known97.includes(pkgName)) {
      continue;
    }
    
    try {
      const info = await getPackageInfo(pkgName);
      if (info) {
        console.log(`✅ 找到: ${pkgName} (v${info['dist-tags']?.latest || 'N/A'})`);
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
  
  // 也检查一下已知的97个包是否都存在
  console.log('\n📋 验证已知的97个包...\n');
  let verifiedCount = 0;
  for (const pkgName of known97) {
    try {
      const info = await getPackageInfo(pkgName);
      if (info) {
        verifiedCount++;
      } else {
        console.log(`❌ 包不存在: ${pkgName}`);
      }
    } catch (e) {
      console.log(`❌ 检查包失败: ${pkgName}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ 验证了 ${verifiedCount}/97 个已知包`);
  
  if (foundPackages.length > 0) {
    console.log('\n🎉 找到的新包:');
    console.log('='.repeat(80));
    foundPackages.forEach((pkg, i) => {
      console.log(`${i + 1}. ${pkg.name} (v${pkg.version}, ${pkg.versionsCount} versions)`);
    });
  } else {
    console.log('\n😔 没有找到新的包');
  }
  console.log('='.repeat(80));
}

main().catch(console.error);
