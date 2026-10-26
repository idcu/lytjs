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
 * 这里断言的是「**内容必须出现在产物里**」，而不是某个具体 helper 的调用形状 ——
 * 因为缺陷的本质就是「内容消失」，与用 `createElementVNode` 还是 `createVNode` 无关。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

interface Case {
  name: string;
  template: string;
  /** 产物里**必须**出现的片段（缺一即判定为丢节点） */
  mustContain: string[];
  /** 产物里**不得**出现的片段 */
  mustNotContain?: string[];
}

const CASES: Case[] = [
  {
    name: '静态元素 + 纯文本',
    template: '<div><span/>hello</div>',
    mustContain: ['"hello"'],
  },
  {
    name: '静态元素 + 插值',
    template: '<div><span/>{{ msg }}</div>',
    mustContain: ['toDisplayString(_ctx.msg)'],
  },
  {
    name: '静态元素 + 文本 + 插值',
    template: '<div><span/>hi {{ msg }}</div>',
    mustContain: ['"hi "', 'toDisplayString(_ctx.msg)'],
  },
  {
    name: 'v-if + 静态兄弟（v-if 在前）',
    template: '<div><p v-if="ok">A</p><span>X</span></div>',
    mustContain: ['_ctx.ok', '"A"'],
    // 父节点不得被整棵静态提升（提升即意味着动态分支被吞）
    mustNotContain: ['const _hoisted_1 = createElementVNode("div"'],
  },
  {
    name: 'v-if + 静态兄弟（v-if 在后）',
    template: '<div><span>X</span><p v-if="ok">A</p></div>',
    mustContain: ['_ctx.ok', '"A"'],
  },
  {
    name: 'v-for + 静态兄弟',
    template: '<div><p v-for="i in list">{{ i }}</p><span>X</span></div>',
    mustContain: ['renderList(_ctx.list', 'toDisplayString(i)'],
  },
  {
    name: 'v-if/v-else 链 + 静态兄弟',
    template: '<div><span>X</span><p v-if="ok">A</p><p v-else>B</p></div>',
    mustContain: ['_ctx.ok', '"A"', '"B"'],
  },
  {
    name: '动态属性父节点 + v-if 兄弟（父节点本就不会被提升）',
    template: '<div :id="x"><p v-if="ok">A</p><span>X</span></div>',
    mustContain: ['_ctx.ok', '"A"', '_ctx.x'],
  },
];

describe('混排子节点不被丢弃（P0 回归）', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const { code } = compile(c.template);
      for (const frag of c.mustContain) {
        expect(code, `产物缺少 ${frag}\n---\n${code}`).toContain(frag);
      }
      for (const frag of c.mustNotContain ?? []) {
        expect(code, `产物不应包含 ${frag}\n---\n${code}`).not.toContain(frag);
      }
    });
  }

  it('混排时不得带 TEXT patchFlag（否则运行时会 setElementText 覆盖数组）', () => {
    const { code } = compile('<div><span/>{{ msg }}</div>');
    // TEXT = 1；产物注释形如 `, 1 /* TEXT */`
    expect(code).not.toMatch(/,\s*1\s*\/\* TEXT \*\//);
  });

  it('纯文本子节点仍应保留 TEXT patchFlag（性能优化不能被误伤）', () => {
    const { code } = compile('<div>{{ msg }}</div>');
    expect(code).toMatch(/,\s*1\s*\/\* TEXT \*\//);
  });

  it('纯空白文本不产生子节点（避免产物里出现一串空格常量）', () => {
    const { code } = compile('<div>\n  <span/>\n</div>');
    expect(code).not.toContain('"\\n  "');
  });
});
