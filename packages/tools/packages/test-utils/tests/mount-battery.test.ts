// @vitest-environment jsdom
/**
 * `@lytjs/test-utils` 的挂载层判据。
 *
 * ⚠️ 为什么单独建文件：既有 `tests/index.test.ts` 跑在 **node** 环境（无 DOM），
 *    挂载相关的 162 条语句（`createDOMEnvironment` / `createContainer` / `mount` /
 *    `mountAsync` / `mockComponent` / `spyOn` / `assertEmits` / cleanup 系列）
 *   在那套环境里**一条都执行不到** ⇒ 覆盖率 40% 的缺口全部集中在这里。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h, inject } from '@lytjs/core';
import {
  mount,
  mountAsync,
  mountWithCleanup,
  createContainer,
  createDOMEnvironment,
  mockComponent,
  spyOn,
  assertEmits,
  isReactive,
  registerCleanup,
  runCleanup,
  flushPromises,
} from '../src';
import type { Wrapper } from '../src';

/** 一个渲染 `.root-el` 并回显 props 的组件 */
function makeComp(onSetup?: (props: Record<string, unknown>) => void) {
  return {
    props: { title: { type: String }, n: { type: Number } },
    setup(props: Record<string, unknown>) {
      onSetup?.(props);
      return () =>
        h('div', { class: 'root-el' }, `title=${String(props.title)};n=${String(props.n)}`);
    },
  };
}

let wrappers: Wrapper[] = [];

beforeEach(() => {
  wrappers = [];
  if (typeof document !== 'undefined') document.body.innerHTML = '';
});

afterEach(() => {
  for (const w of wrappers) {
    try {
      w.unmount();
    } catch {
      /* 用例内已卸载 */
    }
  }
  if (typeof document !== 'undefined') document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('DOM 环境工具', () => {
  it('createDOMEnvironment 在浏览器环境返回 document 本身', () => {
    expect(createDOMEnvironment()).toBe(document);
  });

  it('createDOMEnvironment 在没有 document 时给出可操作的错误', () => {
    // ⚠️ 不能用 `vi.stubGlobal('document', undefined)`：jsdom 的 `document` 是 global 上的
    //    访问器，stub 之后 `vi.unstubAllGlobals()` 恢复不回来（后续用例的
    //    `document.body` 全是 undefined）⇒ 手工保存/恢复。
    const realDocument = globalThis.document;
    (globalThis as { document?: Document }).document = undefined;

    try {
      expect(() => createDOMEnvironment()).toThrow(/DOM environment not available/);
    } finally {
      (globalThis as { document?: Document }).document = realDocument;
    }
  });

  it('createContainer 返回 id 为 test-container 的 div，且不自动入文档', () => {
    const el = createContainer();

    expect(el.tagName).toBe('DIV');
    expect(el.id).toBe('test-container');
    expect(document.body.contains(el)).toBe(false);
  });
});

describe('mount：挂载与 DOM', () => {
  it('★ await 之后 DOM 已经渲染好（core 的 app.mount 是 async，此前返回的是 Promise）', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    // 修复前：`mount()` 把 `app.mount()` 返回的 **Promise** 当成实例存进 `vm`，
    // DOM 要等一个宏任务才出现 ⇒ 下面这条同步断言必然拿到空串。
    expect(w.text()).toBe('title=undefined;n=undefined');
    expect(w.html()).toContain('root-el');
  });

  it('★ wrapper.root 是组件根元素，不是 test-container', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    // 修复前 root 在 mount 当刻就 `targetEl.firstElementChild || targetEl` 取定，
    // 而那时还没渲染 ⇒ 恒等于容器（id=test-container）。
    expect(w.root.className).toBe('root-el');
    expect(w.root.id).not.toBe('test-container');
  });

  it('★ 默认挂载会入文档：document 级查询与 contains 都成立', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    // 修复前容器从不 append ⇒ `document.body.contains` 为 false，
    // 依赖 `document.querySelector` / 焦点 / document 级监听的组件测不了。
    expect(document.body.contains(w.root)).toBe(true);
    expect(document.querySelector('.root-el')).toBe(w.root);
  });

  it('find / findAll 按选择器取节点', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    expect(w.find('.root-el')).toBe(w.root);
    expect(w.findAll('div')).toHaveLength(1);
    expect(w.find('.nope')).toBeNull();
    expect(w.findAll('.nope')).toEqual([]);
  });

  it('unmount 清空 DOM 并把容器移出文档', async () => {
    const w = await mount(makeComp());
    const root = w.root;

    w.unmount();

    expect(root.isConnected).toBe(false);
    expect(document.querySelector('.root-el')).toBeNull();
  });

  it('text / html 反映渲染结果', async () => {
    const w = await mount(makeComp(), { props: { title: 'hi', n: 2 } });
    wrappers.push(w);

    expect(w.text()).toBe('title=hi;n=2');
    expect(w.html()).toBe('<div class="root-el">title=hi;n=2</div>');
  });
});

