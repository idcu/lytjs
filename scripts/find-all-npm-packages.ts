#!/usr/bin/env tsx
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPackageJsonFiles } from './shared.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// 已知的 v5.0.1 包列表
const knownOldPackages = [
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

// 尝试一些可能的包名
const possiblePackages = [
  '@lytjs/server',
  '@lytjs/client',
  '@lytjs/app',
  '@lytjs/lib',
  '@lytjs/utils',
  '@lytjs/helpers',
  '@lytjs/core-dom',
  '@lytjs/dom-core',
  '@lytjs/vue',
  '@lytjs/react',
  '@lytjs/angular',
  '@lytjs/svelte',
  '@lytjs/next',
  '@lytjs/nuxt',
  '@lytjs/astro',
  '@lytjs/remix',
  '@lytjs/hooks',
  '@lytjs/composables',
  '@lytjs/directives',
  '@lytjs/components-ui',
  '@lytjs/ui-components',
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
  '@lytjs/dom-core',
  '@lytjs/core-dom',
  '@lytjs/adapter',
  '@lytjs/adapter-node',
  '@lytjs/node-adapter',
  '@lytjs/adapter-deno',
  '@lytjs/deno-adapter',
  '@lytjs/adapter-bun',
  '@lytjs/bun-adapter',
  '@lytjs/adapter-edge',
  '@lytjs/edge-adapter',
  '@lytjs/plugin-router',
  '@lytjs/plugin-store',
  '@lytjs/plugin-ssr',
  '@lytjs/plugin-ssg',
  '@lytjs/plugin-pwa',
  '@lytjs/plugin-css',
  '@lytjs/plugin-sass',
  '@lytjs/plugin-less',
  '@lytjs/plugin-tailwind',
  '@lytjs/plugin-postcss',
  '@lytjs/plugin-eslint',
  '@lytjs/plugin-prettier',
  '@lytjs/plugin-typescript',
  '@lytjs/plugin-babel',
  '@lytjs/plugin-swc',
  '@lytjs/plugin-esbuild',
  '@lytjs/plugin-rollup',
  '@lytjs/plugin-webpack',
  '@lytjs/plugin-parcel',
  '@lytjs/plugin-vite2',
  '@lytjs/plugin-vite3',
  '@lytjs/plugin-vite4',
  '@lytjs/plugin-vite5',
  '@lytjs/plugin-markdown',
  '@lytjs/plugin-mdx',
  '@lytjs/plugin-yaml',
  '@lytjs/plugin-toml',
  '@lytjs/plugin-json5',
  '@lytjs/plugin-graphql',
  '@lytjs/plugin-apollo',
  '@lytjs/plugin-urql',
  '@lytjs/plugin-relay',
  '@lytjs/plugin-trpc',
  '@lytjs/plugin-socket',
  '@lytjs/plugin-websocket',
  '@lytjs/plugin-sse',
  '@lytjs/plugin-fetch',
  '@lytjs/plugin-axios',
  '@lytjs/plugin-ky',
  '@lytjs/plugin-redis',
  '@lytjs/plugin-database',
  '@lytjs/plugin-sql',
  '@lytjs/plugin-prisma',
  '@lytjs/plugin-drizzle',
  '@lytjs/plugin-mongoose',
  '@lytjs/plugin-sequelize',
  '@lytjs/plugin-typeorm',
  '@lytjs/plugin-auth0',
  '@lytjs/plugin-firebase',
  '@lytjs/plugin-supabase',
  '@lytjs/plugin-clerk',
  '@lytjs/plugin-nextauth',
  '@lytjs/plugin-stripe',
  '@lytjs/plugin-paypal',
  '@lytjs/plugin-square',
  '@lytjs/plugin-shopify',
  '@lytjs/plugin-mailchimp',
  '@lytjs/plugin-sendgrid',
  '@lytjs/plugin-twilio',
  '@lytjs/plugin-plivo',
  '@lytjs/plugin-sentry',
  '@lytjs/plugin-datadog',
  '@lytjs/plugin-newrelic',
  '@lytjs/plugin-logrocket',
  '@lytjs/plugin-fullstory',
  '@lytjs/plugin-hotjar',
  '@lytjs/plugin-mixpanel',
  '@lytjs/plugin-amplitude',
  '@lytjs/plugin-segment',
  '@lytjs/plugin-rudderstack',
  '@lytjs/plugin-ga',
  '@lytjs/plugin-google-analytics',
  '@lytjs/plugin-gtag',
  '@lytjs/plugin-facebook',
  '@lytjs/plugin-meta',
  '@lytjs/plugin-twitter',
  '@lytjs/plugin-x',
  '@lytjs/plugin-linkedin',
  '@lytjs/plugin-github',
  '@lytjs/plugin-gitlab',
  '@lytjs/plugin-bitbucket',
  '@lytjs/plugin-docker',
  '@lytjs/plugin-k8s',
  '@lytjs/plugin-kubernetes',
  '@lytjs/plugin-aws',
  '@lytjs/plugin-gcp',
  '@lytjs/plugin-azure',
  '@lytjs/plugin-vercel',
  '@lytjs/plugin-netlify',
  '@lytjs/plugin-cloudflare',
  '@lytjs/plugin-fly',
  '@lytjs/plugin-railway',
  '@lytjs/plugin-render',
  '@lytjs/plugin-heroku',
  '@lytjs/plugin-digitalocean',
  '@lytjs/plugin-linode',
  '@lytjs/plugin-vultr',
  '@lytjs/plugin-upcloud',
  '@lytjs/plugin-ovh',
  '@lytjs/plugin-scaleway',
  '@lytjs/plugin-contabo',
  '@lytjs/plugin-hetzner',
  '@lytjs/plugin-ionos',
  '@lytjs/plugin-strato',
  '@lytjs/plugin-1and1',
  '@lytjs/plugin-godaddy',
  '@lytjs/plugin-namecheap',
  '@lytjs/plugin-namecom',
  '@lytjs/plugin-enom',
  '@lytjs/plugin-opensrs',
  '@lytjs/plugin-tucows',
  '@lytjs/plugin-whmcs',
  '@lytjs/plugin-cpanel',
  '@lytjs/plugin-plesk',
  '@lytjs/plugin-directadmin',
  '@lytjs/plugin-ispconfig',
  '@lytjs/plugin-vestacp',
  '@lytjs/plugin-ajenti',
  '@lytjs/plugin-webmin',
  '@lytjs/plugin-virtualmin',
  '@lytjs/plugin-cloudmin',
  '@lytjs/plugin-proxmox',
  '@lytjs/plugin-esxi',
  '@lytjs/plugin-hyperv',
  '@lytjs/plugin-kvm',
  '@lytjs/plugin-xen',
  '@lytjs/plugin-lxc',
  '@lytjs/plugin-lxd',
  '@lytjs/plugin-docker-compose',
  '@lytjs/plugin-podman',
  '@lytjs/plugin-containerd',
  '@lytjs/plugin-cri-o',
  '@lytjs/plugin-rkt',
  '@lytjs/plugin-systemd-nspawn',
  '@lytjs/plugin-chroot',
  '@lytjs/plugin-jail',
  '@lytjs/plugin-zone',
  '@lytjs/plugin-vserver',
  '@lytjs/plugin-openvz',
  '@lytjs/plugin-vz',
  '@lytjs/plugin-solusvm',
  '@lytjs/plugin-virtuozzo',
  '@lytjs/plugin-parallels',
  '@lytjs/plugin-vmware',
  '@lytjs/plugin-virtualbox',
  '@lytjs/plugin-qemu',
  '@lytjs/plugin-bochs',
  '@lytjs/plugin-pc-emulator',
  '@lytjs/plugin-86box',
  '@lytjs/plugin-pcem',
  '@lytjs/plugin-dosbox',
  '@lytjs/plugin-scummvm',
  '@lytjs/plugin-retroarch',
  '@lytjs/plugin-mame',
  '@lytjs/plugin-fba',
  '@lytjs/plugin-neo-geo',
  '@lytjs/plugin-nintendo',
  '@lytjs/plugin-sega',
  '@lytjs/plugin-sony',
  '@lytjs/plugin-microsoft',
  '@lytjs/plugin-atari',
  '@lytjs/plugin-commodore',
  '@lytjs/plugin-amiga',
  '@lytjs/plugin-apple',
  '@lytjs/plugin-mac',
  '@lytjs/plugin-ios',
  '@lytjs/plugin-tvos',
  '@lytjs/plugin-watchos',
  '@lytjs/plugin-ipados',
  '@lytjs/plugin-android',
  '@lytjs/plugin-android-tv',
  '@lytjs/plugin-android-wear',
  '@lytjs/plugin-chromeos',
  '@lytjs/plugin-windows',
  '@lytjs/plugin-linux',
  '@lytjs/plugin-macos',
  '@lytjs/plugin-freebsd',
  '@lytjs/plugin-netbsd',
  '@lytjs/plugin-openbsd',
  '@lytjs/plugin-dragonflybsd',
  '@lytjs/plugin-solaris',
  '@lytjs/plugin-illumos',
  '@lytjs/plugin-smartos',
  '@lytjs/plugin-omnios',
  '@lytjs/plugin-tribblix',
  '@lytjs/plugin-dilOS',
  '@lytjs/plugin-openindiana',
  '@lytjs/plugin-napp-it',
  '@lytjs/plugin-xstreamos',
  '@lytjs/plugin-joyent',
  '@lytjs/plugin-pkgsrc',
  '@lytjs/plugin-homebrew',
  '@lytjs/plugin-macports',
  '@lytjs/plugin-fink',
  '@lytjs/plugin-chocolatey',
  '@lytjs/plugin-scoop',
  '@lytjs/plugin-winget',
  '@lytjs/plugin-snap',
  '@lytjs/plugin-flatpak',
  '@lytjs/plugin-appimage',
  '@lytjs/plugin-dpkg',
  '@lytjs/plugin-rpm',
  '@lytjs/plugin-pacman',
  '@lytjs/plugin-aur',
  '@lytjs/plugin-portage',
  '@lytjs/plugin-ebuild',
  '@lytjs/plugin-nix',
  '@lytjs/plugin-guix',
  '@lytjs/plugin-gobo',
  '@lytjs/plinux',
  '@lytjs/plytjs',
  '@lytjs/xlytjs',
  '@lytjs/lytjsx',
  '@lytjs/lytjs-p',
  '@lytjs/lytjs-x',
  '@lytjs/lytjs-legacy',
  '@lytjs/legacy',
  '@lytjs/old',
  '@lytjs/deprecated',
  '@lytjs/archive',
  '@lytjs/archived',
  '@lytjs/test',
  '@lytjs/testing',
  '@lytjs/dev',
  '@lytjs/development',
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
  '@lytjs/latest',
  '@lytjs/current',
  '@lytjs/release',
  '@lytjs/releases',
  '@lytjs/version',
  '@lytjs/versions',
  '@lytjs/tag',
  '@lytjs/tags',
  '@lytjs/branch',
  '@lytjs/branches',
  '@lytjs/commit',
  '@lytjs/commits',
  '@lytjs/build',
  '@lytjs/builds',
  '@lytjs/ci',
  '@lytjs/cd',
  '@lytjs/cicd',
  '@lytjs/pipeline',
  '@lytjs/pipelines',
  '@lytjs/workflow',
  '@lytjs/workflows',
  '@lytjs/action',
  '@lytjs/actions',
  '@lytjs/script',
  '@lytjs/scripts',
  '@lytjs/bin',
  '@lytjs/bins',
  '@lytjs/cli-utils',
  '@lytjs/utils-cli',
  '@lytjs/cli-tools',
  '@lytjs/tools-cli',
  '@lytjs/cli-helpers',
  '@lytjs/helpers-cli',
  '@lytjs/create',
  '@lytjs/create-app',
  '@lytjs/create-project',
  '@lytjs/create-lytjs',
  '@lytjs/create-xyz',
  '@lytjs/xyz',
  '@lytjs/abc',
  '@lytjs/123',
  '@lytjs/one',
  '@lytjs/two',
  '@lytjs/three',
  '@lytjs/four',
  '@lytjs/five',
  '@lytjs/six',
  '@lytjs/seven',
  '@lytjs/eight',
  '@lytjs/nine',
  '@lytjs/ten',
  '@lytjs/zero',
  '@lytjs/first',
  '@lytjs/second',
  '@lytjs/third',
  '@lytjs/fourth',
  '@lytjs/fifth',
  '@lytjs/sixth',
  '@lytjs/seventh',
  '@lytjs/eighth',
  '@lytjs/ninth',
  '@lytjs/tenth',
  '@lytjs/primary',
  '@lytjs/secondary',
  '@lytjs/tertiary',
  '@lytjs/quaternary',
  '@lytjs/quinary',
  '@lytjs/senary',
  '@lytjs/septenary',
  '@lytjs/octonary',
  '@lytjs/nonary',
  '@lytjs/denary',
  '@lytjs/a',
  '@lytjs/b',
  '@lytjs/c',
  '@lytjs/d',
  '@lytjs/e',
  '@lytjs/f',
  '@lytjs/g',
  '@lytjs/h',
  '@lytjs/i',
  '@lytjs/j',
  '@lytjs/k',
  '@lytjs/l',
  '@lytjs/m',
  '@lytjs/n',
  '@lytjs/o',
  '@lytjs/p',
  '@lytjs/q',
  '@lytjs/r',
  '@lytjs/s',
  '@lytjs/t',
  '@lytjs/u',
  '@lytjs/v',
  '@lytjs/w',
  '@lytjs/x',
  '@lytjs/y',
  '@lytjs/z',
  '@lytjs/aa',
  '@lytjs/bb',
  '@lytjs/cc',
  '@lytjs/dd',
  '@lytjs/ee',
  '@lytjs/ff',
  '@lytjs/gg',
  '@lytjs/hh',
  '@lytjs/ii',
  '@lytjs/jj',
  '@lytjs/kk',
  '@lytjs/ll',
  '@lytjs/mm',
  '@lytjs/nn',
  '@lytjs/oo',
  '@lytjs/pp',
  '@lytjs/qq',
  '@lytjs/rr',
  '@lytjs/ss',
  '@lytjs/tt',
  '@lytjs/uu',
  '@lytjs/vv',
  '@lytjs/ww',
  '@lytjs/xx',
  '@lytjs/yy',
  '@lytjs/zz',
];

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
    }, 5000);

    req.end();
  });
}

