/**
 * 混排子节点不被静默丢弃（P0 回归电池）
 *
 * ## 为什么需要这条
 *
 * 2026-10-26 的全维度评估实测出一个**通用丢节点**缺陷：
 * `transform-element.ts` 在「多子节点」分支用一个**白名单过滤**挑 codegen 子节点，
 * 只保留 `SIMPLE_EXPRESSION` / `COMPOUND_EXPRESSION` / 带 `codegenNode` 的 `ELEMENT`。
 * 于是 TEXT、INTERPOLATION，以及被 transform 改写成 JS 节点的 `v-if` / `v-for`
 * **全部被丢掉**，而且不报错：
 *
 *   <div><span/>hello</div>                → hello 消失
 *   <div><span/>{{ msg }}</div>            → 插值消失
 *   <div><span/><p v-if="ok">A</p></div>   → v-if 整支消失（连 _ctx.ok 都不出现）
 *
 * 同一批还暴露出第二个问题：TEXT patchFlag 的判据是「children 里**存在**插值」，
 * 于是混排也会带上 TEXT ⇒ 运行时会用 `setElementText` 覆盖整个子节点数组。
 *
 * ## 判据
 *
 * 断言的是**执行产物后拿到的 VNode 树**：内容是否真的进了 children、结构指令是否
 * 真的产出分支/列表。缺陷的本质是「内容消失」，用哪个 helper 拼出来与判据无关。
 * 父节点若被整棵静态提升，模块级求值会引用 `_ctx` ⇒ 执行时直接 ReferenceError，
 * 因此「能执行且渲染出预期树」本身就覆盖了原先的「不得提升」断言。
 */

import { describe, it, expect } from 'vitest';
import { PatchFlags } from '@lytjs/common-vnode';
import { asVNode, asVNodeList, renderWith } from './support/execute';

function childrenOf(value: unknown): unknown[] {
  const node = asVNode(value);
  return Array.isArray(node.children) ? node.children : [node.children];
}

describe('混排子节点不被丢弃（P0 回归）', () => {
  it('静态元素 + 纯文本：文本保留为兄弟节点', () => {
    const kids = childrenOf(renderWith('<div><span/>hello</div>'));
    expect(kids).toHaveLength(2);
    expect(asVNode(kids[0]).type).toBe('span');
    expect(kids[1]).toBe('hello');
  });

  it('静态元素 + 插值：插值按上下文求值', () => {
    const kids = childrenOf(renderWith('<div><span/>{{ msg }}</div>', { msg: 'M' }));
    expect(kids).toHaveLength(2);
    expect(asVNode(kids[0]).type).toBe('span');
    expect(kids[1]).toBe('M');
  });

  it('静态元素 + 文本 + 插值：三者都在', () => {
    const kids = childrenOf(renderWith('<div><span/>hi {{ msg }}</div>', { msg: 'M' }));
    expect(kids).toHaveLength(3);
    expect(asVNode(kids[0]).type).toBe('span');
    expect(kids.slice(1)).toEqual(['hi ', 'M']);
  });

  it('v-if + 静态兄弟（v-if 在前）：两个分支都保留', () => {
    const shown = childrenOf(
      renderWith('<div><p v-if="ok">A</p><span>X</span></div>', { ok: true }),
    );
    expect(shown).toHaveLength(2);
    expect(asVNode(shown[0])).toMatchObject({ type: 'p', children: 'A' });
    expect(asVNode(shown[1])).toMatchObject({ type: 'span', children: 'X' });

    // 条件为假时只收起 v-if 分支，兄弟节点不受影响
    const hidden = childrenOf(
      renderWith('<div><p v-if="ok">A</p><span>X</span></div>', { ok: false }),
    );
    expect(hidden).toHaveLength(2);
    expect(hidden[0]).toBeNull();
    expect(asVNode(hidden[1])).toMatchObject({ type: 'span', children: 'X' });
  });

  it('v-if + 静态兄弟（v-if 在后）：两个分支都保留', () => {
    const kids = childrenOf(
      renderWith('<div><span>X</span><p v-if="ok">A</p></div>', { ok: true }),
    );
    expect(kids).toHaveLength(2);
    expect(asVNode(kids[0])).toMatchObject({ type: 'span', children: 'X' });
    expect(asVNode(kids[1])).toMatchObject({ type: 'p', children: 'A' });
  });

  it('v-for + 静态兄弟：列表与兄弟都在', () => {
    const kids = childrenOf(
      renderWith('<div><p v-for="i in list">{{ i }}</p><span>X</span></div>', {
        list: ['n1', 'n2'],
      }),
    );
    expect(kids).toHaveLength(2);
    const list = asVNodeList(kids[0]);
    expect(list.map((item) => item.children)).toEqual(['n1', 'n2']);
    expect(asVNode(kids[1])).toMatchObject({ type: 'span', children: 'X' });
  });

  it('v-if/v-else 链 + 静态兄弟：按条件选分支，兄弟保留', () => {
    const tpl = '<div><span>X</span><p v-if="ok">A</p><p v-else>B</p></div>';
    const truthy = childrenOf(renderWith(tpl, { ok: true }));
    expect(truthy).toHaveLength(2);
    expect(asVNode(truthy[0])).toMatchObject({ type: 'span', children: 'X' });
    expect(asVNode(truthy[1])).toMatchObject({ type: 'p', children: 'A' });

    const falsy = childrenOf(renderWith(tpl, { ok: false }));
    expect(falsy).toHaveLength(2);
    expect(asVNode(falsy[1])).toMatchObject({ type: 'p', children: 'B' });
  });

  it('动态属性父节点 + v-if 兄弟：属性与分支都在', () => {
    const node = asVNode(
      renderWith('<div :id="x"><p v-if="ok">A</p><span>X</span></div>', { x: 'id-1', ok: true }),
    );
    expect(node.props).toEqual({ id: 'id-1' });
    const kids = node.children as unknown[];
    expect(asVNode(kids[0])).toMatchObject({ type: 'p', children: 'A' });
    expect(asVNode(kids[1])).toMatchObject({ type: 'span', children: 'X' });
  });

  it('混排时不得带 TEXT patchFlag（否则运行时会 setElementText 覆盖数组）', () => {
    const node = asVNode(renderWith('<div><span/>{{ msg }}</div>', { msg: 'M' }));
    expect(node.patchFlag & PatchFlags.TEXT).toBe(0);
  });

  it('纯文本子节点仍应保留 TEXT patchFlag（性能优化不能被误伤）', () => {
    const node = asVNode(renderWith('<div>{{ msg }}</div>', { msg: 'M' }));
    expect(node.patchFlag & PatchFlags.TEXT).toBe(PatchFlags.TEXT);
  });

  it('纯空白文本不产生子节点（避免产物里出现一串空格常量）', () => {
    const kids = childrenOf(renderWith('<div>\n  <span/>\n</div>'));
    expect(kids).toHaveLength(1);
    expect(asVNode(kids[0]).type).toBe('span');
  });
});