describe('mount：props', () => {
  it('★ options.props 真的传给了组件（此前一个都没传）', async () => {
    let seen: Record<string, unknown> = {};
    const w = await mount(
      makeComp((p) => (seen = p)),
      { props: { title: 'Hello', n: 1 } },
    );
    wrappers.push(w);

    // 修复前 `createApp(component)` 只传了一个参数 ⇒ 组件里 props 全是 undefined，
    // 而 `wrapper.props()` 却返回 `{title:'Hello'}` —— 看起来对，实则骗人。
    expect(seen.title).toBe('Hello');
    expect(seen.n).toBe(1);
    expect(w.text()).toBe('title=Hello;n=1');
  });

  it('wrapper.props() 返回组件的真实 props', async () => {
    const w = await mount(makeComp(), { props: { title: 'A' } });
    wrappers.push(w);

    expect(w.props()).toEqual({ title: 'A' });
  });

  it('★ setProps 真的更新视图与 props（此前只改本地对象，什么都不发生）', async () => {
    const w = await mount(makeComp(), { props: { title: 'A', n: 1 } });
    wrappers.push(w);

    await w.setProps({ title: 'B' });

    expect(w.props().title).toBe('B');
    expect(w.text()).toBe('title=B;n=1');
  });

  it('★ 两个「未声明 props」的实例各自持有独立的 props 对象（不共享冻结的 EMPTY_OBJ）', async () => {
    const NoProps = { setup: () => () => h('div', null, 'x') };

    const a = await mount(NoProps);
    const b = await mount(NoProps);
    wrappers.push(a, b);

    const pa = (a.vm as unknown as { $props: Record<string, unknown> }).$props;
    const pb = (b.vm as unknown as { $props: Record<string, unknown> }).$props;

    // 修复前：`initProps` 的浅比较直接 return，`instance.props` 停在共享的 `EMPTY_OBJ`
    // （被冻结）⇒ 两个实例同一个对象，且**任何原地写入都抛 TypeError**。
    expect(pa).not.toBe(pb);
    expect(Object.isExtensible(pa)).toBe(true);
  });

  it('setProps 只覆盖传入的键', async () => {
    const w = await mount(makeComp(), { props: { title: 'A', n: 1 } });
    wrappers.push(w);

    await w.setProps({ n: 9 });

    expect(w.props()).toEqual({ title: 'A', n: 9 });
  });
});

describe('mount：attachTo 与 global', () => {
  it('attachTo 传元素：挂到该元素内', async () => {
    const host = document.createElement('section');
    document.body.appendChild(host);

    const w = await mount(makeComp(), { attachTo: host });
    wrappers.push(w);

    expect(w.root.parentElement).toBe(host);
    expect(host.querySelector('.root-el')).toBe(w.root);
  });

  it('attachTo 传选择器：找到并挂载', async () => {
    document.body.innerHTML = '<div id="host"></div>';

    const w = await mount(makeComp(), { attachTo: '#host' });
    wrappers.push(w);

    expect(document.querySelector('#host')!.contains(w.root)).toBe(true);
  });

  it('attachTo 选择器不存在时抛错并带上选择器', async () => {
    await expect(mount(makeComp(), { attachTo: '#missing' })).rejects.toThrow(
      /Element not found: #missing/,
    );
  });

  it('attachTo 时不再额外创建 test-container', async () => {
    const host = document.createElement('section');
    document.body.appendChild(host);

    const w = await mount(makeComp(), { attachTo: host });
    wrappers.push(w);

    expect(document.querySelector('#test-container')).toBeNull();
  });

  it('global.plugins 支持函数形式与 install 对象形式', async () => {
    const seen: string[] = [];
    const fnPlugin = (app: { mount?: unknown }) => {
      seen.push(typeof app.mount === 'function' ? 'fn' : 'fn-bad');
    };
    const objPlugin = {
      install(app: { mount?: unknown }) {
        seen.push(typeof app.mount === 'function' ? 'obj' : 'obj-bad');
      },
    };

    const w = await mount(makeComp(), { global: { plugins: [fnPlugin, objPlugin] } });
    wrappers.push(w);

    expect(seen).toEqual(['fn', 'obj']);
  });

  it('global.provide 能在根组件里被 inject 到', async () => {
    // ⚠️ `inject()` 必须在 setup 里调用：渲染阶段没有「当前实例」⇒ 只会拿到 undefined。
    const Child = {
      setup() {
        const theme = inject('theme');
        return () => h('div', { class: 'child' }, String(theme));
      },
    };

    const w = await mount(Child, { global: { provide: { theme: 'dark' } } });
    wrappers.push(w);

    expect(w.text()).toBe('dark');
  });
});

