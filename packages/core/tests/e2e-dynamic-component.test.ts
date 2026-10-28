// @vitest-environment jsdom
/**
 * 端到端门禁：`<component :is="…">` —— 动态组件
 *
 * ## 为什么需要这个文件
 *
 * 2026-10-28 实测：编译器把 `component` 当**普通标签**，产物是
 * `createBlock("component", { "is": _ctx.tag })`。
 * 浏览器把 `<component>` 当未知元素 —— 于是：
 *
 * ```
 * <component :is="tag">D</component>   →  <component is="span">D</component>
 * ```
 *
 * **内容能看见**（未知元素照常显示子节点），但组件根本没挂：props 不透传、
 * 事件不接、`is` 变了也不重建。这是「看起来能用」的最坏形态 —— 比白屏更难发现。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, ref, nextTick } from '../src/index';
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

const Alpha = {
  props: { label: { type: String, default: '' } },
  setup(p: { label: string }) {
    return () => h('b', { class: 'alpha' }, `A:${p.label}`);
  },
};
const Beta = {
  setup() {
    return () => h('i', { class: 'beta' }, 'B');
  },
};

describe('动态组件 `<component :is>`', () => {
  it('`is="span"`（小写）按原生标签渲染', async () => {
    const el = await mountApp({
      setup() {
        return { tag: 'span' };
      },
      template: '<div id="app"><component :is="tag" class="dyn">D</component></div>',
    });

    expect(el.querySelector('span.dyn')).not.toBeNull();
    // 不得残留字面量 <component> 元素
    expect(el.querySelector('component')).toBeNull();
  });

  it('`is="Alpha"` 按组件渲染，且 props 要透传', async () => {
    const el = await mountApp({
      components: { Alpha },
      setup() {
        return { view: 'Alpha' };
      },
      template: '<div id="app"><component :is="view" label="x" /></div>',
    });

    expect(el.querySelector('.alpha')!.textContent).toBe('A:x');
  });

  it('`is` 变化后要真的换组件（不是只换标签）', async () => {
    const view = ref('Alpha');
    const el = await mountApp({
      components: { Alpha, Beta },
      setup() {
        return { view };
      },
      template: '<div id="app"><component :is="view" label="y" /></div>',
    });

    expect(el.querySelector('.alpha')).not.toBeNull();

    view.value = 'Beta';
    await flush();

    expect(el.querySelector('.alpha')).toBeNull();
    expect(el.querySelector('.beta')!.textContent).toBe('B');
  });

  it('静态 `is="div"` 也要生效', async () => {
    const el = await mountApp({
      template: '<div id="app"><component is="div" class="sd">S</component></div>',
    });

    expect(el.querySelector('div.sd')).not.toBeNull();
    expect(el.querySelector('component')).toBeNull();
  });

  it('`is` 不能被当成 prop 泄漏到 DOM', async () => {
    const el = await mountApp({
      setup() {
        return { tag: 'span' };
      },
      template: '<div id="app"><component :is="tag" class="dyn2">D</component></div>',
    });

    const span = el.querySelector('span.dyn2')!;
    expect(span.hasAttribute('is')).toBe(false);
  });

  it('编译期判据：不得产出字面量 "component" 标签', () => {
    const { code } = compile('<div><component :is="tag">D</component></div>');

    expect(code).not.toContain('"component"');
    expect(code).toContain('_ctx.tag');
  });
});
