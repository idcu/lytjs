// @vitest-environment jsdom
/**
 * N18 正式判据：独立示例工程的**真实 DOM 行为**。
 *
 * 背景：`vite build` 绿不代表应用能跑。旧版 `index.html` 不引用 `main.js`，
 * 而旧 `main.js` 用 options 形式的 defineStore + 带参调用，真跑会抛
 * `Cannot read properties of undefined (reading 'todos')` 并挂载失败。
 * 现在这个判据走完整链路：加载入口 → 断言首屏 → 输入 → 添加 → 完成 →
 * 筛选 → 删除 → 持久化，全部断言**页面上真实可见的文本**。
 */
import { describe, it, expect } from 'vitest';

const tick = () => new Promise((r) => setTimeout(r, 30));
/**
 * 轮询等待首帧落地。
 *
 * `main.js` 的 `createApp(...).mount('#app')` 没有 `await`，而渲染器是**动态**
 * 加载的（`@lytjs/renderer/app`），冷启动耗时随并行负载波动 —— 固定 30ms
 * 在慢机 / 全量并行下会偶发读到空容器。这里等条件成立，不猜延时。
 */
const waitFor = async (check: () => boolean, timeoutMs = 10_000): Promise<void> => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout');
    await tick();
  }
};
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const buttonByText = (root: Element, text: string) =>
  Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);

describe('using-lytjs-as-dep · TodoApp 真实行为', () => {
  it('首屏 → 添加 → 完成 → 筛选 → 删除，并写入 localStorage', async () => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';

    await import('./main.js');

    const host = document.querySelector('#app') as HTMLElement;
    await waitFor(() => (host.textContent ?? '').includes('Todo List'));
    expect(host.textContent).toContain('Todo List');
    expect(host.textContent).toContain('待办 0 项');

    // 输入 → 添加
    const input = host.querySelector('input') as HTMLInputElement;
    input.value = '买牛奶';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    click(buttonByText(host, '添加') as Element);
    await tick();
    expect(host.textContent).toContain('买牛奶');
    expect(host.textContent).toContain('待办 1 项');
    expect(JSON.parse(localStorage.getItem('lytjs-todo-example-v1') ?? '[]')).toHaveLength(1);

    // 点击文本切换完成状态
    click(host.querySelector('.todo-text') as Element);
    await tick();
    expect(host.textContent).toContain('待办 0 项');

    // 筛选「未完成」应为空并显示占位
    const filters = Array.from(host.querySelectorAll('.todo-filters button'));
    click(filters[1] as Element);
    await tick();
    expect(host.querySelector('.todo-list')?.textContent?.trim()).toBe('');
    expect(host.querySelector('.todo-empty')).toBeTruthy();

    // 回到「全部」并删除
    click(filters[0] as Element);
    await tick();
    expect(host.textContent).toContain('买牛奶');
    click(host.querySelector('.todo-list button') as Element);
    await tick();
    expect(host.textContent).not.toContain('买牛奶');
    expect(JSON.parse(localStorage.getItem('lytjs-todo-example-v1') ?? '[]')).toHaveLength(0);
  }, 30_000);
});