describe('mountAsync', () => {
  it('与 mount 等价（返回已就绪的 wrapper）', async () => {
    const w = await mountAsync(makeComp(), { props: { title: 'X' } });
    wrappers.push(w);

    expect(w.text()).toBe('title=X;n=undefined');
  });
});

describe('mockComponent', () => {
  it('返回可挂载的组件定义并保留 name', async () => {
    const Stub = mockComponent('MyStub', {
      render: () => h('span', { class: 'stub' }, 'stub'),
    });

    expect((Stub as { name?: string }).name).toBe('MyStub');

    const w = await mount(Stub);
    wrappers.push(w);

    expect(w.find('.stub')).not.toBeNull();
  });
});

describe('spyOn', () => {
  it('替换方法、记录调用，并能还原', () => {
    const obj = { greet: (name: string) => `hi ${name}` };

    const spy = spyOn(obj, 'greet', ((n: string) => `mocked ${n}`) as never);
    expect(obj.greet('a')).toBe('mocked a');
    expect(spy.calls).toEqual([['a']]);

    spy.mockRestore();
    expect(obj.greet('a')).toBe('hi a');
  });

  it('★ 不传实现时仍然调用原方法（"spy" 不该破坏行为）', () => {
    const obj = { add: (a: number, b: number) => a + b };

    // 修复前：`mockFn(undefined)` ⇒ 被 spy 的方法恒返回 undefined，
    // 业务代码里的调用点会莫名其妙拿到 undefined。
    const spy = spyOn(obj, 'add');

    expect(obj.add(1, 2)).toBe(3);
    expect(spy.calls).toHaveLength(1);
  });

  it('mockReturnValue 能覆盖返回值，mockRestore 之后恢复', () => {
    const obj = { f: () => 1 };
    const spy = spyOn(obj, 'f');

    spy.mockReturnValue(42);
    expect(obj.f()).toBe(42);

    spy.mockRestore();
    expect(obj.f()).toBe(1);
  });
});

