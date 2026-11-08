/**
 * SSR 编译特性测试：执行 ssrMode 产物，断言渲染出的 HTML
 *
 * 覆盖本轮修复前 SSR 明确不成立的三块：
 * 1. v-for 列表项此前被渲染成空串（VNODE_CALL 分支缺失 + toDisplayString 未处理）
 * 2. `<slot>` 此前被当成普通标签输出成 `<slot ...></slot>`（非法 HTML）
 * 3. 绑定表达式未前缀化，产物在 `function render(_ctx)` 里取不到值
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { executeSsr } from './support/execute';

const ssr = (t: string) => executeSsr(compile(t, { ssrMode: true }));

describe('SSR 编译 - v-for', () => {
  it('应渲染列表项内容（而不是空串）', () => {
    const render = ssr('<ul><li v-for="x in xs">{{ x }}</li></ul>');
    // 别名 `x` 若被前缀成 _ctx.x，输出会是空串
    expect(render({ xs: ['a', 'b'] })).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('不应出现未处理的调用占位符', () => {
    // 精确锁定输出：若占位符 `[call]` 泄漏，整串必然不等
    expect(ssr('<ul><li v-for="x in xs">{{ x }}</li></ul>')({ xs: ['a'] })).toBe(
      '<ul><li>a</li></ul>',
    );
  });

  it('列表项内的静态属性应保留', () => {
    expect(ssr('<ul><li v-for="x in xs" class="row">{{ x }}</li></ul>')({ xs: ['a'] })).toBe(
      '<ul><li class="row">a</li></ul>',
    );
  });
});

describe('SSR 编译 - <slot>', () => {
  it('具名插槽应取 $slots，而不是输出 <slot> 标签', () => {
    const render = ssr('<div><slot name="header"/></div>');
    expect(render({ $slots: { header: () => '<h1>H</h1>' } })).toBe('<div><h1>H</h1></div>');
    // 没有对应插槽时不残留 <slot> 标签
    expect(render({})).toBe('<div></div>');
  });

  it('默认插槽无内容时应回退为空串', () => {
    expect(ssr('<div><slot/></div>')({})).toBe('<div></div>');
  });

  it('插槽回退内容应被渲染', () => {
    const render = ssr('<div><slot>fallback</slot></div>');
    expect(render({})).toBe('<div>fallback</div>');
    expect(render({ $slots: { default: () => 'override' } })).toBe('<div>override</div>');
  });
});

describe('SSR 编译 - 绑定与 nullish 安全', () => {
  it('插值应前缀化并对 nullish 输出空串', () => {
    const render = ssr('<div>{{ msg }}</div>');
    expect(render({ msg: 'M' })).toBe('<div>M</div>');
    expect(render({})).toBe('<div></div>');
    expect(render({ msg: null })).toBe('<div></div>');
  });

  it('v-bind 应前缀化', () => {
    expect(ssr('<div :id="myId"></div>')({ myId: 'x' })).toBe('<div id="x"></div>');
  });

  it('v-if 条件应前缀化且分支内容保留', () => {
    const render = ssr('<div v-if="ok"><span>{{ msg }}</span></div>');
    expect(render({ ok: true, msg: 'M' })).toBe('<div><span>M</span></div>');
    expect(render({ ok: false, msg: 'M' })).toBe('');
  });

  it('v-html / v-text 应前缀化', () => {
    expect(ssr('<div v-html="raw"></div>')({ raw: '<b>x</b>' })).toBe('<div><b>x</b></div>');
    expect(ssr('<div v-text="label"></div>')({ label: 'L' })).toBe('<div>L</div>');
  });
});
