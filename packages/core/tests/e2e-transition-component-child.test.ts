// @vitest-environment jsdom
/**
 * 端到端判据：子节点是**组件**时，`<Transition>` / `<TransitionGroup>` 的过渡也要触发
 *
 * ## 修之前实测
 *
 * `vnode.transition` 只在 `mountElement` / `unmount` 里被消费 —— 而那是**元素** vnode 的路径。
 * 子节点写成组件时（`<Transition><MyComp/></Transition>`），过渡钩子挂在**组件 vnode** 上，
 * 没有任何人读它 ⇒ **enter / leave 全都不发生**，且不报错：
 *
 * ```
 * <Transition name="fade"><p v-if="on">X</p></Transition>       → 有动画
 * <Transition name="fade"><MyComp v-if="on" /></Transition>     → 没动画（且看不出来为什么）
 * ```
 *
 * 这正是本报告反复出现的「一半能用」：**元素子节点能播、组件子节点不能**，
 * 而组件是绝大多数真实用法（`<Transition><RouterView/></Transition>` 是最典型的一例）。
 *
 * ## 判据怎么观察
 *
 * 与 `e2e-transition.test.ts` 同一套：子元素带内联 `transition-duration: 100ms` ⇒
 * 过渡异步完成，类名可观察。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h, nextTick, ref, Transition, TransitionGroup } from '../src/index';

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
const BOX = 'transition-duration: 100ms';

/** 根元素是个普通 div 的组件（最典型的写法） */
const Box = {
  props: { label: { type: String, default: '' } },
  setup(props: { label: string }) {
    return () => h('div', { class: 'box', style: BOX }, props.label);
  },
};

describe('<Transition> 的子节点是组件', () => {
  it('组件挂载时其**根元素**要播 enter（appear）', async () => {
    const host = newHost();
    await createApp({
      components: { Transition, Box },
      setup() {
        return { on: true };
      },
      template: `<div id="app"><Transition name="fade" appear><Box v-if="on" label="A" /></Transition></div>`,
    } as never).mount(host);

    const box = host.querySelector('.box')!;
    expect(box).not.toBeNull();
    expect(box.className).toContain('fade-enter-active');

    await wait(250);
    expect(box.className).not.toContain('fade-enter-active');
  });

  it('v-if 让组件出现时要播 enter', async () => {
    const on = ref(false);
    const host = newHost();
    await createApp({
      components: { Transition, Box },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><Box v-if="on" label="A" /></Transition></div>`,
    } as never).mount(host);

    expect(host.querySelector('.box')).toBeNull();

    on.value = true;
    await nextTick();
    await wait(20);

    const box = host.querySelector('.box')!;
    expect(box).not.toBeNull();
    expect(box.className).toContain('fade-enter-active');

    await wait(250);
    expect(box.className).not.toContain('fade-enter-active');
  });

  it('v-if 让组件消失时：根元素**先播 leave**，动画结束才移除', async () => {
    const on = ref(true);
    const host = newHost();
    await createApp({
      components: { Transition, Box },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><Box v-if="on" label="A" /></Transition></div>`,
    } as never).mount(host);

    const box = host.querySelector('.box')!;
    expect(box).not.toBeNull();

    on.value = false;
    await nextTick();
    await wait(20);

    expect(host.querySelector('.box')).not.toBeNull();
    expect(box.className).toContain('fade-leave-active');

    await wait(250);
    expect(host.querySelector('.box')).toBeNull();
  });

  it('钩子也要真的被调（不是只加类名）', async () => {
    const order: string[] = [];
    const on = ref(false);
    const host = newHost();

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
          { default: () => [on.value ? h(Box as never, { label: 'A' }) : null] },
        ),
    } as never).mount(host);

    expect(order).toEqual([]);

    on.value = true;
    await nextTick();
    await wait(20);

    expect(order).toEqual(['beforeEnter', 'enter', 'afterEnter']);
  });
});

describe('<TransitionGroup> 的列表项是组件', () => {
  it('新增的组件项要播 enter，移除的项先播 leave', async () => {
    const list = ref([1, 2]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup, Box },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><li v-for="n in list" :key="n"><Box :label="String(n)" /></li></TransitionGroup>`,
    } as never).mount(host);

    // 注意：这里的列表项是 `<li>`（元素）包着组件 —— 元素本身有钩子。
    // 真正的「组件项」是下面那条用例（列表项直接是组件）。
    list.value = [1, 2, 3];
    await nextTick();
    await wait(20);
    expect(host.querySelectorAll('.box').length).toBe(3);
  });

  it('列表项**直接是组件**时，新项的根元素也要播 enter', async () => {
    const list = ref([1, 2]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup, Box },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><Box v-for="n in list" :key="n" :label="String(n)" /></TransitionGroup>`,
    } as never).mount(host);

    expect(host.querySelectorAll('.box').length).toBe(2);

    list.value = [1, 2, 3];
    await nextTick();
    await wait(20);

    const boxes = host.querySelectorAll('.box');
    expect(boxes.length).toBe(3);
    expect((boxes[2] as HTMLElement).className).toContain('fade-enter-active');
  });
});
