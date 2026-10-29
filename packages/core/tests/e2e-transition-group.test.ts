// @vitest-environment jsdom
/**
 * 端到端判据：`<TransitionGroup>` 的列表过渡（P0）
 *
 * ## 修之前实测
 *
 * `<TransitionGroup>` 只有 `tag` 生效，其余过渡属性**全部不做事**（组件自己会发
 * DEV 告警说明"尚未接线"）。而 `vdom/transition-group.ts` 里 **752 行** FLIP 实现
 * （`recordPositions` / `applyFLIP` / `performGroupEnterTransition` /
 * `performGroupLeaveTransition` / `createFLIPState` / `beforeUpdate` / `afterUpdate`）
 * **一个调用点都没有** —— `FLIPState` 甚至没 export。
 *
 * 这是本报告第四次遇到同一类债：**机制建好了、测试也有，但没人驱动**。
 *
 * ## 判据怎么在 jsdom 里观察
 *
 * · 类名：给列表项挂一条 `<style>` 提供 `transition-duration`（jsdom 会把它算进
 *   `getComputedStyle`，已实测）⇒ 过渡异步完成，`-enter-active` / `-leave-active` 可观察；
 * · FLIP 位移：`getBoundingClientRect` 在 jsdom 里恒为 0，**必须 stub**。这里按
 *   「元素在父节点里的下标 × 20px」返回 top ⇒ 重排后位置自然变化，FLIP 才能算出位移。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, nextTick, ref, TransitionGroup } from '../src/index';

const hosts: HTMLElement[] = [];
const styleEls: HTMLStyleElement[] = [];
const originalRect = Element.prototype.getBoundingClientRect;

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  for (const s of styleEls.splice(0)) s.remove();
  Element.prototype.getBoundingClientRect = originalRect;
  vi.restoreAllMocks();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

/** jsdom 不应用内联 transition（`applyFLIPToDOMElement` 会清掉），所以走样式表 */
function injectDurationStyle(selector = '.item'): void {
  const style = document.createElement('style');
  style.textContent = `${selector} { transition-duration: 120ms; }`;
  document.head.appendChild(style);
  styleEls.push(style);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 位置由「在父节点里的下标」决定，重排后自然变化 */
function stubRectsByIndex(): void {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const parent = this.parentNode;
    const idx = parent ? Array.prototype.indexOf.call(parent.children, this) : 0;
    const top = idx * 20;
    return {
      top,
      left: 0,
      bottom: top + 10,
      right: 10,
      width: 10,
      height: 10,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

describe('<TransitionGroup> 的 enter / leave', () => {
  it('首帧默认不播 enter；`tag` 生效（ul 包裹）', async () => {
    injectDurationStyle();
    const list = ref([1, 2]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><li v-for="n in list" :key="n" class="item">{{ n }}</li></TransitionGroup>`,
    } as never).mount(host);

    const ul = host.querySelector('ul')!;
    expect(ul).not.toBeNull();
    expect(ul.querySelectorAll('.item').length).toBe(2);
    // 首帧不播
    expect(ul.querySelector('.item')!.className).not.toContain('fade-enter-active');
  });

  it('`appear` 时首帧播 enter', async () => {
    injectDurationStyle();
    const list = ref([1]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade" appear><li v-for="n in list" :key="n" class="item">{{ n }}</li></TransitionGroup>`,
    } as never).mount(host);

    const li = host.querySelector('.item')!;
    expect(li.className).toContain('fade-enter-active');

    await wait(300);
    expect(li.className).not.toContain('fade-enter-active');
  });

  it('新增列表项要播 enter（只有新增的那一项）', async () => {
    injectDurationStyle();
    const list = ref([1, 2]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><li v-for="n in list" :key="n" class="item">{{ n }}</li></TransitionGroup>`,
    } as never).mount(host);

    list.value = [1, 2, 3];
    await nextTick();
    await wait(20);

    const items = host.querySelectorAll('.item');
    expect(items.length).toBe(3);
    // 第 3 项是新的 ⇒ 播 enter；前两项不重播
    expect((items[2] as HTMLElement).className).toContain('fade-enter-active');
    expect((items[0] as HTMLElement).className).not.toContain('fade-enter-active');
  });

  it('移除列表项要**先播 leave**，动画结束才从 DOM 移除', async () => {
    injectDurationStyle();
    const list = ref([1, 2]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><li v-for="n in list" :key="n" class="item">{{ n }}</li></TransitionGroup>`,
    } as never).mount(host);

    list.value = [1];
    await nextTick();
    await wait(20);

    const items = host.querySelectorAll('.item');
    // 关键：被删的那一项**还在**，且带 leave 类
    expect(items.length).toBe(2);
    const leaving = items[1] as HTMLElement;
    expect(leaving.className).toContain('fade-leave-active');

    await wait(300);
    expect(host.querySelectorAll('.item').length).toBe(1);
  });
});

describe('<TransitionGroup> 的 FLIP 位移', () => {
  it('重排后移动过的元素要拿到 `-move` 类', async () => {
    injectDurationStyle('.item');
    stubRectsByIndex();

    const list = ref(['a', 'b', 'c']);
    const host = newHost();

    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><li v-for="k in list" :key="k" class="item">{{ k }}</li></TransitionGroup>`,
    } as never).mount(host);

    // 把 a 从第 0 位移到末尾 ⇒ b、c 上移，a 下移
    list.value = ['b', 'c', 'a'];
    await nextTick();
    await wait(20);

    const items = Array.from(host.querySelectorAll('.item')) as HTMLElement[];
    expect(items.map((el) => el.textContent)).toEqual(['b', 'c', 'a']);

    // 至少有一个元素被判定为"移动过"（位置变了才会加 -move）
    const moved = items.filter((el) => el.className.includes('fade-move'));
    expect(moved.length).toBeGreaterThan(0);
  });
});

describe('<TransitionGroup> 的边界', () => {
  it('`tag: false` 不包裹（不产生额外元素）', async () => {
    const list = ref([1]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<div id="app"><TransitionGroup :tag="false" name="fade"><li v-for="n in list" :key="n" class="item">{{ n }}</li></TransitionGroup></div>`,
    } as never).mount(host);

    expect(host.querySelector('ul')).toBeNull();
    expect(host.querySelectorAll('.item').length).toBe(1);
  });

  it('空列表不崩', async () => {
    const list = ref<number[]>([]);
    const host = newHost();

    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><li v-for="n in list" :key="n" class="item">{{ n }}</li></TransitionGroup>`,
    } as never).mount(host);

    expect(host.querySelector('ul')).not.toBeNull();
    expect(host.querySelectorAll('.item').length).toBe(0);
  });
});
