/**
 * 内联事件处理器 + 组件标签上的裸属性名（2026-11-01 新增）
 *
 * 两条都是「最常见的写法」，此前都是静默错的：
 *
 * 1. `@click="n++"` 被编译成 `onClick: _ctx.n++` —— **渲染期**就自增，点击反而没反应；
 *    `@input="foo($event)"` 变成 `onInput: _ctx.foo(_ctx.$event)` —— 渲染期调用 + `$event` 恒 undefined。
 *
 * 2. `<Inner text="S" />` 被"裸指令名"识别成 `v-text` ⇒ 产物 `{ textContent: _ctx.S }`，
 *    组件的 `text` prop 永远收不到值（而 `:text="v"` 正常，于是「一半能用」）。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const gen = (t: string): string => compile(t, { mode: 'module' }).code;
const handler = (t: string): string =>
  gen(t)
    .split('\n')
    .find((l) => l.includes('onClick') || l.includes('onInput')) ?? '';

describe('v-on 内联表达式', () => {
  it('语句（n++）必须包成事件处理器，不能在渲染期求值', () => {
    const line = handler('<button @click="n++">x</button>');
    expect(line).toContain('$event => (_ctx.n++)');
    expect(line).not.toMatch(/onClick":\s*_ctx\.n\+\+/);
  });

  it('调用表达式（foo($event)）必须包起来，且 $event 不被前缀化', () => {
    const line = handler('<input @input="foo($event)">');
    expect(line).toContain('$event => (_ctx.foo($event))');
    expect(line).not.toContain('_ctx.$event');
  });

  it('赋值表达式（x = $event.target.value）必须包起来', () => {
    const line = handler('<input @input="x = $event.target.value">');
    expect(line).toContain('$event => (_ctx.x = $event.target.value)');
  });

  it('函数引用（foo）保持引用，不再包一层', () => {
    const line = handler('<button @click="foo">x</button>');
    expect(line).toContain('"onClick": _ctx.foo');
    expect(line).not.toContain('$event =>');
  });

  it('函数表达式（() => n++）原样保留', () => {
    const line = handler('<button @click="() => n++">x</button>');
    expect(line).toContain('() => _ctx.n++');
  });
});

describe('组件标签上的属性名', () => {
  it('组件上的 text 是 prop，不是 v-text', () => {
    const code = gen('<Inner text="S" />');
    expect(code).toContain('"text": "S"');
    expect(code).not.toContain('textContent');
  });

  it('组件上的 model 是 prop，不是 v-model', () => {
    const code = gen('<Inner model="m" />');
    expect(code).toContain('"model": "m"');
  });

  it('原生元素上的 text 仍然是 v-text（裸指令名对原生元素保留）', () => {
    expect(gen('<div text="x"></div>')).toContain('textContent');
  });

  it('attr- 转义前缀在组件上仍可用', () => {
    expect(gen('<Inner attr-text="x" />')).toContain('"text": "x"');
  });
});

describe('动态组件 <component :is>', () => {
  it('字符串形式必须走 resolveDynamicComponent（查注册表），不能只查 ctx', () => {
    const code = gen('<component :is="which" />');
    expect(code).toContain('resolveDynamicComponent(_ctx.which)');
    // 旧产物：`_ctx[_ctx.which] || _ctx.which` —— 只查 ctx，组件名查不到就退化成原生标签
    expect(code).not.toContain('_ctx[_ctx.which]');
  });

  it('helper 必须出现在 preamble 的 import 里', () => {
    const out = compile('<component :is="which" />', { mode: 'module' });
    expect(out.preamble ?? '').toContain('resolveDynamicComponent');
  });

  it('静态 is="A" 也走 resolveDynamicComponent（与 :is 同口径）', () => {
    const code = gen('<component is="A" />');
    expect(code).toContain('resolveDynamicComponent("A")');
  });
});