// ⚠️ 2026-10-27 新增（P0 回归）：两个**结构指令**并列时整棵子树被丢弃
//
// 上一轮修的是「白名单过滤丢节点」；这一轮暴露出**同一处的第二个判据错**：
// `hasNonText` 写的是 `some(c => c.type === NodeTypes.ELEMENT)`，但
// `transformIf` / `transformFor` 在 `transformElement` **之前**执行，已经把带结构指令的
// 元素**替换成了 JS 节点**（v-for → JS_CALL_EXPRESSION(10)，v-if → JS_CONDITIONAL_EXPRESSION(15)）。
// 于是「两个 v-for 并列」时 children 里一个 ELEMENT 都没有 ⇒ 被误判成「纯文本」
// ⇒ 走文本拼接分支（只收 TEXT / INTERPOLATION）⇒ 全部丢弃。
//
// 注意「v-for + 普通元素」当时是**能用的**（恰好还有 ELEMENT 兜住判据）——
// 这种「一半能用」的形态最容易让人误判成「只是某个指令偶发」。
describe('结构指令并列（P0 回归）', () => {
  it('两个 v-for 并列都必须产出列表', () => {
    const kids = childrenOf(
      renderWith('<div><i v-for="i in a">{{ i }}</i><b v-for="j in b">{{ j }}</b></div>', {
        a: ['a1', 'a2'],
        b: ['b1'],
      }),
    );
    expect(kids).toHaveLength(2);
    expect(asVNodeList(kids[0]).map((item) => item.children)).toEqual(['a1', 'a2']);
    expect(asVNodeList(kids[1]).map((item) => item.children)).toEqual(['b1']);
  });

  it('两个 v-if 并列都必须产出条件分支', () => {
    const tpl = '<div><i v-if="a">A</i><b v-if="b">B</b></div>';
    const both = childrenOf(renderWith(tpl, { a: true, b: true }));
    expect(both.map((item) => asVNode(item).children)).toEqual(['A', 'B']);

    const onlyB = childrenOf(renderWith(tpl, { a: false, b: true }));
    expect(onlyB[0]).toBeNull();
    expect(asVNode(onlyB[1]).children).toBe('B');
  });

  it('v-for 与 v-if 并列都必须保留', () => {
    const kids = childrenOf(
      renderWith('<div><i v-for="i in a">{{ i }}</i><b v-if="b">B</b></div>', {
        a: ['a1'],
        b: true,
      }),
    );
    expect(kids).toHaveLength(2);
    expect(asVNodeList(kids[0]).map((item) => item.children)).toEqual(['a1']);
    expect(asVNode(kids[1]).children).toBe('B');
  });

  it('v-for + v-if 并列 + 普通元素三者混合', () => {
    const kids = childrenOf(
      renderWith('<div><span>s</span><i v-for="i in a">{{ i }}</i><b v-if="b">B</b></div>', {
        a: ['a1'],
        b: true,
      }),
    );
    expect(kids).toHaveLength(3);
    expect(asVNode(kids[0]).children).toBe('s');
    expect(asVNodeList(kids[1]).map((item) => item.children)).toEqual(['a1']);
    expect(asVNode(kids[2]).children).toBe('B');
  });

  it('纯文本 + 插值仍走拼接分支（不得因为改动而回归）', () => {
    expect(asVNode(renderWith('<div>a{{ x }}b</div>', { x: 'X' })).children).toBe('aXb');
  });
});
