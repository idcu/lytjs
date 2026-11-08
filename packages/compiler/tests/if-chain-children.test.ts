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
 * 判据：执行产物，按条件逐分支断言**渲染出来的树**。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { Fragment, asVNode, asVNodeList, execute, type RenderedVNode } from './support/execute';

const mount = (template: string, ctx: Record<string, unknown>): RenderedVNode =>
  asVNode(execute(compile(template))(ctx));

const childrenOf = (node: RenderedVNode): unknown[] =>
  Array.isArray(node.children) ? node.children : [node.children];

/** 取 `<div>` 的第一个子节点（条件链/列表产物） */
const firstChild = (template: string, ctx: Record<string, unknown>): RenderedVNode =>
  asVNode(childrenOf(mount(template, ctx))[0]);

describe('v-if 链的分支内容（P0 回归）', () => {
  const tpl = '<div><p v-if="ok"><b>A</b></p><p v-else><i>B</i></p></div>';

  it('v-else 分支里的元素子节点不得丢失', () => {
    const truthy = firstChild(tpl, { ok: true });
    expect(truthy.type).toBe('p');
    expect(asVNode(truthy.children).type).toBe('b');
    expect(asVNode(truthy.children).children).toBe('A');

    const falsy = firstChild(tpl, { ok: false });
    expect(falsy.type).toBe('p');
    expect(asVNode(falsy.children).type).toBe('i');
    expect(asVNode(falsy.children).children).toBe('B');
  });

  it('v-else-if 中间分支的元素子节点同样不得丢失', () => {
    const chain =
      '<div><p v-if="a"><b>1</b></p><p v-else-if="b"><i>2</i></p><p v-else><u>3</u></p></div>';

    expect(asVNode(firstChild(chain, { a: true, b: false }).children).type).toBe('b');
    expect(asVNode(firstChild(chain, { a: false, b: true }).children).type).toBe('i');
    expect(asVNode(firstChild(chain, { a: false, b: false }).children).type).toBe('u');
  });

  it('三个分支的嵌套结构都保留（含插值）', () => {
    const nested =
      '<div><div v-if="a"><span>{{ a }}</span></div><div v-else><span>{{ b }}</span></div></div>';

    const truthy = firstChild(nested, { a: 'A', b: 'B' });
    expect(truthy.type).toBe('div');
    expect(asVNode(truthy.children).children).toBe('A');

    const falsy = firstChild(nested, { a: '', b: 'B' });
    expect(falsy.type).toBe('div');
    expect(asVNode(falsy.children).children).toBe('B');
  });

  it('v-else 分支里再嵌 v-if 也要保留', () => {
    const nested = '<div><p v-if="a">A</p><p v-else><b v-if="b">B</b><i v-else>C</i></p></div>';

    expect(firstChild(nested, { a: true, b: false }).children).toBe('A');

    const truthy = asVNode(childrenOf(firstChild(nested, { a: false, b: true }))[0]);
    expect(truthy.type).toBe('b');
    expect(truthy.children).toBe('B');

    const falsy = asVNode(childrenOf(firstChild(nested, { a: false, b: false }))[0]);
    expect(falsy.type).toBe('i');
    expect(falsy.children).toBe('C');
  });

  it('文本分支仍走原路径（不得因为改动而回归）', () => {
    const textOnly = '<div><p v-if="ok">A</p><p v-else>B</p></div>';
    expect(firstChild(textOnly, { ok: true }).children).toBe('A');
    expect(firstChild(textOnly, { ok: false }).children).toBe('B');
  });
});

describe('<template> 编译成 Fragment（P0 回归）', () => {
  it('`<template v-if>` 渲染成 Fragment，而不是字面量 template 元素', () => {
    const fragment = asVNode(
      childrenOf(mount('<div><template v-if="ok">A</template></div>', { ok: true }))[0],
    );
    expect(fragment.type).toBe(Fragment);
    expect(fragment.type).not.toBe('template');
    // children 必须是数组（不能退化成整段文本）
    expect(fragment.children).toEqual(['A']);
  });

  it('`<template v-for>` 每一项各自渲染成 Fragment', () => {
    const fragments = asVNodeList(
      childrenOf(
        mount('<div><template v-for="x in list"><i>{{ x }}</i></template></div>', {
          list: ['a', 'b'],
        }),
      ),
    );
    expect(fragments).toHaveLength(2);
    expect(fragments.every((fragment) => fragment.type === Fragment)).toBe(true);
    expect(fragments.map((fragment) => asVNodeList(fragment.children)[0].children)).toEqual([
      'a',
      'b',
    ]);
  });
});
