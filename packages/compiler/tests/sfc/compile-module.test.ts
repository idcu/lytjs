/**
 * `compileSFC` 产物必须**可执行**（P0 回归电池）
 *
 * ## 为什么需要这条
 *
 * 2026-10-26 评估实测：`compileSFC` 的产物是「script 原文 + 一个游离的 render 函数」：
 *   - `compile()` 把 helper 的 import 放在 `preamble` 里，而 `compileSFC` **只取 `code`**
 *     ⇒ 产物里的 `openBlock` / `createBlock` / `toDisplayString` 全是未定义标识符；
 *   - `export default {...}` 原样输出，render 函数**没有挂到组件上**，也没有任何引用。
 * 两者叠加的结果是：任何 `.lyt` / `.vue` 编译产物一执行就 `ReferenceError`，
 * 或者"能 import 但组件没有 render、模板等于不存在"（静默）。
 *
 * ## 判据
 *
 * 不是断言字符串形状，而是**真的把产物当模块跑一遍**：
 * 剥掉 `import`（helper 由工厂参数注入）、把 `export default __sfc__` 换成 `return`，
 * 然后用 `new Function` 执行，最后断言「拿到的组件对象上 render 是函数，且能调出 vnode」。
 */

import { describe, it, expect } from 'vitest';
import { parseSFC } from '../../src/sfc/parse';
import { compileSFC } from '../../src/sfc/compile';

/** 把 ESM 产物变成可在 `new Function` 里执行的表达式，并返回导出的组件 */
function evaluateModule(code: string): Record<string, unknown> {
  const executable = code
    // 去掉 helper import（由工厂形参提供）
    .replace(/^import[^\n]*\n/gm, '')
    // 把默认导出换成 return
    .replace(/export\s+default\s+__sfc__;?/, 'return __sfc__;')
    .replace(/export\s+default\s+/g, 'return ');

  const factory = new Function(
    'openBlock',
    'createBlock',
    'createElementVNode',
    'createElementBlock',
    'toDisplayString',
    'setBlockTracking',
    'withModifiers',
    'renderList',
    'Fragment',
    executable,
  );

  const fakeVNode = (tag: unknown) => ({ __v_isVNode: true, type: tag });
  return factory(
    () => {}, // openBlock
    fakeVNode, // createBlock
    fakeVNode, // createElementVNode
    fakeVNode, // createElementBlock
    (v: unknown) => String(v), // toDisplayString
    () => {}, // setBlockTracking
    (fn: unknown) => fn, // withModifiers
    () => [], // renderList
    Symbol.for('Fragment'),
  ) as Record<string, unknown>;
}

describe('compileSFC 产物可执行（P0 回归）', () => {
  const src = `<template><div class="a">{{ msg }}</div></template>
<script>export default { setup() { return { msg: 'hi' } } }</script>
<style scoped>.a { color: red; }</style>`;

  it('产物包含 helper import（否则运行时 ReferenceError）', () => {
    const result = compileSFC(parseSFC(src, 'X.lyt'), {});
    expect(result.code).toMatch(/^import\s+\{[^}]*createBlock[^}]*\}\s+from\s+'@lytjs\//m);
  });

  it('render 已挂到导出的组件上，且能被调用', () => {
    const result = compileSFC(parseSFC(src, 'X.lyt'), {});
    const comp = evaluateModule(result.code);

    expect(typeof comp.render).toBe('function');
    const vnode = (comp.render as (ctx: unknown, cache: unknown[]) => unknown)({ msg: 'hi' }, []);
    expect(vnode).toBeTruthy();
    expect((vnode as { __v_isVNode?: boolean }).__v_isVNode).toBe(true);
  });

  it('scoped 时组件带 __scopeId，且与 CSS 选择器同源', () => {
    const result = compileSFC(parseSFC(src, 'X.lyt'), {});
    const comp = evaluateModule(result.code);
    expect(comp.__scopeId).toBe(result.scopedId);
    expect(result.css).toContain(`[data-v-${result.scopedId}]`);
  });

  it('没有 script 块时也要导出可渲染的组件', () => {
    const result = compileSFC(parseSFC('<template><p>hi</p></template>', 'Y.lyt'), {});
    const comp = evaluateModule(result.code);
    expect(typeof comp.render).toBe('function');
  });
});
