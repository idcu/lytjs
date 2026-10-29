// @vitest-environment jsdom
/**
 * 端到端判据：`<Transition>` 到底会不会播动画（P0）
 *
 * ## 修之前实测
 *
 * `<Transition>` 是个**纯 pass-through**：`setup` 只有一行 `() => slots.default?.()`。
 * 子元素照常渲染，但：
 *
 * · **一个过渡类名都不会被加**（`fade-enter-active` / `fade-leave-active` 从不出现）；
 * · **一个钩子都不会被调**（`onBeforeEnter` / `onEnter` / `onAfterLeave` … 全是死的）；
 * · `v-if` 变假时元素**立刻**从 DOM 消失（没有 leave 过程）。
 *
 * 而 `vdom/transition.ts` 里 **780 行**过渡实现（enter / leave / 等待结束 / 下一帧 / FLIP）
 * **早就写完、也有自己的单测** —— `performEnterTransition` 在全仓**零调用点**。
 * 这是本报告反复出现的同一类债：**机制建好了，没有驱动**。
 *
 * ## 判据怎么在 jsdom 里观察「动画」
 *
 * jsdom 没有 CSS 引擎 ⇒ 类名不产生计算样式。所以给子元素设**内联**
 * `transition-duration: 100ms`，让 `getTransitionInfoDOM` 读到真实时长 ⇒
 * 过渡变成「异步完成」（`duration + 50ms` 后才收尾），类名就能被观察到。
 *
 * 时序（`performEnterTransition` 的同步段）：加 `-from` + `-active` → 强制重排 →
 * 去 `-from` → 加 `-to`。所以「加完之后」能观察到的是 **`-active` 与 `-to`**，
 * 而 `-from` 只在同一帧内存在（这正是 Vue 的语义，不是缺陷）。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, nextTick, Transition, ref } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  vi.restoreAllMocks();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 让过渡真的「有时长」：jsdom 只认内联样式 */
const BOX = 'transition-duration: 100ms';