describe('assertEmits', () => {
  it('捕获 emit 的参数（单参直接给值）', async () => {
    const Child = {
      emits: ['change'],
      setup(_p: unknown, ctx: { emit: (e: string, ...a: unknown[]) => void }) {
        return () => h('button', { class: 'btn', onClick: () => ctx.emit('change', 'v1') }, 'go');
      },
    };

    const w = await mount(Child);
    wrappers.push(w);

    const emitted = await assertEmits(w, 'change', () => {
      w.trigger('.btn', 'click');
    });

    expect(emitted).toEqual(['v1']);
  });

  it('多参 emit 收成数组', async () => {
    const Child = {
      emits: ['pair'],
      setup(_p: unknown, ctx: { emit: (e: string, ...a: unknown[]) => void }) {
        return () => h('div', { class: 'd', onClick: () => ctx.emit('pair', 1, 2) }, 'x');
      },
    };

    const w = await mount(Child);
    wrappers.push(w);

    const emitted = await assertEmits(w, 'pair', () => w.trigger('.d', 'click'));

    expect(emitted).toEqual([[1, 2]]);
  });

  it('★ 异步 emit 也能在 timeout 内被等到', async () => {
    const Child = {
      emits: ['later'],
      setup(_p: unknown, ctx: { emit: (e: string, ...a: unknown[]) => void }) {
        return () =>
          h(
            'div',
            {
              class: 'd',
              onClick: () => setTimeout(() => ctx.emit('later', 'ok'), 20),
            },
            'x',
          );
      },
    };

    const w = await mount(Child);
    wrappers.push(w);

    // 修复前只 `flushPromises()` 一次（约 0ms）⇒ 20ms 后才 emit 的事件永远等不到，
    // 而 `timeout` 参数只被用进错误文案，**没有任何等待语义**。
    const emitted = await assertEmits(w, 'later', () => w.trigger('.d', 'click'), 500);

    expect(emitted).toEqual(['ok']);
  });

  it('未 emit 时抛错并带上事件名', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    await expect(assertEmits(w, 'never', () => {})).rejects.toThrow(
      /Event "never" was not emitted/,
    );
  });

  it('★ 即使断言失败，$emit 也要还原（不能把组件留在被劫持状态）', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    const before = (w.vm as unknown as { $emit: unknown }).$emit;

    await expect(assertEmits(w, 'never', () => {})).rejects.toThrow();

    expect((w.vm as unknown as { $emit: unknown }).$emit).toBe(before);
  });
});

describe('isReactive', () => {
  it('signal / ref 判定为真，普通值为假', async () => {
    const { signal, ref, reactive } = await import('@lytjs/reactivity');

    expect(isReactive(signal(1))).toBe(true);
    expect(isReactive(ref(1))).toBe(true);
    expect(isReactive(reactive({ a: 1 }))).toBe(true);

    expect(isReactive(1)).toBe(false);
    expect(isReactive({ a: 1 })).toBe(false);
    expect(isReactive(null)).toBe(false);
  });
});

describe('cleanup', () => {
  it('runCleanup 执行全部回调并清空', () => {
    const order: number[] = [];
    registerCleanup(() => order.push(1));
    registerCleanup(() => order.push(2));

    runCleanup();
    expect(order).toEqual([1, 2]);

    runCleanup();
    expect(order).toEqual([1, 2]);
  });

  it('某个回调抛错不影响其它回调', () => {
    const order: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    registerCleanup(() => order.push('a'));
    registerCleanup(() => {
      throw new Error('boom');
    });
    registerCleanup(() => order.push('b'));

    expect(() => runCleanup()).not.toThrow();
    expect(order).toEqual(['a', 'b']);
    expect(err).toHaveBeenCalled();
  });

  it('★ 清理期间新注册的回调留到下一次，而不是被静默丢弃', () => {
    const order: string[] = [];

    registerCleanup(() => {
      order.push('first');
      registerCleanup(() => order.push('nested'));
    });

    runCleanup();
    expect(order).toEqual(['first']);

    // 修复前：循环结束后 `cleanupCallbacks = []` ⇒ 嵌套注册的回调**永久丢失**。
    runCleanup();
    expect(order).toEqual(['first', 'nested']);
  });

  it('mountWithCleanup 在 runCleanup 时卸载组件', async () => {
    const w = await mountWithCleanup(makeComp());
    const root = w.root;

    expect(document.body.contains(root)).toBe(true);

    runCleanup();

    expect(document.body.contains(root)).toBe(false);
  });

  it('mountWithCleanup 的返回值可直接使用（无需再 push 到 wrappers）', async () => {
    const w = await mountWithCleanup(makeComp(), { props: { title: 'Z' } });

    expect(w.text()).toBe('title=Z;n=undefined');
    runCleanup();
  });
});

describe('trigger 的边界', () => {
  it('选择器不存在时抛错并带上选择器', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    expect(() => w.trigger('.missing', 'click')).toThrow(/Element not found: \.missing/);
  });

  it('detail 透传到事件对象，且事件会冒泡', async () => {
    const w = await mount(makeComp());
    wrappers.push(w);

    let seen: unknown;
    let bubbled = false;
    document.body.addEventListener('custom-x', (e) => {
      bubbled = true;
      seen = (e as CustomEvent).detail;
    });

    w.trigger('.root-el', 'custom-x', { id: 7 });

    expect(bubbled).toBe(true);
    expect(seen).toEqual({ id: 7 });

    await flushPromises();
  });
});
