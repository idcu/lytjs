// @vitest-environment jsdom
/**
 * 端到端判据：`<Transition mode="out-in">`
 *
 * ## 修之前实测
 *
 * `mode` 在 props 里声明了（`'in-out' | 'out-in' | 'default'`），但**完全没有被读过** ——
 * 与 `Transition` 曾经是 pass-through 时同一个毛病：**声明了、不做事、不报错**。
 *
 * 后果：`<Transition mode="out-in">` 切换时**新旧元素同时在场**（旧的在 leave、新的已 enter），
 * 布局会抖一下（两个块并存），而 `out-in` 的全部意义就是「旧的走完再进新的」。
 * 这在路由切换里是最常见的用法。
 *
 * ## 判据怎么观察
 *
 * 与 `e2e-transition.test.ts` 同一套：内联 `transition-duration: 100ms`。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, nextTick, ref, Transition } from '../src/index';

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

describe('<Transition mode="out-in">', () => {
  it('旧元素先播 leave，**新元素此时不得出现**；leave 结束后新元素出现并播 enter', async () => {
    const page = ref<'a' | 'b'>('a');
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { page };
      },
      template: `
        <div id="app">
          <Transition name="fade" mode="out-in">
            <p v-if="page === 'a'" key="a" class="a" style="${BOX}">A</p>
            <p v-else key="b" class="b" style="${BOX}">B</p>
          </Transition>
        </div>`,
    } as never).mount(host);

    expect(host.querySelector('.a')).not.toBeNull();
    expect(host.querySelector('.b')).toBeNull();

    page.value = 'b';
    await nextTick();
    await wait(20);

    // 关键：此刻只有旧的（在 leave），新的**还没**出现
    const a = host.querySelector('.a');
    expect(a).not.toBeNull();
    expect(a!.className).toContain('fade-leave-active');
    expect(host.querySelector('.b')).toBeNull();

    // leave 结束后：旧的消失、新的出现且带 enter 类
    await wait(250);
    expect(host.querySelector('.a')).toBeNull();
    const b = host.querySelector('.b');
    expect(b).not.toBeNull();
    expect(b!.textContent).toBe('B');
  });

  it('默认 mode：切换时新旧**同时**在场（对照）', async () => {
    const page = ref<'a' | 'b'>('a');
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { page };
      },
      template: `
        <div id="app">
          <Transition name="fade">
            <p v-if="page === 'a'" key="a" class="a" style="${BOX}">A</p>
            <p v-else key="b" class="b" style="${BOX}">B</p>
          </Transition>
        </div>`,
    } as never).mount(host);

    page.value = 'b';
    await nextTick();
    await wait(20);

    // 默认行为：两个都在（旧的在 leave，新的已挂载）
    expect(host.querySelector('.a')).not.toBeNull();
    expect(host.querySelector('.b')).not.toBeNull();

    await wait(250);
    expect(host.querySelector('.a')).toBeNull();
    expect(host.querySelector('.b')).not.toBeNull();
  });

  it('out-in 期间连续切换两次：不崩，最终显示最新的那个', async () => {
    const page = ref<'a' | 'b' | 'c'>('a');
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { page };
      },
      template: `
        <div id="app">
          <Transition name="fade" mode="out-in">
            <p v-if="page === 'a'" key="a" class="a" style="${BOX}">A</p>
            <p v-else-if="page === 'b'" key="b" class="b" style="${BOX}">B</p>
            <p v-else key="c" class="c" style="${BOX}">C</p>
          </Transition>
        </div>`,
    } as never).mount(host);

    page.value = 'b';
    await nextTick();
    page.value = 'c';
    await nextTick();
    await wait(50);

    // 关键：中间那个（b）**从来没有出现过** —— 它只是排队里的一个过客
    expect(host.querySelector('.b')).toBeNull();
    expect(host.querySelector('.c')).toBeNull();

    await wait(400);
    expect(host.querySelector('.a')).toBeNull();
    expect(host.querySelector('.b')).toBeNull();
    expect(host.querySelector('.c')).not.toBeNull();
  });

  it('`mode="in-out"` 尚未实现：必须明确告警，不能静默当成 default', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = ref<'a' | 'b'>('a');
    const host = newHost();
    await createApp({
      components: { Transition },
      setup() {
        return { page };
      },
      template: `
        <div id="app">
          <Transition name="fade" mode="in-out">
            <p v-if="page === 'a'" key="a" class="a" style="${BOX}">A</p>
            <p v-else key="b" class="b" style="${BOX}">B</p>
          </Transition>
        </div>`,
    } as never).mount(host);

    const said = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(said).toContain('in-out');
    expect(said).toMatch(/未实现|尚未实现/);
  });
});
