import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

function main(): void {
  console.log('🔍 检查 workspace 依赖引用...\n');

  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  let hasNonWorkspaceRefs = false;

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
    
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [dep, version] of Object.entries(pkg[field])) {
          if (
            typeof version === 'string' &&
            dep.startsWith('@lytjs/') &&
            !version.startsWith('workspace:')
          ) {
            hasNonWorkspaceRefs = true;
            console.log(`❌ 发现非 workspace 引用: ${pkg.name} → ${dep}@${version}`);
          }
        }
      }
    }
  }

  if (!hasNonWorkspaceRefs) {
    console.log('✅ 所有依赖都是 workspace 引用！');
  } else {
    console.log('\n请运行: pnpm tsx scripts/restore-workspace.ts 来修复');
  }
}

main();
