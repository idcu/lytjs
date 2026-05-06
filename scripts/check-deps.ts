/**
 * 依赖方向检查脚本
 *
 * 用途：检查所有包的依赖是否遵循层级约束，禁止反向依赖和同层交叉依赖。
 *
 * 层级定义：
 *   L0: @lytjs/common-* (零外部依赖)
 *   L1: @lytjs/reactivity, @lytjs/vdom, @lytjs/compiler (依赖 L0)
 *   L2: @lytjs/renderer, @lytjs/component (依赖 L0 + L1)
 *   L3: @lytjs/core (依赖 L0 + L1 + L2)
 *   L4: @lytjs/router, @lytjs/store, @lytjs/compat (依赖 L0 + L1)
 *   L5: @lytjs/cli, @lytjs/devtools, @lytjs/lytx, @lytjs/ai, @lytjs/test-utils (依赖 L3)
 *   L6: @lytjs/ui-*, @lytjs/plugin-* (依赖 L3 + L5)
 *   L7: @lytjs/lytjs (聚合包，依赖全部)
 *
 * 用法: pnpm run check-deps
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

import { findPackageJsonFiles } from './shared.js';

// 层级定义
const LAYER_MAP: Record<string, number> = {
  // L0
  '@lytjs/common-is': 0,
  '@lytjs/common-object': 0,
  '@lytjs/common-string': 0,
  '@lytjs/common-path': 0,
  '@lytjs/common-events': 0,
  '@lytjs/common-cache': 0,
  '@lytjs/common-timing': 0,
  '@lytjs/common-scheduler': 0,
  '@lytjs/common-error': 0,
  '@lytjs/common-algorithm': 0,
  '@lytjs/common-vnode': 0,
  '@lytjs/common-env': 0,
  '@lytjs/common': 0,
  '@lytjs/shared-types': 0,
  '@lytjs/host-contract': 0,
  // L1
  '@lytjs/reactivity': 1,
  '@lytjs/vdom': 1,
  '@lytjs/compiler': 1,
  '@lytjs/dom-runtime': 1,
  // L2
  '@lytjs/renderer': 2,
  '@lytjs/component': 2,
  '@lytjs/adapter-web': 2,
  // L3
  '@lytjs/core': 3,
  '@lytjs/core-vnode': 3,
  '@lytjs/core-signal': 3,
  // L4
  '@lytjs/router': 4,
  '@lytjs/store': 4,
  '@lytjs/compat': 4,
  // L5
  '@lytjs/cli': 5,
  '@lytjs/devtools': 5,
  '@lytjs/lytx': 5,
  '@lytjs/ai': 5,
  '@lytjs/test-utils': 5,
  // L6
  '@lytjs/ui-core': 6,
  '@lytjs/ui-components': 6,
  '@lytjs/ui-theme': 6,
  '@lytjs/ui-icons': 6,
  // L7
  '@lytjs/lytjs': 7,
};

// 允许的跨层依赖（例外情况）
const ALLOWED_CROSS_LAYER: Record<string, Set<string>> = {
  // L4 包允许依赖 L0 + L1（不需要 L2/L3）
  '@lytjs/router': new Set(['@lytjs/common-*', '@lytjs/reactivity', '@lytjs/vdom']),
  '@lytjs/store': new Set(['@lytjs/common-*', '@lytjs/reactivity', '@lytjs/vdom']),
  '@lytjs/compat': new Set(['@lytjs/common-*', '@lytjs/reactivity', '@lytjs/vdom']),
};

interface Violation {
  source: string;
  target: string;
  sourceLayer: number;
  targetLayer: number;
  type: 'reverse' | 'cross-layer' | 'same-layer';
}

function getLayer(packageName: string): number {
  // 精确匹配
  if (LAYER_MAP[packageName] !== undefined) {
    return LAYER_MAP[packageName]!;
  }
  // 通配符匹配（如 @lytjs/common-* 匹配所有 L0 common 包）
  if (packageName.startsWith('@lytjs/common-')) {
    return 0;
  }
  if (packageName.startsWith('@lytjs/ui-')) {
    return 6;
  }
  if (packageName.startsWith('@lytjs/plugin-')) {
    return 6;
  }
  // 非内部包，返回 -1
  return -1;
}

function isWildcardMatch(allowed: Set<string>, depName: string): boolean {
  if (allowed.has(depName)) return true;
  for (const pattern of allowed) {
    if (pattern.endsWith('*') && depName.startsWith(pattern.slice(0, -1))) {
      return true;
    }
  }
  return false;
}

function checkDependencies(): Violation[] {
  const violations: Violation[] = [];
  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    const sourceName = pkg.name;
    const sourceLayer = getLayer(sourceName);

    if (sourceLayer === -1) {
      continue; // 跳过非内部包
    }

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.peerDependencies,
    };

    for (const [depName, _version] of Object.entries(allDeps)) {
      if (!depName.startsWith('@lytjs/')) {
        continue; // 跳过非内部依赖
      }

      const targetLayer = getLayer(depName);

      if (targetLayer === -1) {
        continue; // 未知内部包，跳过
      }

      // 检查反向依赖
      if (targetLayer > sourceLayer) {
        violations.push({
          source: sourceName,
          target: depName,
          sourceLayer,
          targetLayer,
          type: 'reverse',
        });
        continue;
      }

      // 检查同层交叉依赖
      if (targetLayer === sourceLayer && sourceName !== depName) {
        violations.push({
          source: sourceName,
          target: depName,
          sourceLayer,
          targetLayer,
          type: 'same-layer',
        });
        continue;
      }

      // 检查跨层依赖（跳过相邻层）
      if (targetLayer < sourceLayer - 1) {
        const allowed = ALLOWED_CROSS_LAYER[sourceName];
        if (!allowed || !isWildcardMatch(allowed, depName)) {
          violations.push({
            source: sourceName,
            target: depName,
            sourceLayer,
            targetLayer,
            type: 'cross-layer',
          });
        }
      }
    }
  }

  return violations;
}

function main(): void {
  console.log('🔍 检查依赖方向...\n');

  const violations = checkDependencies();

  if (violations.length === 0) {
    console.log('✅ 所有依赖方向正确，未发现违规。\n');
    process.exit(0);
  }

  console.log(`❌ 发现 ${violations.length} 个依赖方向违规：\n`);

  for (const v of violations) {
    const typeLabel = {
      reverse: '反向依赖',
      'cross-layer': '跨层依赖',
      'same-layer': '同层交叉依赖',
    }[v.type];

    console.log(
      `  [${typeLabel}] ${v.source} (L${v.sourceLayer}) → ${v.target} (L${v.targetLayer})`,
    );
  }

  console.log('\n请修复以上违规后重新运行检查。');
  process.exit(1);
}

main();
