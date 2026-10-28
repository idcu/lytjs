// @vitest-environment jsdom
/**
 * 端到端门禁：`class` / `style` 的**静态 + 动态混写**必须合并，不能互相覆盖。
 *
 * ## 为什么需要这个文件
 *
 * 2026-10-29 实测：`<span class="a" :class="{ b: on }">` 编译成
 * `{ "class": "a", "class": { b: _ctx.on } }` —— JS 对象字面量里**同名键后者胜**，
 * 于是静态的 `a` **整条丢失**，页面只剩 `class="b"`。`style` 同病。
 *
 * 这是最常见不过的写法（`class="btn" :class="{active}"`），而失败方式**不报错**：
 * 类名少一个，样式就没了 —— 看起来像 CSS 写错了。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, ref, nextTick } from '../src/index';
import { compile } from '@lytjs/compiler';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const el of hosts.splice(0)) el.remove();
});

async function flush(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

async function mountApp(comp: unknown): Promise<HTMLElement> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  hosts.push(el);
  await createApp(comp as never).mount(el);
  await flush();
  return el;
}

describe('class / style 的静态 + 动态合并', () => {
  it('静态 class 与对象 :class 都要保留', async () => {
    const el = await mountApp({
      setup() {
        return { on: true };
      },
      template: '<div id="app"><span class="a" :class="{ b: on }">S</span></div>',
    });

    const span = el.querySelector('span')!;
    expect(span.className).toContain('a');
    expect(span.className).toContain('b');
  });

  it('动态 class 为假时只留静态部分', async () => {
    const el = await mountApp({
      setup() {
        return { on: false };
      },
      template: '<div id="app"><span class="a" :class="{ b: on }">S</span></div>',
    });

    expect(el.querySelector('span')!.className).toBe('a');
  });

  it('静态 style 与动态 :style 的不同属性都要生效', async () => {
    const el = await mountApp({
      setup() {
        return { size: '20px' };
      },
      template:
        '<div id="app"><span style="color: blue" :style="{ fontSize: size }">S</span></div>',
    });

    const style = (el.querySelector('span') as HTMLElement).style;
    expect(style.color).toBe('blue');
    expect(style.fontSize).toBe('20px');
  });

  it('同名 style 属性以动态为准（CSS 层叠）', async () => {
    const el = await mountApp({
      setup() {
        return { c: 'red' };
      },
      template: '<div id="app"><span style="color: blue" :style="{ color: c }">S</span></div>',
    });

    expect((el.querySelector('span') as HTMLElement).style.color).toBe('red');
  });

  it('动态值变化后合并结果要跟着变', async () => {
    const on = ref(true);
    const el = await mountApp({
      setup() {
        return { on };
      },
      template: '<div id="app"><span class="a" :class="{ b: on }">S</span></div>',
    });

    expect(el.querySelector('span')!.className).toContain('b');

    on.value = false;
    await flush();
    expect(el.querySelector('span')!.className).toBe('a');
  });

  it('编译期判据：不得出现同名 class 键', () => {
    const { code } = compile('<div class="a" :class="{ b: on }">S</div>');

    expect((code.match(/"class":/g) ?? []).length).toBe(1);
  });
});
