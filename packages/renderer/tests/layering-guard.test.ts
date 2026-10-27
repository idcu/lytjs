/**
 * 分层守卫：`@lytjs/renderer` **不得**引用 `@lytjs/core`（P1-N 回归）
 *
 * ## 为什么需要这条
 *
 * 2026-10-27 之前，`renderer/src/hydration/enhanced-hydration.ts` 里有 4 处
 * `await import('@lytjs/core')` 来拿 `createApp`。这是三重问题：
 *
 *   ① **分层倒置**：renderer 是 core 的下层（core 依赖 renderer），却反过来引用上层
 *      ⇒ core ↔ renderer 成环；
 *   ② **幽灵依赖**：renderer 的 `package.json` 里 **dependencies / peerDependencies
 *      都没有** `@lytjs/core`（实测），严格 pnpm 安装下这条 import 直接解析不到，
 *      本仓能跑只是因为 workspace 符号链接恰好把包放在一起；
 *   ③ **体积污染**：core 的编译器（~98 KB raw）通过这条反向边被拖进
 *      **每一个**含 renderer 的产物 ⇒ `@lytjs/core/runtime`（不含编译器入口）失效。
 *
 * 修法是把「创建 App 实例」做成注入缝（`@lytjs/component` 的
 * `setAppFactory` / `getAppFactory`），由 core 注入、renderer 取用 —— 依赖方向恢复单向。
 *
 * ## 这条守卫的做法
 *
 * 直接扫源码文本，**先剥注释**（否则本文件的说明、以及源码里解释历史的注释
 * 都会被误判为违规）。剥完还出现 `@lytjs/core` 就是真违规。
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RENDERER_SRC = join(__dirname, '..', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts)$/.test(full)) out.push(full);
  }
  return out;
}

/** 剥掉块注释与行注释（够用即可：本守卫只关心「代码里有没有这个包名」） */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('renderer 分层守卫（P1-N 回归）', () => {
  it('src 里不得 import @lytjs/core（注释除外）', () => {
    const offenders: string[] = [];

    for (const file of walk(RENDERER_SRC)) {
      const code = stripComments(readFileSync(file, 'utf8'));
      // 匹配 `from '@lytjs/core'` / `import('@lytjs/core')` / `require('@lytjs/core')`
      if (/['"]@lytjs\/core['"]/.test(code)) {
        offenders.push(relative(RENDERER_SRC, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('renderer 的 package.json 不得声明 @lytjs/core（否则就是把环合法化）', () => {
    const pkg = JSON.parse(readFileSync(join(RENDERER_SRC, '..', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };

    expect(pkg.dependencies?.['@lytjs/core']).toBeUndefined();
    expect(pkg.peerDependencies?.['@lytjs/core']).toBeUndefined();
  });

  it('水合模块必须走注入缝，而不是自己造 App', () => {
    const code = stripComments(
      readFileSync(join(RENDERER_SRC, 'hydration', 'enhanced-hydration.ts'), 'utf8'),
    );

    expect(code).toContain('getAppFactory');
    expect(code).toContain('hasAppFactory');
    // 旧的直连写法必须彻底消失
    expect(code).not.toMatch(/await\s+import\(\s*['"]@lytjs\/core['"]\s*\)/);
  });
});
