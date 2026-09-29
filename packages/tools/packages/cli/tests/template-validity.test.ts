/**
 * 脚手架模板「真实性」门禁
 *
 * ## 为什么需要这个文件
 *
 * 2026-09-26 审计发现：`create` 生成的项目**装不上也跑不起来** ——
 *   ① 依赖 `@lytjs/plugin-vite`：该包已迁出本仓（见 ../plugins），仓内无从安装；
 *   ② 依赖 `@lytjs/server`：**这个包根本不存在**（应为 `@lytjs/ssr`）；
 *   ③ 依赖版本硬编码 `^6.0.0` / `^1.0.0` / `^0.4.0`，而主仓实测版本是 **6.9.6**；
 *   ④ 生成的 `.lyt` SFC 需要构建期插件才能编译 ⇒ 生成即不可用。
 *
 * 这些都不是"运行时才暴露"的错误，而是**模板字符串里写错了** ——
 * 所以本文件用**源码级断言**把它们钉住，避免再次悄悄写回去。
 *
 * ⚠️ 断言刻意用「精确形态」（`join(…'.lyt')`、`from '…'`、依赖键 `':` 冒号）
 * 而不是裸关键词，否则会命中解释性注释里的同名文字。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, acc);
    else if (entry.name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

const SOURCES = collect(srcDir).map((path) => ({
  path: path.slice(srcDir.length + 1),
  code: readFileSync(path, 'utf-8'),
}));

/** 在源码里找出匹配 pattern 的文件（返回相对路径便于定位） */
function offenders(pattern: RegExp): string[] {
  return SOURCES.filter((s) => pattern.test(s.code)).map((s) => s.path);
}

describe('脚手架模板真实性（防止再生成不可用产物）', () => {
  it('不得 import 仓外的 @lytjs/plugin-vite', () => {
    expect(offenders(/from\s+['"]@lytjs\/plugin-vite['"]|['"]@lytjs\/plugin-vite['"]\s*:/)).toEqual(
      [],
    );
  });

  it('不得依赖不存在的包 @lytjs/server', () => {
    expect(offenders(/dependencies\['@lytjs\/server'\]|['"]@lytjs\/server['"]\s*:/)).toEqual([]);
  });

  it('不得生成 .lyt 文件（SFC 需构建期插件，仓内无法编译）', () => {
    // 只匹配「写文件路径」的形态，避免命中注释里提到的 `.lyt`
    expect(offenders(/join\([^)]*\.lyt|['"][^'"]*\.lyt['"]/)).toEqual([]);
  });

  it('@lytjs 依赖版本必须统一为主仓实际版本（^6.9.6）', () => {
    // 正向断言：把所有 `'@lytjs/xxx': '^x.y.z'` 形态捞出来，逐个校验。
    // ⚠️ 不要用"不得出现 ^1.0.0"的反向写法 —— 那会误伤 `vitest: '^1.0.0'`
    // 这类非 @lytjs 依赖（第一版就踩了）。
    const pairs: Array<[file: string, name: string, version: string]> = [];
    for (const s of SOURCES) {
      for (const m of s.code.matchAll(/'(@lytjs\/[a-z-]+)':\s*'(\^[0-9.]+)'/g)) {
        pairs.push([s.path, m[1]!, m[2]!]);
      }
    }
    expect(pairs.length).toBeGreaterThan(0);
    const stale = pairs.filter(([, , v]) => v !== '^6.9.6');
    expect(stale).toEqual([]);
  });

  it('入口检测必须跨 ESM/CJS 安全（不得裸用 `require.main === module`）', () => {
    // 裸写会在 ESM 产物里抛 `module is not defined` ⇒ 整个包无法被 import
    expect(offenders(/if\s*\(\s*require\.main\s*===\s*module\s*\)/)).toEqual([]);
  });
});
