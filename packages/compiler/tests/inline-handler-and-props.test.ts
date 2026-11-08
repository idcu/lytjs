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
 *
 * 判据：执行产物后**模拟事件**，断言渲染期无副作用、事件期副作用正确。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { asVNode, execute, type RenderedVNode } from './support/execute';

type Props = Record<string, unknown>;

const mount = (template: string, ctx: Record<string, unknown> = {}): RenderedVNode =>
  asVNode(execute(compile(template))(ctx));

const propsOf = (node: RenderedVNode): Props => (node.props ?? {}) as Props;

describe('v-on 内联表达式', () => {
  it('语句（n++）必须包成事件处理器，不能在渲染期求值', () => {
    const ctx = { n: 0 };
    const props = propsOf(mount('<button @click="n++">x</button>', ctx));
    expect(ctx.n).toBe(0);
    expect(typeof props.onClick).toBe('function');
    (props.onClick as () => void)();
    expect(ctx.n).toBe(1);
  });

  it('调用表达式（foo($event)）必须包起来，且 $event 不被前缀化', () => {
    const calls: unknown[] = [];
    const ctx = {
      foo: (event: unknown) => calls.push(event),
    };
    const props = propsOf(mount('<input @input="foo($event)">', ctx));
    expect(calls).toHaveLength(0);
    const event = { target: { value: 'v' } };
    (props.onInput as (e: unknown) => void)(event);
    expect(calls).toEqual([event]);
  });

  it('赋值表达式（x = $event.target.value）必须包起来', () => {
    const ctx: Record<string, unknown> = { x: '' };
    const props = propsOf(mount('<input @input="x = $event.target.value">', ctx));
    expect(ctx.x).toBe('');
    (props.onInput as (e: unknown) => void)({ target: { value: 'typed' } });
    expect(ctx.x).toBe('typed');
  });

  it('函数引用（foo）保持引用，不再包一层', () => {
    const foo = () => undefined;
    const props = propsOf(mount('<button @click="foo">x</button>', { foo }));
    expect(props.onClick).toBe(foo);
  });

  it('函数表达式（() => n++）原样保留', () => {
    const ctx = { n: 0 };
    const props = propsOf(mount('<button @click="() => n++">x</button>', ctx));
    expect(ctx.n).toBe(0);
    (props.onClick as () => void)();
    expect(ctx.n).toBe(1);
  });
});

describe('组件标签上的属性名', () => {
  it('组件上的 text 是 prop，不是 v-text', () => {
    const props = propsOf(mount('<Inner text="S" />', { Inner: 'Inner' }));
    expect(props.text).toBe('S');
    expect(props).not.toHaveProperty('textContent');
  });

  it('组件上的 model 是 prop，不是 v-model', () => {
    const props = propsOf(mount('<Inner model="m" />', { Inner: 'Inner' }));
    expect(props.model).toBe('m');
  });

  it('原生元素上的 text 仍然是 v-text（裸指令名对原生元素保留）', () => {
    const props = propsOf(mount('<div text="x"></div>', { x: 'x' }));
    expect(props.textContent).toBe('x');
  });

  it('attr- 转义前缀在组件上仍可用', () => {
    const props = propsOf(mount('<Inner attr-text="x" />', { Inner: 'Inner' }));
    expect(props.text).toBe('x');
  });
});

describe('动态组件 <component :is>', () => {
  it('字符串形式必须走 resolveDynamicComponent（查注册表），不能只查 ctx', () => {
    // ctx 里放一个同名诱饵：旧实现 `_ctx[which] || which` 会取到它。
    const node = mount('<component :is="which" />', { which: 'Foo', Foo: 'ctx-decoy' });
    expect(node.type).toBe('Foo');
  });

  it('静态 is="A" 也走 resolveDynamicComponent（与 :is 同口径）', () => {
    expect(mount('<component is="A" />').type).toBe('A');
  });
});
