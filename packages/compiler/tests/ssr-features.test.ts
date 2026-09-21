/**
 * SSR 编译特性测试
 *
 * 覆盖本轮修复前 SSR 明确不成立的三块：
 * 1. v-for 列表项此前被渲染成空串（VNODE_CALL 分支缺失 + toDisplayString 未处理）
 * 2. `<slot>` 此前被当成普通标签输出成 `<slot ...></slot>`（非法 HTML）
 * 3. 绑定表达式未前缀化，产物在 `function render(_ctx)` 里取不到值
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const ssr = (t: string) => compile(t, { ssrMode: true }).code;

describe('SSR 编译 - v-for', () => {
  it('应渲染列表项内容（而不是空串）', () => {
    const code = ssr('<ul><li v-for="x in xs">{{ x }}</li></ul>');
    expect(code).toContain('flatMap');
    expect(code).toContain("'<li'");
    expect(code).toContain('escapeHtml');
    // 别名不加前缀、列表表达式加前缀
    expect(code).toContain('_ctx.xs');
    expect(code).not.toMatch(/_ctx\.x\b(?!s)/);
  });

  it('不应出现未处理的调用占位符', () => {
    expect(ssr('<ul><li v-for="x in xs">{{ x }}</li></ul>')).not.toContain('[call]');
  });

  it('列表项内的静态属性应保留', () => {
    const code = ssr('<ul><li v-for="x in xs" class="row">{{ x }}</li></ul>');
    expect(code).toContain('class="');
  });
});

describe('SSR 编译 - <slot>', () => {
  it('具名插槽应生成 $slots 取值分支，而不是输出 <slot> 标签', () => {
    const code = ssr('<div><slot name="header"/></div>');
    expect(code).toContain('_ctx.$slots?.["header"]');
    expect(code).not.toContain("'<slot'");
  });

  it('默认插槽无内容时应回退为空串', () => {
    const code = ssr('<div><slot/></div>');
    expect(code).toContain('_ctx.$slots?.["default"]');
    expect(code).toContain(": ''");
  });

  it('插槽回退内容应被渲染', () => {
    const code = ssr('<div><slot>fallback</slot></div>');
    expect(code).toContain('"fallback"');
    expect(code).not.toContain("'<slot'");
  });
});

describe('SSR 编译 - 绑定与 nullish 安全', () => {
  it('插值应前缀化并对 nullish 输出空串', () => {
    const code = ssr('<div>{{ msg }}</div>');
    expect(code).toContain('_ctx.msg');
    expect(code).toContain("== null ? ''");
  });

  it('v-bind 应前缀化', () => {
    const code = ssr('<div :id="myId"></div>');
    expect(code).toContain('_ctx.myId');
  });

  it('v-if 条件应前缀化且分支内容保留', () => {
    const code = ssr('<div v-if="ok"><span>{{ msg }}</span></div>');
    expect(code).toContain('_ctx.ok');
    expect(code).toContain('_ctx.msg');
    expect(code).toContain("'<span'");
  });

  it('v-html / v-text 应前缀化', () => {
    const html = ssr('<div v-html="raw"></div>');
    expect(html).toContain('_ctx.raw');
    const text = ssr('<div v-text="label"></div>');
    expect(text).toContain('_ctx.label');
  });
});
