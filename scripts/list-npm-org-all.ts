#!/usr/bin/env tsx
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPackageJsonFiles } from './shared.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// 获取 npm 上组织的所有包 - 使用搜索方式
async function getAllOrgPackages(orgName: string): Promise<string[]> {
  // 方法1: 使用 npm search API
  const packages: string[] = [];

  console.log(`🔍 正在搜索 npm 上 @${orgName} 组织的所有包...\n`);

  // 尝试搜索所有 @lytjs 开头的包
  const searchQueries = ['@lytjs', 'lytjs'];
  
  for (const query of searchQueries) {
    console.log(`   搜索关键词: ${query}`);
    try {
      const results = await searchNpm(query);
      for (const pkg of results) {
        if (pkg.name.startsWith(`@${orgName}/`) && !packages.includes(pkg.name)) {
          packages.push(pkg.name);
        }
      }
    } catch (e) {
      console.log(`   搜索失败: ${e}`);
    }
  }

  packages.sort();
  return packages;
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

async function main() {
  // 获取本地所有包
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

  console.log(`📦 本地项目包数量: ${localPackages.size}\n`);

  // 获取 npm 上的所有包
  const npmPackages = await getAllOrgPackages('lytjs');
  console.log(`\n🔍 在 npm 上找到 ${npmPackages.length} 个包\n`);

  // 获取每个包的详细信息
  console.log('⏳ 正在获取每个包的详细信息...\n');
  const packagesWithInfo = [];
  const batchSize = 10;

  for (let i = 0; i < npmPackages.length; i += batchSize) {
    const batch = npmPackages.slice(i, i + batchSize);
    console.log(`   处理第 ${i+1}-${Math.min(i+batchSize, npmPackages.length)} 个包...`);

    const batchResults = await Promise.allSettled(
      batch.map(async (name) => {
        try {
          const info = await getPackageInfo(name);
          if (info) {
            return {
              name,
              latestVersion: info['dist-tags']?.latest || null,
              versionsCount: Object.keys(info.versions || {}).length,
              lastModified: info.time?.modified || null,
              existsLocally: localPackages.has(name)
            };
          }
          return { name, exists: false, existsLocally: localPackages.has(name) };
        } catch (e) {
          return { name, error: String(e), existsLocally: localPackages.has(name) };
        }
      })
    );

    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        packagesWithInfo.push(result.value);
      }
    });
  }

  // 统计
  const versionStats: Record<string, number> = {};
  const localOnly = Array.from(localPackages).filter(p => !npmPackages.includes(p));
  const npmOnly = packagesWithInfo.filter(p => !p.existsLocally);

  packagesWithInfo.filter(p => p.latestVersion).forEach(p => {
    versionStats[p.latestVersion!] = (versionStats[p.latestVersion!] || 0) + 1;
  });

  // 输出结果
  console.log('\n' + '='.repeat(100));
  console.log('📊 npm 上 @lytjs 组织包完整统计');
  console.log('='.repeat(100));

  console.log('\n📋 各最新版本的包数量：');
  Object.keys(versionStats).sort((a, b) => b.localeCompare(a)).forEach(version => {
    console.log(`   v${version.padEnd(10)} ${versionStats[version]} 个包`);
  });

  console.log('\n' + '='.repeat(100));
  console.log('📦 npm 上所有 @lytjs 包列表：');
  console.log('='.repeat(100));

  packagesWithInfo
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((pkg, i) => {
      const localMark = pkg.existsLocally ? '✅ 本地存在' : '❌ 本地没有';
      console.log(
        `${String(i + 1).padStart(3)}. ${pkg.name.padEnd(45)} ` +
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
        `${String(i + 1).padStart(3)}. ${pkg.name.padEnd(45)} ` +
        `v${(pkg.latestVersion || 'N/A').padEnd(10)} ` +
        `(${pkg.versionsCount || 0} 个版本)`
      );
    });
  }

  if (localOnly.length > 0) {
    console.log('\n' + '='.repeat(100));
    console.log('📦 本地有但 npm 搜索未找到的包：');
    console.log('='.repeat(100));
    localOnly.forEach((pkg, i) => {
      console.log(`${String(i + 1).padStart(3)}. ${pkg}`);
    });
  }

  console.log('\n' + '='.repeat(100));
  console.log('📊 最终总结：');
  console.log(`   本地包数量: ${localPackages.size}`);
  console.log(`   npm搜索到: ${npmPackages.length}`);
  console.log(`   npm有本地无: ${npmOnly.length}`);
  console.log(`   本地有npm无: ${localOnly.length}`);
  console.log('='.repeat(100));
}

main().catch(console.error);
