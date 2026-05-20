/**
 * 临时脚本：将所有包更新到 v6.6.0
 * 在有工具链的环境请使用 pnpm run sync-versions --version 6.6.0
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TARGET_VERSION = '6.6.0';

async function main() {
  console.log(`🔄 开始同步所有包版本到 ${TARGET_VERSION}...\n`);

  // 查找所有 package.json
  const pkgFiles = await glob('packages/**/package.json', {
    cwd: ROOT,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  let updatedCount = 0;

  for (const pkgFile of pkgFiles) {
    let needsUpdate = false;
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    const oldVersion = pkg.version;

    // 更新版本号
    if (oldVersion !== TARGET_VERSION) {
      pkg.version = TARGET_VERSION;
      needsUpdate = true;
      console.log(`  📝 ${pkg.name}: ${oldVersion} → ${TARGET_VERSION}`);
      updatedCount++;
    }

    // 更新所有依赖的版本号
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [dep, version] of Object.entries(pkg[field])) {
          if (
            typeof version === 'string' &&
            dep.startsWith('@lytjs/') &&
            !version.startsWith('workspace:')
          ) {
            // 将所有 @lytjs/* 依赖更新到 ^6.6.0
            pkg[field][dep] = `^${TARGET_VERSION}`;
            needsUpdate = true;
          }
        }
      }
    }

    if (needsUpdate) {
      writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    }
  }

  // 更新根 package.json
  const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  if (rootPkg.version !== TARGET_VERSION) {
    rootPkg.version = TARGET_VERSION;
    writeFileSync(join(ROOT, 'package.json'), JSON.stringify(rootPkg, null, 2) + '\n', 'utf-8');
    console.log(`  📝 根 package.json: → ${TARGET_VERSION}`);
  }

  console.log(`\n✅ 完成！共处理 ${pkgFiles.length} 个包。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
