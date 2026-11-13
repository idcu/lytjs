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

describe('SSR 编译 - 组件插槽', () => {
  it('<template #default> 应作为默认插槽，而不是输出字面量 <template> 标签', () => {
    const render = executeSsr(
      compile('<Comp><template v-slot><span>hi</span></template></Comp>', { ssrMode: true }),
      {
        renderComponentVNode: (
          _comp: unknown,
          _props: unknown,
          slots: Record<string, () => string> | null,
        ) => (slots?.default ? slots.default() : ''),
      },
    );
    expect(render({})).toBe('<span>hi</span>');
  });
});

describe('SSR 编译 - 插值表达式', () => {
  it('接受解析器已接受的二元/三元/调用表达式，与 vnode 路径一致', () => {
    const render = ssr('<div>{{ a + 1 }}-{{ ok ? "A" : "B" }}-{{ fmt(x) }}</div>');
    expect(render({ a: 1, ok: true, x: 'z', fmt: (v: string) => v.toUpperCase() })).toBe(
      '<div>2-A-Z</div>',
    );
  });
});

describe('SSR 编译 - template v-for 的 Fragment 不应被当标签输出', () => {
  it('只输出子节点，不输出占位符标签', () => {
    const render = ssr(
      '<div><template v-for="x in list" :key="x"><span>{{x}}</span></template></div>',
    );
    const html = render({ list: ['a', 'b'] });
    expect(html).not.toContain('__LYTJS_FRAGMENT__');
    expect(html).toBe('<div><span>a</span><span>b</span></div>');
  });

  it('列表项内的 v-if 假分支也不保留占位标签', () => {
    const render = ssr(
      '<div><template v-for="it in list" :key="it.id"><span v-if="it.show">{{it.name}}</span></template></div>',
    );
    const html = render({
      list: [
        { id: 1, show: true, name: 'a' },
        { id: 2, show: false, name: 'b' },
        { id: 3, show: true, name: 'c' },
      ],
    });
    expect(html).not.toContain('__LYTJS_FRAGMENT__');
    expect(html).toBe('<div><span>a</span><span>c</span></div>');
  });

  it('<template v-if> 命中时只输出内容', () => {
    const render = ssr('<div><template v-if="ok"><span>{{msg}}</span></template></div>');
    const html = render({ ok: true, msg: 'M' });
    expect(html).not.toContain('__LYTJS_FRAGMENT__');
    expect(html).toBe('<div><span>M</span></div>');
  });
});

describe('SSR 编译 - v-model 初态', () => {
  it('文本输入输出 value', () => {
    expect(ssr('<input v-model="msg">')({ msg: 'M' })).toBe('<input value="M">');
  });

  it('checkbox 输出 checked（布尔与数组两种形态）', () => {
    expect(ssr('<input type="checkbox" v-model="ok">')({ ok: true })).toBe(
      '<input type="checkbox" checked="checked">',
    );
    const render = ssr('<input type="checkbox" value="a" v-model="picked">');
    expect(render({ picked: ['a', 'b'] })).toBe(
      '<input type="checkbox" value="a" checked="checked">',
    );
    expect(render({ picked: [] })).toBe('<input type="checkbox" value="a">');
  });

  it('radio 仅当值与 v-model 相等时输出 checked', () => {
    const render = ssr('<input type="radio" value="a" v-model="pick">');
    expect(render({ pick: 'a' })).toBe('<input type="radio" value="a" checked="checked">');
    expect(render({ pick: 'b' })).toBe('<input type="radio" value="a">');
  });

  it('select 把 selected 落到匹配的 option 上，而不是给 select 加 value', () => {
    const render = ssr(
      '<select v-model="pick"><option value="a">A</option><option value="b">B</option></select>',
    );
    expect(render({ pick: 'b' })).toBe(
      '<select><option value="a">A</option><option value="b" selected="selected">B</option></select>',
    );
  });

  it('textarea 用子节点承载初值，不输出非法 value 属性', () => {
    expect(ssr('<textarea v-model="msg"></textarea>')({ msg: 'hi' })).toBe(
      '<textarea>hi</textarea>',
    );
  });

  it('组件 v-model 输出 modelValue prop', () => {
    const seen: Record<string, unknown>[] = [];
    const render = executeSsr(compile('<Comp v-model="msg" />', { ssrMode: true }), {
      renderComponentVNode: (_comp: unknown, props: Record<string, unknown>) => {
        seen.push(props);
        return '';
      },
    });
    render({ msg: 'M' });
    expect(seen[0]).toMatchObject({ modelValue: 'M' });
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
