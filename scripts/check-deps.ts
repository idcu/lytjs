/**
 * 依赖方向检查脚本
 *
 * 用途：检查所有包的依赖是否遵循层级约束，禁止反向依赖和同层交叉依赖。
 *
 * 层级定义（2026-11-07 S02 起要求 **76/76 全部登记**；未登记即红）：
 *   L0: @lytjs/common-* / shared-types / host-contract（零外部依赖）
 *   L1: reactivity, vdom, compiler, dom-runtime 及平台工具（依赖 L0）
 *   L2: renderer, component, adapter-web, ssr 及生态引擎（依赖 L0 ~ L1）
 *   L3: core / core-vnode / core-signal 及 ssg、html-renderer、devtools-extension
 *   L4: router, store, compat, router-fs
 *   L5: cli, devtools, test-utils
 *   L6: @lytjs/ui（聚合消费端）
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
  // L1 平台工具 / 通用基础设施（零业务依赖，或只依赖 L0）
  // 2026-11-07（S02）：此前未登记 ⇒ check-deps 直接跳过，依赖方向对它们失明。
  '@lytjs/dom': 1,
  '@lytjs/web': 1,
  '@lytjs/runtime-edge': 1,
  '@lytjs/hmr': 1,
  '@lytjs/cache': 1,
  '@lytjs/config': 1,
  '@lytjs/di': 1,
  '@lytjs/middleware': 1,
  '@lytjs/metadata': 1,
  // L2
  '@lytjs/renderer': 2,
  '@lytjs/component': 2,
  '@lytjs/adapter-web': 2,
  // L2 生态引擎 / 服务端组件
  '@lytjs/ssr': 2,
  '@lytjs/api': 2,
  '@lytjs/bundler': 2,
  '@lytjs/platform-adapter': 2,
  '@lytjs/cache-isr': 2,
  '@lytjs/middleware-auth': 2,
  '@lytjs/middleware-cors': 2,
  '@lytjs/middleware-rate-limit': 2,
  '@lytjs/http-server': 2,
  '@lytjs/plugin': 2,
  // L3
  '@lytjs/core': 3,
  // `@lytjs/core-vnode` 与 core 同属「核心运行时层」，但它是**窄核心**：
  // 只依赖 L0~L2，而 core 反过来组合它（`core/src/web-component.ts` 转发 Web Component）。
  // 二者的依赖方向是单向的 core → core-vnode，故在 `ALLOWED_SAME_LAYER_DIRECTED` 里
  // 显式登记这一条**有向**例外，而不是把它下移到 L2（它依赖 component/renderer，下移会误报）。
  '@lytjs/core-vnode': 3,
  '@lytjs/core-signal': 3,
  // L3 生态构建/服务端产物（依赖 L2 的 ssr 或 component）
  '@lytjs/ssg': 3,
  '@lytjs/html-renderer': 3,
  '@lytjs/devtools-extension': 3,
  // L4
  '@lytjs/router': 4,
  '@lytjs/store': 4,
  '@lytjs/compat': 4,
  '@lytjs/router-fs': 4,
  // L5
  '@lytjs/cli': 5,
  '@lytjs/devtools': 5,
  '@lytjs/test-utils': 5,
  // L6
  // 2026-11-07（S02）：原 `@lytjs/ui-core/ui-components/ui-theme/ui-icons` 与
  // `@lytjs/lytx/ai/lytjs` 均为**不存在的包名**，已删除；只保留真实存在的聚合包。
  '@lytjs/ui': 6,
};

// 允许的跨层依赖（例外情况）
const ALLOWED_CROSS_LAYER: Record<string, Set<string>> = {
  // L4 包允许依赖 L0 + L1 + L2
  '@lytjs/router': new Set([
    '@lytjs/common-*',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
  ]),
  '@lytjs/store': new Set([
    '@lytjs/common-*',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
  ]),
  '@lytjs/compat': new Set([
    '@lytjs/common-*',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
  ]),
  // L3 包允许依赖 L0 + L1 + L2 层
  '@lytjs/core': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/dom-runtime',
    // core 的配置系统直接复用独立包 `@lytjs/config`（`core/src/config.ts:11`）；
    // 它是 L1 通用基础设施，core 用它是**向下**消费，不是反向依赖。
    '@lytjs/config',
  ]),
  '@lytjs/core-vnode': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
  ]),
  '@lytjs/core-signal': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/dom-runtime',
  ]),
  // L2 包允许依赖 L0 层
  '@lytjs/component': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  '@lytjs/renderer': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  '@lytjs/adapter-web': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  // L1 包允许依赖 L0 层
  '@lytjs/reactivity': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  '@lytjs/vdom': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  '@lytjs/compiler': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  '@lytjs/dom-runtime': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  // L0 层特殊依赖
  '@lytjs/common-transition-engine': new Set(['@lytjs/common-*', '@lytjs/host-contract']),
  '@lytjs/common-async-scheduler': new Set(['@lytjs/common-*', '@lytjs/host-contract']),
  '@lytjs/common-event-normalizer': new Set([
    '@lytjs/common-*',
    '@lytjs/host-contract',
    '@lytjs/common-events',
  ]),
  '@lytjs/common-node-cache': new Set(['@lytjs/common-*', '@lytjs/host-contract']),
  '@lytjs/common-render-queue': new Set(['@lytjs/common-*', '@lytjs/host-contract']),
  '@lytjs/common-scheduler': new Set(['@lytjs/common-*', '@lytjs/common-env']),
  '@lytjs/common-dom': new Set(['@lytjs/common-*', '@lytjs/host-contract']),
  '@lytjs/common-dom-helpers': new Set([
    '@lytjs/common-*',
    '@lytjs/host-contract',
    '@lytjs/common-dom',
  ]),
  // L5 工具包允许依赖各层
  '@lytjs/cli': new Set(['@lytjs/common-*', '@lytjs/shared-types', '@lytjs/host-contract']),
  '@lytjs/devtools': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/component',
    '@lytjs/vdom',
    '@lytjs/compiler',
  ]),
  '@lytjs/test-utils': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/component',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/core',
  ]),
  // L6 插件包允许依赖各层
  '@lytjs/plugin-vite': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
  ]),
  '@lytjs/plugin-animation': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-auth': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-chart': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-data': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
    '@lytjs/plugin-data-fetch',
  ]),
  '@lytjs/plugin-data-fetch': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-form': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-i18n': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-logger': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-storage': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-testing': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-theme': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
  ]),
  '@lytjs/plugin-validation': new Set([
    '@lytjs/common-*',
    '@lytjs/shared-types',
    '@lytjs/host-contract',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/compiler',
    '@lytjs/component',
    '@lytjs/renderer',
    '@lytjs/core',
    '@lytjs/plugin-form',
  ]),

  // ── 2026-11-07（S02）新增登记 ─────────────────────────────────────────
  // 下列包此前不在 LAYER_MAP，依赖检查对它们整包跳过。补层之后按实际依赖补
  // 跨层例外；每条只放行该包**真实声明**的 L0 依赖，不放宽到「任意 L0+L1+L2」。
  '@lytjs/ssr': new Set(['@lytjs/common-*']),
  '@lytjs/api': new Set(['@lytjs/common-*', '@lytjs/shared-types']),
  '@lytjs/platform-adapter': new Set(['@lytjs/common-*']),
  '@lytjs/cache-isr': new Set(['@lytjs/common-*']),
  '@lytjs/middleware-auth': new Set(['@lytjs/common-*']),
  '@lytjs/middleware-cors': new Set(['@lytjs/common-*']),
  '@lytjs/middleware-rate-limit': new Set(['@lytjs/common-*']),
  '@lytjs/http-server': new Set(['@lytjs/common-*', '@lytjs/shared-types']),
  '@lytjs/plugin': new Set(['@lytjs/common-*']),
  '@lytjs/ssg': new Set(['@lytjs/common-*']),
  '@lytjs/html-renderer': new Set(['@lytjs/common-*']),
  '@lytjs/devtools-extension': new Set(['@lytjs/common-*', '@lytjs/reactivity']),
  // UI 组件库是 L6 消费端：61 个组件直接调用 `createVNode`/`signal`/`reactive`，
  // 并依赖 `component` 的 slots 与 `core` 的 definePlugin。
  // ⚠️ 与 `keel/ARCHITECTURE.md:26`「上层只依赖 core 与 component」冲突（C3）；
  // 此处**只登记现状并留痕**，不在 S02 内改架构文档，也不擅自把 UI 降层。
  '@lytjs/ui': new Set([
    '@lytjs/common-*',
    '@lytjs/reactivity',
    '@lytjs/vdom',
    '@lytjs/component',
    '@lytjs/core',
  ]),
};

// 允许同层交叉依赖的包（聚合包等特殊情况）
//
// ⚠️ 这份白名单是**无向**的（`has(source) || has(target)` 即放行），
// 因此它无法表达「A 依赖 B 可以，B 依赖 A 不行」。真有方向性需求时用下面的
// `ALLOWED_SAME_LAYER_DIRECTED`，不要往这里加。
const ALLOWED_SAME_LAYER_DEPS: Record<number, Set<string>> = {
  0: new Set([
    '@lytjs/common',
    '@lytjs/common-warn',
    '@lytjs/common-dom',
    '@lytjs/common-dom-helpers',
    '@lytjs/common-events',
    '@lytjs/common-string',
    '@lytjs/common-is',
    '@lytjs/common-object',
    '@lytjs/common-error',
    '@lytjs/common-performance',
    '@lytjs/common-security',
    '@lytjs/common-scheduler',
    '@lytjs/common-env',
    '@lytjs/common-algorithm',
    '@lytjs/common-http',
    '@lytjs/common-query',
    '@lytjs/common-storage',
    '@lytjs/common-keyboard',
    '@lytjs/common-a11y',
    '@lytjs/common-validate',
    '@lytjs/common-raf',
    '@lytjs/common-cache',
    '@lytjs/common-timing',
    '@lytjs/common-path',
    '@lytjs/common-node-cache',
    '@lytjs/common-vnode',
    '@lytjs/host-contract',
  ]),
  1: new Set(['@lytjs/reactivity', '@lytjs/dom-runtime', '@lytjs/vdom']),
  2: new Set(['@lytjs/renderer', '@lytjs/adapter-web']),
  6: new Set([
    '@lytjs/plugin-data',
    '@lytjs/plugin-data-fetch',
    '@lytjs/plugin-form',
    '@lytjs/plugin-validation',
  ]),
};

/**
 * **有向**的同层依赖例外：`[from, to]` 表示只允许 `from → to`，反向仍算违规。
 *
 * 用途：同一层里存在「窄核心 / 完整核心」这种单向组合关系时，无向白名单会
 * 连反向依赖一起放行（那会掩盖真正的循环依赖）。
 *
 * 当前两条：
 * - `@lytjs/core → @lytjs/core-vnode` —— core 是完整核心，core-vnode 是仅 VNode 的窄核心，
 *   core 组合它（`core/src/web-component.ts` 转发 Web Component 权威实现）。
 * - `@lytjs/ssr → @lytjs/component` —— SSR 渲染器与 component 同为 L2，SSR 单向消费
 *   component 的 slots/渲染契约；反向（component → ssr）仍按同层交叉报红。
 */
