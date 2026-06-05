#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

// 检查 npm 上是否存在某个包的某个版本
function checkPackageOnNpm(packageName: string, version: string): Promise<{ exists: boolean; error?: string }> {
  return new Promise((resolve) => {
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
        resolve({ exists: false });
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const pkgData = JSON.parse(data);
          const versions = Object.keys(pkgData.versions || {});
          const exists = versions.includes(version);
          resolve({ exists });
        } catch (e) {
          resolve({ exists: false, error: 'Parse failed' });
        }
      });
    });

    req.on('error', () => {
      resolve({ exists: false, error: 'Request failed' });
    });

    // 5秒超时
    setTimeout(() => {
      req.destroy();
      resolve({ exists: false, error: 'Timeout' });
    }, 5000);

    req.end();
  });
}

async function main() {
  console.log('🔍 验证所有包是否成功发布...\n');

  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  const packages = [];

  for (const pkgFile of pkgFiles) {
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
      if (pkg.name) {
        packages.push({ name: pkg.name, version: pkg.version });
      }
    } catch (e) {
      // skip
    }
  }

  packages.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`📦 检查 ${packages.length} 个包\n`);

  const results = [];
  const batchSize = 10;

  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize);
    console.log(`🔍 检查第 ${i+1}-${Math.min(i+batchSize, packages.length)} 个包...`);

    const batchResults = await Promise.all(
      batch.map(async (pkg) => {
        const result = await checkPackageOnNpm(pkg.name, pkg.version);
        return { ...pkg, ...result };
      })
    );

    results.push(...batchResults);
  }

  const published = results.filter(r => r.exists);
  const notPublished = results.filter(r => !r.exists);

  console.log('\n' + '='.repeat(70));
  console.log('📊 发布结果汇总：');
  console.log(`✅ 已发布: ${published.length}/${results.length} 个包`);
  console.log(`❌ 未发布: ${notPublished.length}/${results.length} 个包`);
  console.log('='.repeat(70));

  if (notPublished.length > 0) {
    console.log('\n❌ 未发布的包：');
    notPublished.forEach(pkg => {
      console.log(`   ${pkg.name} @ ${pkg.version}`);
    });
  }

  if (published.length === packages.length) {
    console.log('\n🎉 所有包都已成功发布！');
  }
}

main().catch(console.error);
