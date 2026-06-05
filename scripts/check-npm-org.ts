#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

// 获取 npm 上某个包的信息
function getPackageInfo(packageName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'registry.npmjs.org',
      port: 443,
      path: `/${packageName}`,
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

    // 10秒超时
    setTimeout(() => {
      req.destroy();
      reject(new Error('Timeout'));
    }, 10000);

    req.end();
  });
}

async function main() {
  console.log('🔍 核查 npm 上 @lytjs 组织的包...\n');

  // 先获取本地所有包名
  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  const localPackages = [];

  for (const pkgFile of pkgFiles) {
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      if (pkg.name) {
        localPackages.push({ name: pkg.name, version: pkg.version });
      }
    } catch (e) {
      // skip
    }
  }

  localPackages.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`📦 本地有 ${localPackages.length} 个包\n`);

  const results = [];
  const batchSize = 10;

  console.log('⏳ 正在从 npm 读取包信息...\n');

  for (let i = 0; i < localPackages.length; i += batchSize) {
    const batch = localPackages.slice(i, i + batchSize);
    console.log(`🔍 检查第 ${i+1}-${Math.min(i+batchSize, localPackages.length)} 个包...`);

    const batchResults = await Promise.allSettled(
      batch.map(async (pkg) => {
        try {
          const npmInfo = await getPackageInfo(pkg.name);
          if (!npmInfo) {
            return { name: pkg.name, exists: false, localVersion: pkg.version };
          }

          const latestVersion = npmInfo['dist-tags']?.latest || null;
          const versions = Object.keys(npmInfo.versions || {});

          return {
            name: pkg.name,
            exists: true,
            localVersion: pkg.version,
            latestVersion,
            versionsCount: versions.length,
            versions,
          };
        } catch (e) {
          return { name: pkg.name, exists: false, error: String(e), localVersion: pkg.version };
        }
      })
    );

    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });
  }

  // 统计不同版本的包数量
  const versionStats: Record<string, number> = {};
  const successResults = results.filter(r => r.exists && r.latestVersion);

  successResults.forEach(r => {
    versionStats[r.latestVersion!] = (versionStats[r.latestVersion!] || 0) + 1;
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 npm 包统计');
  console.log('='.repeat(80));

  console.log('\n📋 各最新版本的包数量：');
  Object.keys(versionStats).sort((a, b) => b.localeCompare(a)).forEach(version => {
    console.log(`   v${version.padEnd(10)} ${versionStats[version]} 个包`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📦 详细包列表 (按最新版本排序)：');
  console.log('='.repeat(80));

  successResults
    .sort((a, b) => (b.latestVersion || '').localeCompare(a.latestVersion || ''))
    .forEach((pkg, i) => {
      const status = pkg.localVersion === pkg.latestVersion ? '✅' : '⚠️ ';
      console.log(
        `${String(i + 1).padStart(3)}. ${status} ${pkg.name.padEnd(40)} ` +
        `本地 v${pkg.localVersion.padEnd(10)} npm v${pkg.latestVersion?.padEnd(10) || 'N/A'} ` +
        `(${pkg.versionsCount} 个历史版本)`
      );
    });

  const notOnNpm = results.filter(r => !r.exists);
  if (notOnNpm.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ 未在 npm 上找到的包：');
    console.log('='.repeat(80));
    notOnNpm.forEach(pkg => {
      console.log(`   ${pkg.name}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 总结：');
  console.log(`   本地包数量: ${localPackages.length}`);
  console.log(`   npm上找到: ${successResults.length}`);
  console.log(`   未找到: ${notOnNpm.length}`);
  console.log('='.repeat(80));
}

main().catch(console.error);