const ALLOWED_SAME_LAYER_DIRECTED: Array<[string, string]> = [
  ['@lytjs/core', '@lytjs/core-vnode'],
  ['@lytjs/ssr', '@lytjs/component'],
];

interface Violation {
  source: string;
  target: string;
  sourceLayer: number;
  targetLayer: number;
  type: 'reverse' | 'cross-layer' | 'same-layer' | 'unregistered';
}

interface Coverage {
  total: number;
  registered: number;
  missing: string[];
}

function getLayer(packageName: string): number {
  // 精确匹配
  if (LAYER_MAP[packageName] !== undefined) {
    return LAYER_MAP[packageName]!;
  }
  // 通配符匹配：`@lytjs/common-*` 是真实存在的 34 个子包族，统一按 L0。
  // ⚠️ 不要给 `ui-*` / `plugin-*` 加通配符：那会让**未登记的包**静默拿到层级，
  // 正是 S02 要修掉的「跳过」缺口。未登记一律返回 -1，由调用方报红。
  if (packageName.startsWith('@lytjs/common-')) {
    return 0;
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

function checkDependencies(): { violations: Violation[]; coverage: Coverage } {
  const violations: Violation[] = [];
  const pkgFiles = findPackageJsonFiles(join(ROOT, 'packages'));
  const coverage: Coverage = { total: 0, registered: 0, missing: [] };

  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    const sourceName = pkg.name;
    if (!sourceName.startsWith('@lytjs/')) {
      continue;
    }
    coverage.total += 1;
    const sourceLayer = getLayer(sourceName);

    if (sourceLayer === -1) {
      // ★ 2026-11-07（S02）：未登记层的内部包**必须报红**，不得 continue。
      // 旧行为让 24/76 个包整包跳过，依赖方向检查对它们完全失明。
      coverage.missing.push(sourceName);
      violations.push({
        source: sourceName,
        target: '(自身)',
        sourceLayer: -1,
        targetLayer: -1,
        type: 'unregistered',
      });
      continue;
    }
    coverage.registered += 1;

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
        // ★ 2026-11-07（S02）：内部依赖没有层级同样报红。旧行为 `continue` 会让
        // 未登记的目标包成为「隐形依赖」，反向/跨层都查不出来。
        violations.push({
          source: sourceName,
          target: depName,
          sourceLayer,
          targetLayer: -1,
          type: 'unregistered',
        });
        continue;
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
        const allowedSameLayer = ALLOWED_SAME_LAYER_DEPS[sourceLayer];
        if (
          allowedSameLayer &&
          (allowedSameLayer.has(sourceName) || allowedSameLayer.has(depName))
        ) {
          continue; // 聚合包之间的依赖是允许的
        }
        // 有向例外：只放行登记过的那一个方向，反向仍报违规
        if (
          ALLOWED_SAME_LAYER_DIRECTED.some(([from, to]) => from === sourceName && to === depName)
        ) {
          continue;
        }
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

  return { violations, coverage };
}

function main(): void {
  console.log('🔍 检查依赖方向...\n');

  const { violations, coverage } = checkDependencies();

  // 覆盖声明必须显式可见：不接受「76 个包只查了 52 个却报绿」。
  console.log(`📦 层级覆盖：${coverage.registered}/${coverage.total} 个内部包`);
  if (coverage.missing.length > 0) {
    console.log(`   未登记：${coverage.missing.join(', ')}`);
  }
  console.log('');

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
      unregistered: '未登记层级',
    }[v.type];

    if (v.type === 'unregistered' && v.target === '(自身)') {
      console.log(`  [${typeLabel}] ${v.source} 不在 LAYER_MAP，依赖方向无法校验`);
      continue;
    }

    console.log(
      `  [${typeLabel}] ${v.source} (L${v.sourceLayer}) → ${v.target} (L${v.targetLayer})`,
    );
  }

  console.log('\n请修复以上违规后重新运行检查。');
  process.exit(1);
}

main();
