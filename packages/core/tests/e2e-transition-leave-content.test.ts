// @vitest-environment jsdom
/**
 * 端到端判据：**leave 期间内容必须还在**（P0）
 *
 * ## 修之前实测
 *
 * ```html
 * <Transition name="fade"><div v-if="on" class="box"><p class="inner">CONTENT</p></div></Transition>
 * ```
 *
 * ```
 * before  : <p class="inner">CONTENT</p>
 * during  : ""                    ← 内容瞬间消失
 * after   : 元素被移除
 * ```
 *
 * 用户看到的是「内容凭空消失，然后一个**空盒子**淡出」—— 而 fade 动画本来就是
 * 让**内容**淡出。根因是 `unmount` 的顺序：先递归卸载 children（含移除 DOM），
 * 再把移除动作交给 `leave` ⇒ 动画期间元素已经被掏空。
 *
 * 修法：有 `leave` 钩子时把**子树卸载**也推迟到过渡结束的回调里。
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

describe('leave 期间内容必须保留', () => {
  it('元素子节点：leave 期间子元素与文本都还在', async () => {
    const on = ref(true);
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><div v-if="on" class="box" style="${BOX}"><p class="inner">CONTENT</p></div></Transition></div>`,
    } as never).mount(host);

    expect(host.querySelector('.inner')!.textContent).toBe('CONTENT');

    on.value = false;
    await nextTick();
    await wait(20);

    const box = host.querySelector('.box');
    expect(box).not.toBeNull();
    expect(box!.className).toContain('fade-leave-active');
    // 关键断言：内容还在
    expect(box!.querySelector('.inner')).not.toBeNull();
    expect(box!.textContent).toBe('CONTENT');

    // 动画结束后才真正消失
    await wait(300);
    expect(host.querySelector('.box')).toBeNull();
    expect(host.querySelector('.inner')).toBeNull();
  });

  it('嵌套结构：多层子节点都保留', async () => {
    const on = ref(true);
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><section v-if="on" class="box" style="${BOX}"><div class="mid"><span class="deep">DEEP</span></div></section></Transition></div>`,
    } as never).mount(host);

    on.value = false;
    await nextTick();
    await wait(20);

    const box = host.querySelector('.box');
    expect(box).not.toBeNull();
    expect(box!.querySelector('.deep')!.textContent).toBe('DEEP');

    await wait(300);
    expect(host.querySelector('.deep')).toBeNull();
  });

  it('组件子节点：leave 期间组件内容也还在', async () => {
    const on = ref(true);
    const Card = {
      setup() {
        return () => h('div', { class: 'box', style: BOX }, [h('p', { class: 'inner' }, 'CARD')]);
      },
    };
    const host = newHost();
    await createApp({
      components: { Transition, Card },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><Card v-if="on" /></Transition></div>`,
    } as never).mount(host);

    on.value = false;
    await nextTick();
    await wait(20);

    const box = host.querySelector('.box');
    expect(box).not.toBeNull();
    expect(box!.textContent).toBe('CARD');

    await wait(300);
    expect(host.querySelector('.box')).toBeNull();
  });

  it('TransitionGroup：被移除的列表项 leave 期间内容还在', async () => {
    const list = ref([1, 2]);
    const host = newHost();
    await createApp({
      components: { TransitionGroup },
      setup() {
        return { list };
      },
      template: `<TransitionGroup tag="ul" name="fade"><li v-for="n in list" :key="n" class="item" style="${BOX}"><b class="n">{{ n }}</b></li></TransitionGroup>`,
    } as never).mount(host);

    list.value = [1];
    await nextTick();
    await wait(20);

    const items = host.querySelectorAll('.item');
    expect(items.length).toBe(2);
    const leaving = items[1] as HTMLElement;
    expect(leaving.className).toContain('fade-leave-active');
    // 内容仍在
    expect(leaving.querySelector('.n')).not.toBeNull();
    expect(leaving.textContent).toBe('2');

    await wait(300);
    expect(host.querySelectorAll('.item').length).toBe(1);
  });

  it('没有过渡时长时：立刻移除，子节点不残留', async () => {
    const on = ref(true);
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><div v-if="on" class="box"><p class="inner">X</p></div></Transition></div>`,
    } as never).mount(host);

    on.value = false;
    await nextTick();
    await wait(20);

    expect(host.querySelector('.box')).toBeNull();
    expect(host.querySelector('.inner')).toBeNull();
  });

  it('卸载期间不得把子节点留在文档里（无泄漏）', async () => {
    const on = ref(true);
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { on };
      },
      template: `<div id="app"><Transition name="fade"><div v-if="on" class="box" style="${BOX}"><p class="inner">X</p></div></Transition></div>`,
    } as never).mount(host);

    on.value = false;
    await nextTick();
    await wait(400);

    // 动画结束后，子节点必须真的从文档里消失（不能只是从 .box 摘掉）
    expect(document.querySelector('.inner')).toBeNull();
    expect(host.innerHTML).not.toContain('inner');
  });
});
