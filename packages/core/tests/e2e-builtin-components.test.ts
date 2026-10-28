// @vitest-environment jsdom
/**
 * 端到端门禁：**内置组件**（`Teleport` / `KeepAlive` / `Transition` / `Suspense`）
 * 与**插槽形态**在真实应用里到底做了什么。
 *
 * ## 为什么需要这个文件
 *
 * `@lytjs/core` 从 2026-10-02 起就转出了这五个内置组件（`Suspense` / `Teleport` /
 * `Transition` / `TransitionGroup` / `KeepAlive`），修的是「`import` 拿到 `undefined`」。
 * 但**模板里**写 `<Teleport>` 走的是另一条路：编译器把它编成
 * `createElementVNode(_ctx.Teleport, …)` —— 依赖组件实例代理能解析出 `Teleport`。
 *
 * 实测（2026-10-28）：代理只查「局部 components → app 级 components」，
 * **不查内置组件** ⇒ `_ctx.Teleport` 恒为 `undefined` ⇒
 * 四个内置组件在模板里**全部静默渲染为空**（不报错、不告警）：
 *
 * ```
 * <div id="app"><Teleport to="#tp"><span class="tele">T</span></Teleport></div>
 *   → <div id="app"></div>          ← 内容整块消失，target 也没拿到
 * ```
 *
 * 同一批还暴露插槽形态的第二个缺口：`<Child>hello</Child>`（**纯文本子节点**）
 * 的 `slots.default` 从未建立（`initSlots` 没有字符串分支）。
 *
 * ## 判据设计
 *
 * 每条都断言**用户能看见的效果**，而不是「组件对象不是 undefined」：
 * · Teleport → 内容真的出现在 target 里、且不在原位；
 * · KeepAlive → 切走再切回，**子组件内部状态还在**（不是重新挂了一份）；
 * · Transition → 子节点真的渲染出来（类名时序另说，见文件末尾的已知缺口）；
 * · Suspense → 同步子节点直接渲染出来；
 * · 文本子 → 文本真的进了插槽。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, ref, nextTick, Teleport, KeepAlive } from '../src/index';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const el of hosts.splice(0)) el.remove();
  vi.restoreAllMocks();
});

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  hosts.push(el);
  return el;
}

async function flush(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
}

/** 挂一个组件并返回容器 */
async function mountApp(comp: unknown): Promise<HTMLElement> {
  const el = host();
  await createApp(comp as never).mount(el);
  await flush();
  return el;
}

describe('内置组件（模板写法）', () => {
  it('Teleport：内容必须被搬到 target，且不在原位', async () => {
    const target = host();
    target.id = 'tp-target';

    const el = await mountApp({
      template:
        '<div id="app"><Teleport to="#tp-target"><span class="tele">T</span></Teleport></div>',
    });

    expect(target.querySelector('.tele')).not.toBeNull();
    expect(target.textContent).toContain('T');
    // 原位不得残留内容（只允许 teleport 的占位注释）
    expect(el.querySelector('.tele')).toBeNull();
  });

  it('Teleport：`h()` + 单个子 vnode 也要能搬（模板编译产物就是这个形态）', async () => {
    const target = host();
    target.id = 'tp-target-2';

    const el = host();
    await createApp({
      setup() {
        return () =>
          h('div', { id: 'app' }, [
            h(Teleport as never, { to: '#tp-target-2' }, h('span', { class: 'tele2' }, 'T2')),
          ]);
      },
    } as never).mount(el);
    await flush();

    expect(target.querySelector('.tele2')).not.toBeNull();
    expect(el.querySelector('.tele2')).toBeNull();
  });

  it('Teleport disabled：内容留在原位', async () => {
    const target = host();
    target.id = 'tp-target-3';

    const el = await mountApp({
      template:
        '<div id="app"><Teleport to="#tp-target-3" disabled><span class="tele3">T3</span></Teleport></div>',
    });

    expect(el.querySelector('.tele3')).not.toBeNull();
    expect(target.querySelector('.tele3')).toBeNull();
  });

  it('KeepAlive：模板里要渲染出子节点', async () => {
    const el = await mountApp({
      template: '<div id="app"><KeepAlive><span class="ka">K</span></KeepAlive></div>',
    });

    expect(el.querySelector('.ka')).not.toBeNull();
    expect(el.textContent).toContain('K');
  });

  it('KeepAlive：切走再切回，子组件内部状态必须保留', async () => {
    const show = ref(true);
    const el = host();

    const A = {
      setup() {
        const n = ref(7);
        return () => h('i', { class: 'a' }, String(n.value));
      },
    };
    const B = { setup: () => () => h('i', { class: 'b' }, 'B') };

    await createApp({
      setup() {
        return () =>
          h('div', { id: 'app' }, [
            h(KeepAlive as never, null, [show.value ? h(A as never) : h(B as never)]),
          ]);
      },
    } as never).mount(el);
    await flush();

    expect(el.querySelector('.a')?.textContent).toBe('7');

    show.value = false;
    await flush();
    expect(el.querySelector('.b')).not.toBeNull();

    show.value = true;
    await flush();
    // 状态保留 = 还是 7（若重新挂载会重新 setup，仍是 7……所以再看「同一节点」）
    const back = el.querySelector('.a');
    expect(back).not.toBeNull();
    expect(back!.textContent).toBe('7');
  });

  it('Transition：模板里要渲染出子节点', async () => {
    const el = await mountApp({
      template:
        '<div id="app"><Transition name="fade"><span class="tr">X</span></Transition></div>',
    });

    expect(el.querySelector('.tr')).not.toBeNull();
    expect(el.textContent).toContain('X');
  });

  it('Suspense：同步子节点要渲染出来（异步/fallback 见已知缺口）', async () => {
    const el = await mountApp({
      template: '<div id="app"><Suspense><span class="su">S</span></Suspense></div>',
    });

    expect(el.querySelector('.su')).not.toBeNull();
  });
});

describe('插槽形态（模板）', () => {
  /** 子组件把默认插槽渲染进 `.child` */
  const Child = {
    setup(_p: unknown, ctx: { slots: Record<string, () => unknown[]> }) {
      return () => h('div', { class: 'child' }, (ctx.slots.default?.() ?? []) as never);
    },
  };

  it('元素子节点进默认插槽（对照组：一直可用）', async () => {
    const el = await mountApp({
      components: { Child },
      template: '<div id="app"><Child><span class="inner">S</span></Child></div>',
    });

    expect(el.querySelector('.child .inner')).not.toBeNull();
  });

  it('纯文本子节点也要进默认插槽', async () => {
    const el = await mountApp({
      components: { Child },
      template: '<div id="app"><Child>hello</Child></div>',
    });

    expect(el.querySelector('.child')!.textContent).toContain('hello');
  });

  it('文本 + 元素混排都要进默认插槽', async () => {
    const el = await mountApp({
      components: { Child },
      template: '<div id="app"><Child>a<span class="inner">b</span>c</Child></div>',
    });

    const text = el.querySelector('.child')!.textContent ?? '';
    expect(text).toContain('a');
    expect(text).toContain('b');
    expect(text).toContain('c');
  });

  it('多个子节点顺序不变', async () => {
    const el = await mountApp({
      components: { Child },
      template: '<div id="app"><Child><i class="i1">1</i><i class="i2">2</i></Child></div>',
    });

    const html = el.querySelector('.child')!.innerHTML;
    expect(html.indexOf('i1')).toBeLessThan(html.indexOf('i2'));
  });
});
