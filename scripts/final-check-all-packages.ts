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

// 所有可能的 98 个包的候选列表
const allCandidates = [
  // 已知的 97 个带 scope 的
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
  // 无 scope 的
  'lytjs',
  'lytx',
  'lyt',
  // 其他可能遗漏的
  '@lytjs/lyt',
];

async function main() {
  console.log('🔍 最终验证：查找所有 98 个包...\n');
  
  const allFound = [];
  const notFound = [];
  
  for (const pkgName of allCandidates) {
    try {
      const info = await getPackageInfo(pkgName);
      if (info) {
        const version = info['dist-tags']?.latest || 'N/A';
        allFound.push({
          name: pkgName,
          version,
        });
      } else {
        notFound.push(pkgName);
      }
    } catch (e) {
      notFound.push(pkgName);
    }
  }
  
  // 按版本分组统计
  const stats: Record<string, string[]> = {};
  allFound.forEach(pkg => {
    if (!stats[pkg.version]) {
      stats[pkg.version] = [];
    }
    stats[pkg.version].push(pkg.name);
  });
  
  console.log('\n' + '='.repeat(100));
  console.log(`📊 统计结果：共找到 ${allFound.length} 个包`);
  console.log('='.repeat(100));
  
  console.log('\n📦 按版本分组：');
  Object.keys(stats).sort((a, b) => b.localeCompare(a)).forEach(version => {
    console.log(`\n   v${version}: ${stats[version].length} 个包`);
    stats[version].forEach((name, i) => {
      console.log(`      ${i + 1}. ${name}`);
    });
  });
  
  if (notFound.length > 0) {
    console.log(`\n❌ 未找到 ${notFound.length} 个候选包：`);
    notFound.forEach(name => {
      console.log(`   - ${name}`);
    });
  }
  
  console.log('\n' + '='.repeat(100));
  console.log('🎉 完整列表：');
  console.log('='.repeat(100));
  allFound.sort((a, b) => a.name.localeCompare(b.name)).forEach((pkg, i) => {
    console.log(`${String(i + 1).padStart(3)}. ${pkg.name.padEnd(40)} v${pkg.version}`);
  });
  console.log('='.repeat(100));
}

main().catch(console.error);
