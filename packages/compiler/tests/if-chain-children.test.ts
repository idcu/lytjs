/**
 * v-if / v-else 链的**分支内容**（P0 回归）
 *
 * ## 背景
 *
 * 2026-10-28 实测：`v-else` 分支里的**元素子节点被静默丢弃**。
 *
 * ```
 * <div><p v-if="ok"><b>A</b></p><p v-else><i>B</i></p></div>
 *   → (_ctx.ok ? createElementVNode("p", null, createElementVNode("b", …))
 *              : createElementVNode("p", null))        ← <i>B</i> 整片消失
 * ```
 *
 * 根因：条件链是由**链首（v-if 节点）**在它自己的 exit 里构建的，而那时后面的
 * 分支兄弟**还没被遍历** ⇒ 它们的 `codegenNode` 尚未生成 ⇒ 只能手调
 * `transformElement` 兜底，而手调时**分支内部的子元素同样没有 codegenNode**。
 *
 * 文本子节点侥幸存活（字符串不需要子节点 codegen）—— 于是又是「一半能用」：
 * `<p v-else>B</p>` 正常，`<p v-else><i>B</i></p>` 空白。
 *
 * 修法：把链的构建推到**链尾**（`chainEnd` 的 exit 一定晚于所有前序兄弟），
 * 此时每个分支的 codegenNode 都已就绪，直接取用。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

describe('v-if 链的分支内容（P0 回归）', () => {
  it('v-else 分支里的元素子节点不得丢失', () => {
    const { code } = compile('<div><p v-if="ok"><b>A</b></p><p v-else><i>B</i></p></div>');

    expect(code).toContain('createElementVNode("b", null, "A")');
    expect(code).toContain('createElementVNode("i", null, "B")');
    expect(code).toContain('_ctx.ok');
  });

  it('v-else-if 中间分支的元素子节点同样不得丢失', () => {
    const { code } = compile(
      '<div><p v-if="a"><b>1</b></p><p v-else-if="b"><i>2</i></p><p v-else><u>3</u></p></div>',
    );

    expect(code).toContain('createElementVNode("b", null, "1")');
    expect(code).toContain('createElementVNode("i", null, "2")');
    expect(code).toContain('createElementVNode("u", null, "3")');
    expect(code).toContain('_ctx.a');
    expect(code).toContain('_ctx.b');
  });

  it('三个分支的嵌套结构都保留（含插值）', () => {
    const { code } = compile(
      '<div><div v-if="a"><span>{{ a }}</span></div><div v-else><span>{{ b }}</span></div></div>',
    );

    expect((code.match(/toDisplayString/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('v-else 分支里再嵌 v-if 也要保留', () => {
    const { code } = compile(
      '<div><p v-if="a">A</p><p v-else><b v-if="b">B</b><i v-else>C</i></p></div>',
    );

    expect(code).toContain('_ctx.b');
    expect(code).toContain('"B"');
    expect(code).toContain('"C"');
  });

  it('文本分支仍走原路径（不得因为改动而回归）', () => {
    const { code } = compile('<div><p v-if="ok">A</p><p v-else>B</p></div>');

    expect(code).toContain('"A"');
    expect(code).toContain('"B"');
  });
});

describe('<template> 编译成 Fragment（P0 回归）', () => {
  it('`<template v-if>` 不得产出字面量 template 元素', () => {
    const { code, preamble } = compile('<div><template v-if="ok">A</template></div>');

    expect(code).toContain('Fragment');
    expect(code).not.toContain('"template"');
    expect(preamble).toContain('Fragment');
  });

  it('`<template v-for>` 同样', () => {
    const { code, preamble } = compile(
      '<div><template v-for="x in list"><i>{{ x }}</i></template></div>',
    );

    expect(code).toContain('Fragment');
    expect(code).not.toContain('"template"');
    expect(preamble).toContain('Fragment');
  });

  it('Fragment 的 children 必须是数组（不能退化成整段文本）', () => {
    const { code } = compile('<div><template v-if="ok">A</template></div>');

    expect(code).toMatch(/Fragment, null, \[/);
  });
});