describe('<Transition> 的 enter', () => {
  it('首帧默认**不**播 enter（与 Vue 一致，页面首屏不该有进入动画）', async () => {
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on: true };
      },
      template: `<div id="app"><Transition name="fade"><p v-if="on" class="box" style="${BOX}">X</p></Transition></div>`,
    } as never).mount(host);

    const p = host.querySelector('.box')!;
    expect(p).not.toBeNull();
    expect(p.className).not.toContain('fade-enter-active');
  });

  it('`appear` 时首帧要播 enter：先加 active/to，再自动收尾', async () => {
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on: true };
      },
      template: `<div id="app"><Transition name="fade" appear><p v-if="on" class="box" style="${BOX}">X</p></Transition></div>`,
    } as never).mount(host);

    const p = host.querySelector('.box')!;
    expect(p.className).toContain('fade-enter-active');
    expect(p.className).toContain('fade-enter-to');

    await wait(250);
    expect(p.className).not.toContain('fade-enter-active');
    expect(p.className).not.toContain('fade-enter-to');
  });

  it('v-if 变真时要播 enter（这是最常见的用法）', async () => {
    const on = ref(false);
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><p v-if="on" class="box" style="${BOX}">X</p></Transition></div>`,
    } as never).mount(host);

    expect(host.querySelector('.box')).toBeNull();

    on.value = true;
    await nextTick();
    await wait(20);

    const p = host.querySelector('.box')!;
    expect(p).not.toBeNull();
    expect(p.className).toContain('fade-enter-active');

    await wait(250);
    expect(p.className).not.toContain('fade-enter-active');
  });
});

describe('<Transition> 的 leave', () => {
  it('v-if 变假时元素**先播 leave**，动画结束才从 DOM 移除', async () => {
    const on = ref(true);
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><p v-if="on" class="box" style="${BOX}">X</p></Transition></div>`,
    } as never).mount(host);

    const p = host.querySelector('.box')!;
    expect(p).not.toBeNull();

    on.value = false;
    await nextTick();
    await wait(20);

    // 关键断言：此刻元素**还在**，且带着 leave 类
    expect(host.querySelector('.box')).not.toBeNull();
    expect(p.className).toContain('fade-leave-active');
    expect(p.className).toContain('fade-leave-to');

    // 过渡结束后才真正移除
    await wait(250);
    expect(host.querySelector('.box')).toBeNull();
  });

  it('没有过渡时长时立刻移除（不留空壳）', async () => {
    const on = ref(true);
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><p v-if="on" class="box">X</p></Transition></div>`,
    } as never).mount(host);

    expect(host.querySelector('.box')).not.toBeNull();

    on.value = false;
    await nextTick();
    await wait(20);

    expect(host.querySelector('.box')).toBeNull();
  });
});

describe('<Transition> 的钩子', () => {
  it('enter 钩子顺序：beforeEnter → enter → afterEnter', async () => {
    const order: string[] = [];
    const host = newHost();
    const on = ref(false);

    await createApp({
      render: () =>
        h(
          Transition as never,
          {
            name: 'fade',
            onBeforeEnter: () => order.push('beforeEnter'),
            onEnter: (_el: unknown, done: () => void) => {
              order.push('enter');
              done();
            },
            onAfterEnter: () => order.push('afterEnter'),
          },
          {
            default: () => [on.value ? h('p', { class: 'box', style: BOX }, 'X') : null],
          },
        ),
    } as never).mount(host);

    // 首帧没有子节点 ⇒ 一个钩子都不该被调
    expect(order).toEqual([]);

    on.value = true;
    await nextTick();
    await wait(20);

    expect(order).toEqual(['beforeEnter', 'enter', 'afterEnter']);
  });

  it('leave 钩子顺序：beforeLeave → leave → afterLeave，且 afterLeave 时元素还在', async () => {
    const order: string[] = [];
    let stillInDomAtAfterLeave = false;
    const host = newHost();
    const on = ref(true);

    await createApp({
      render: () =>
        h(
          Transition as never,
          {
            name: 'fade',
            onBeforeLeave: () => order.push('beforeLeave'),
            onLeave: (_el: unknown, done: () => void) => {
              order.push('leave');
              setTimeout(done, 60);
            },
            onAfterLeave: () => {
              order.push('afterLeave');
              stillInDomAtAfterLeave = host.querySelector('.box') !== null;
            },
          },
          {
            default: () => [on.value ? h('p', { class: 'box' }, 'X') : null],
          },
        ),
    } as never).mount(host);

    on.value = false;
    await nextTick();
    await wait(200);

    expect(order).toEqual(['beforeLeave', 'leave', 'afterLeave']);
    // `afterLeave` 早于「从 DOM 移除」—— 否则用户想在回调里做收尾就晚了
    expect(stillInDomAtAfterLeave).toBe(true);
    expect(host.querySelector('.box')).toBeNull();
  });
});

describe('<Transition> 的边界', () => {
  it('初始无子节点不报错、也不崩', async () => {
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on: false };
      },
      template: `<div id="app"><Transition name="fade"><p v-if="on" class="box">X</p></Transition></div>`,
    } as never).mount(host);

    expect(host.textContent).toBe('');
  });

  it('多个子节点：只对第一个生效，并 DEV 告警（不静默）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host = newHost();

    await createApp({
      components: { Transition },
      template: `<div id="app"><Transition name="fade"><i class="a">A</i><b class="b">B</b></Transition></div>`,
    } as never).mount(host);

    // 与 Vue 的 BaseTransition 一致：**只渲染第一个**（第二个不参与过渡，也不渲染）
    expect(host.querySelector('.a')).not.toBeNull();
    expect(host.querySelector('.b')).toBeNull();

    const said = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(said).toContain('Transition');
    expect(said).toContain('TransitionGroup');
  });
});
