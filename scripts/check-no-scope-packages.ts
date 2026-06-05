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

// 可能的无 scope 包名
const possibleNoScope = [
  'lytjs',
  'lytx',
  'lyt',
  'lyt-js',
  'lyt-jsx',
  'lytjsx',
  'lytjs-core',
  'lytjsx',
  'lytjs-react',
  'lytjs-vue',
  'lytjs-svelte',
  'lytjs-dom',
  'lytjs-web',
  'lytjs-ui',
  'lytjs-component',
  'lytjs-router',
  'lytjs-store',
  'lytjs-ssr',
  'lytjs-ssg',
  'lytjs-cli',
  'lytjs-compiler',
  'lytjs-bundler',
  'lytjs-renderer',
  'lytjs-vdom',
  'lytjs-reactivity',
  'lytjs-utils',
  'lytjs-common',
  'lytjs-devtools',
  'lytjs-hmr',
  'lytjs-plugin',
  'lytjs-plugins',
  'lytjs-middleware',
  'lytjs-cache',
  'lytjs-api',
  'lytjs-adapter',
  'lytjs-platform',
  'lytjs-host',
  'lytjs-metadata',
  'lytjs-html',
  'lytjs-http',
  'lytjs-test',
  'lytjs-types',
  'lytjs-shared',
  'lytjs-runtime',
  'lytjs-edge',
  'lytjs-performance',
  'lytjs-ai',
  'lytjs-micro',
  'lytjs-frontend',
  'lytjs-highlight',
  'lytjs-registry',
  'lytjs-virtual',
  'lytjs-list',
  'lytjs-vscode',
  'lytjs-extension',
];

async function main() {
  console.log('🔍 查找没有 scope 的包...\n');
  
  const foundPackages = [];
  
  for (const pkgName of possibleNoScope) {
    try {
      console.log(`   检查: ${pkgName}`);
      const info = await getPackageInfo(pkgName);
      if (info) {
        const latestVersion = info['dist-tags']?.latest;
        console.log(`   ✅ 找到: ${pkgName} (v${latestVersion || 'N/A'})`);
        foundPackages.push({
          name: pkgName,
          version: latestVersion,
          versionsCount: Object.keys(info.versions || {}).length,
        });
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  console.log('\n' + '='.repeat(80));
  if (foundPackages.length > 0) {
    console.log('🎉 找到的无 scope 包:');
    console.log('='.repeat(80));
    foundPackages.forEach((pkg, i) => {
      console.log(`${i + 1}. ${pkg.name} (v${pkg.version}, ${pkg.versionsCount} versions)`);
    });
  } else {
    console.log('😔 没有找到更多无 scope 的包');
  }
  console.log('='.repeat(80));
}

main().catch(console.error);
