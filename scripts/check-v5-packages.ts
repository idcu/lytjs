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

// 已知的 v5.0.1 包
const knownV5 = [
  '@lytjs/ai',
  '@lytjs/components',
  '@lytjs/lytjs',
  '@lytjs/lytx',
  '@lytjs/micro-frontend',
  '@lytjs/performance',
  '@lytjs/plugin-highlight',
  '@lytjs/plugin-registry',
  '@lytjs/plugin-virtual-list',
  '@lytjs/plugins',
  '@lytjs/vscode-extension',
];

// 尝试查找第 12 个 v5.0.1 包
const possibleV5 = [
  // 其他可能的 v5.0.1 包
  '@lytjs/lyt',
  '@lytjs/core',
  '@lytjs/reactivity',
  '@lytjs/vdom',
  '@lytjs/renderer',
  '@lytjs/compiler',
  '@lytjs/bundler',
  '@lytjs/cli',
  '@lytjs/web',
  '@lytjs/dom',
  '@lytjs/ui',
  '@lytjs/component',
  '@lytjs/router',
  '@lytjs/store',
  '@lytjs/ssr',
  '@lytjs/ssg',
  '@lytjs/api',
  '@lytjs/cache',
  '@lytjs/adapter-web',
  '@lytjs/platform-adapter',
  '@lytjs/host-contract',
  '@lytjs/metadata',
  '@lytjs/html-renderer',
  '@lytjs/http-server',
  '@lytjs/middleware',
  '@lytjs/devtools',
  '@lytjs/hmr',
  '@lytjs/test-utils',
  '@lytjs/shared-types',
  '@lytjs/runtime-edge',
  '@lytjs/common',
  '@lytjs/compat',
  // 无 scope 的
  'lytjs',
  'lytx',
  'lyt',
  // 其他变体
  '@lytjs/plugin-virtual',
  '@lytjs/plugin-list',
  '@lytjs/virtual-list',
  '@lytjs/plugin-virtualList',
  '@lytjs/plugin-virtuallist',
  '@lytjs/microfrontend',
  '@lytjs/microFrontend',
  '@lytjs/vscodeExtension',
  '@lytjs/devtoolsExtension',
  '@lytjs/testUtils',
  '@lytjs/sharedTypes',
  '@lytjs/runtimeEdge',
  '@lytjs/routerFs',
  '@lytjs/htmlRenderer',
  '@lytjs/httpServer',
  '@lytjs/hostContract',
  '@lytjs/platformAdapter',
  '@lytjs/adapterWeb',
  '@lytjs/pluginHighlight',
  '@lytjs/pluginRegistry',
];

async function main() {
  console.log('🔍 查找第 12 个 v5.0.1 包...\n');
  
  const foundV5 = [];
  
  // 先验证已知的 11 个
  console.log('📋 验证已知的 11 个 v5.0.1 包...\n');
  for (const pkgName of knownV5) {
    try {
      const info = await getPackageInfo(pkgName);
      if (info) {
        const version = info['dist-tags']?.latest;
        if (version === '5.0.1') {
          console.log(`   ✅ ${pkgName} (v5.0.1)`);
          foundV5.push(pkgName);
        } else {
          console.log(`   ⚠️  ${pkgName} (v${version}, 不是 v5.0.1)`);
        }
      }
    } catch (e) {
      console.log(`   ❌ ${pkgName} 检查失败`);
    }
  }
  
  console.log(`\n📊 确认了 ${foundV5.length} 个 v5.0.1 包\n`);
  
  // 查找更多
  console.log('🔍 查找更多可能的 v5.0.1 包...\n');
  for (const pkgName of possibleV5) {
    if (knownV5.includes(pkgName)) continue;
    
    try {
      const info = await getPackageInfo(pkgName);
      if (info) {
        const version = info['dist-tags']?.latest;
        if (version === '5.0.1') {
          console.log(`   🎉 找到第 ${foundV5.length + 1} 个: ${pkgName} (v5.0.1)`);
          foundV5.push(pkgName);
        }
      }
    } catch (e) {
      // 忽略
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`📦 总共找到 ${foundV5.length} 个 v5.0.1 包:`);
  console.log('='.repeat(80));
  foundV5.forEach((pkg, i) => {
    console.log(`${i + 1}. ${pkg}`);
  });
  console.log('='.repeat(80));
}

main().catch(console.error);