// 搜索 npm
function searchNpm(query: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'registry.npmjs.org',
      port: 443,
      path: `/-/v1/search?text=${encodeURIComponent(query)}&size=250`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.objects?.map((o: any) => o.package) || []);
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
    }, 15000);

    req.end();
  });
}

async function main() {
  console.log('🔍 正在搜索更多可能的包...\n');

  // 先获取本地所有包
  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  const localPackages = new Set<string>();

  for (const pkgFile of pkgFiles) {
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      if (pkg.name) {
        localPackages.add(pkg.name);
      }
    } catch (e) {
      // skip
    }
  }

  // 先进行更全面的搜索
  const foundFromSearch = new Set<string>();
  
  const searchQueries = [
    '@lytjs',
    'lytjs',
    '@lytjs/*',
    '@lytjs plugin',
    '@lytjs core',
    '@lytjs ui',
    '@lytjs router',
    '@lytjs store',
    '@lytjs ssr',
    '@lytjs ssg',
    '@lytjs cli',
    '@lytjs compiler',
    '@lytjs bundler',
    '@lytjs renderer',
    '@lytjs vdom',
    '@lytjs reactivity',
    '@lytjs component',
    '@lytjs web',
    '@lytjs dom',
    '@lytjs adapter',
    '@lytjs middleware',
    '@lytjs devtools',
    '@lytjs metadata',
    '@lytjs host-contract',
    '@lytjs platform-adapter',
    '@lytjs html-renderer',
    '@lytjs http-server',
    '@lytjs test-utils',
    '@lytjs shared-types',
    '@lytjs runtime-edge',
    '@lytjs cache',
    '@lytjs api',
    '@lytjs hmr',
    '@lytjs compat',
    '@lytjs common',
    '@lytjs core-signal',
    '@lytjs core-vnode',
    '@lytjs dom-runtime',
    '@lytjs router-fs',
  ];

  console.log('📝 执行全面搜索...\n');
  
  for (const query of searchQueries) {
    try {
      console.log(`   搜索: ${query}`);
      const results = await searchNpm(query);
      for (const pkg of results) {
        if (pkg.name.startsWith('@lytjs/')) {
          foundFromSearch.add(pkg.name);
        }
      }
    } catch (e) {
      console.log(`   搜索失败: ${e}`);
    }
  }

  console.log(`\n🔍 从搜索结果中找到 ${foundFromSearch.size} 个包\n`);

  // 加上已知的旧包
  knownOldPackages.forEach(pkg => foundFromSearch.add(pkg));

  // 现在检查可能的包
  console.log('🔍 检查可能的包名...\n');
  const batchSize = 20;
  
  for (let i = 0; i < possiblePackages.length; i += batchSize) {
    const batch = possiblePackages.slice(i, i + batchSize);
    console.log(`   检查第 ${i+1}-${Math.min(i+batchSize, possiblePackages.length)} 个可能的包...`);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (name) => {
        try {
          const info = await getPackageInfo(name);
          return info ? name : null;
        } catch (e) {
          return null;
        }
      })
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        foundFromSearch.add(result.value);
      }
    });
  }

  const allPackages = Array.from(foundFromSearch).sort();
  
  console.log('\n' + '='.repeat(100));
  console.log(`📊 找到总共 ${allPackages.length} 个包`);
  console.log('='.repeat(100));

  // 获取所有包的详细信息
  console.log('\n⏳ 获取所有包的详细信息...\n');
  const packagesWithInfo = [];
  
  for (let i = 0; i < allPackages.length; i += batchSize) {
    const batch = allPackages.slice(i, i + batchSize);
    console.log(`   处理第 ${i+1}-${Math.min(i+batchSize, allPackages.length)} 个包...`);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (name) => {
        try {
          const info = await getPackageInfo(name);
          if (info) {
            return {
              name,
              latestVersion: info['dist-tags']?.latest || null,
              versionsCount: Object.keys(info.versions || {}).length,
              existsLocally: localPackages.has(name)
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      })
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        packagesWithInfo.push(result.value);
      }
    });
  }

  // 统计
  const versionStats: Record<string, number> = {};
  const npmOnly = packagesWithInfo.filter(p => !p.existsLocally);
  
  packagesWithInfo.filter(p => p.latestVersion).forEach(p => {
    versionStats[p.latestVersion!] = (versionStats[p.latestVersion!] || 0) + 1;
  });

  console.log('\n' + '='.repeat(100));
  console.log('📋 各最新版本的包数量：');
  console.log('='.repeat(100));
  
  Object.keys(versionStats).sort((a, b) => b.localeCompare(a)).forEach(version => {
    console.log(`   v${version.padEnd(10)} ${versionStats[version]} 个包`);
  });

  console.log('\n' + '='.repeat(100));
  console.log('📦 所有包列表：');
  console.log('='.repeat(100));
  
  packagesWithInfo
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((pkg, i) => {
      const localMark = pkg.existsLocally ? '✅ 本地存在' : '❌ 本地没有';
      console.log(
        `${String(i + 1).padStart(3)}. ${pkg.name.padEnd(50)} ` +
        `${localMark.padEnd(15)} ` +
        `v${(pkg.latestVersion || 'N/A').padEnd(10)} ` +
        `(${pkg.versionsCount || 0} 个版本)`
      );
    });

  if (npmOnly.length > 0) {
    console.log('\n' + '='.repeat(100));
    console.log('⚠️  npm 上有但本地没有的包：');
    console.log('='.repeat(100));
    npmOnly.forEach((pkg, i) => {
      console.log(
        `${String(i + 1).padStart(3)}. ${pkg.name.padEnd(50)} ` +
        `v${(pkg.latestVersion || 'N/A').padEnd(10)} ` +
        `(${pkg.versionsCount || 0} 个版本)`
      );
    });
  }

  console.log('\n' + '='.repeat(100));
  console.log('📊 最终总结：');
  console.log(`   本地包数量: ${localPackages.size}`);
  console.log(`   npm找到: ${packagesWithInfo.length}`);
  console.log(`   npm有本地无: ${npmOnly.length}`);
  console.log('='.repeat(100));
}

main().catch(console.error);
