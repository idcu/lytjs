/**
 * scripts/shared.ts
 * 脚本间共享的工具函数
 */

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 递归查找目录下所有 package.json 文件
 */
export function findPackageJsonFiles(dir: string): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) {
    return results;
  }

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = join(dir, entry.name);
      const pkgJsonPath = join(fullPath, 'package.json');

      if (existsSync(pkgJsonPath)) {
        results.push(pkgJsonPath);
      }

      // 递归搜索子目录（但排除 node_modules、dist 和 _templates）
      if (
        entry.name !== 'node_modules' &&
        entry.name !== 'dist' &&
        entry.name !== '.turbo' &&
        entry.name !== '_templates'
      ) {
        results.push(...findPackageJsonFiles(fullPath));
      }
    }
  }

  return results;
}
