// tests/scoped-end-to-end.test.ts
/**
 * scoped CSS 端到端门禁
 *
 * ## 为什么单独立一个文件
 *
 * 2026-09-26 审计发现：`<style scoped>` **端到端结构性失效**，且既有测试
 * （`tests/transforms/scoped.test.ts`，226 行）**一直是绿的** ——
 * 因为它手工构造带 `scopeId` 的 context 再断言属性存在，
 * 从未覆盖真实编译路径。典型的「假绿」。
 *
 * 真实情况是两处缺陷叠加：
 *   ① `createTransformContext` 逐字段构造 context 时**漏了 `scopeId`**
 *      ⇒ `transformScoped` 里的 `if (!scopeId) return` 永远提前返回；
 *   ② 即便接上，`transformScoped` 把 scopeId（裸 hash）直接当**属性名**，
 *      而 `scopeCSS()` 生成的是 `[data-v-${scopeId}]` 选择器 ⇒ **两侧永远匹配不上**。
 *
 * 因此本文件的断言**不是"属性存在"**，而是
 * **「产物里的属性名」与「CSS 选择器里的属性名」必须是同一批字符串**。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { parseSFC } from '../src/sfc/parse';
import { compileSFC } from '../src/sfc/compile';

/** 从产物代码里提取所有 `data-v-*` 属性名 */
function extractAttrNames(code: string): string[] {
  return [...new Set([...code.matchAll(/"(data-v-[a-z0-9-]+)"/g)].map((m) => m[1]!))];
}

/** 从 CSS 里提取所有 `[data-v-*]` 选择器用到的属性名 */
function extractSelectorNames(css: string): string[] {
  return [...new Set([...css.matchAll(/\[(data-v-[a-z0-9-]+)\]/g)].map((m) => m[1]!))];
}

describe('scoped CSS 端到端', () => {
  it('compile + scopeId：每个元素都带上 data-v-<id> 属性', () => {
    const { code } = compile('<div class="a">hi</div>', { mode: 'module', scopeId: 'abc123' });
    expect(extractAttrNames(code)).toEqual(['data-v-abc123']);
  });

  it('未提供 scopeId 时不得注入任何 data-v- 属性（避免误加）', () => {
    const { code } = compile('<div class="a">hi</div>', { mode: 'module' });
    expect(extractAttrNames(code)).toEqual([]);
  });

  it('compileSFC scoped：产物属性名与 CSS 选择器必须指向同一属性（关键断言）', () => {
    const source = [
      '<template><div class="a"><p>x</p></div></template>',
      '<style scoped>.a { color: red }\n.b:hover { color: blue }</style>',
    ].join('\n');

    const descriptor = parseSFC(source, { filename: 'Scoped.lyt' });
    const result = compileSFC(descriptor, { scoped: true, id: 'abc123' });

    const attrs = extractAttrNames(result.code);
    const selectors = extractSelectorNames(result.css ?? '');

    // 两侧都必须非空，且**集合一致** —— 只断言"存在"会漏掉命名约定冲突
    expect(attrs.length).toBeGreaterThan(0);
    expect(selectors.length).toBeGreaterThan(0);
    expect(attrs.every((a) => selectors.includes(a))).toBe(true);
    // 反向也要成立：选择器引用的属性必须真的会被渲染到 DOM 上
    expect(selectors.every((s) => attrs.includes(s))).toBe(true);
  });

  it('作用域 id 由 filename 派生时同样一致（未显式传 id 的默认路径）', () => {
    const source = [
      '<template><div class="box">y</div></template>',
      '<style scoped>.box { margin: 0 }</style>',
    ].join('\n');

    const descriptor = parseSFC(source, { filename: 'Default.lyt' });
    const result = compileSFC(descriptor, { scoped: true });

    const attrs = extractAttrNames(result.code);
    const selectors = extractSelectorNames(result.css ?? '');

    expect(attrs.length).toBe(1);
    expect(attrs).toEqual(selectors);
    // 默认 scopeId 是裸 hash（8 位十六进制），不得带 data-v- 前缀
    expect(attrs[0]).toMatch(/^data-v-[0-9a-f]{8}$/);
  });
});
