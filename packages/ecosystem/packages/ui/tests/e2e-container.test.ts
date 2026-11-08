// @vitest-environment jsdom
/**
 * Container 契约用例（V5 补漏测）
 *
 * 背景：`types.ts` 的 `ContainerProps` 声明了 `id` / `ariaLabel` / `ariaDescribedBy`，
 * 但 `Container.ts` 既没有声明这些运行时 props，也没有把它们接到根节点上 ——
 * 用户按类型传值后，DOM 上什么都不会出现（静默失效）。
 *
 * 判据（可判死）：根节点必须真的带上用户传入的 id / aria-label / aria-describedby。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Container } from '../src/components/Container';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function mount(props: Record<string, unknown>, slotText = 'content'): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup: () => () => h(Container as never, props, { default: () => [h('span', null, slotText)] }),
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 20));
  return host;
}

describe('Container：根节点契约', () => {
  it('默认渲染 div.lyt-container，并渲染默认插槽', async () => {
    const host = await mount({});
    const root = host.querySelector('.lyt-container');
    expect(root).not.toBeNull();
    expect(root!.tagName).toBe('DIV');
    expect(root!.textContent).toBe('content');
  });

  it('fluid 落到根节点类名', async () => {
    const host = await mount({ fluid: true });
    expect(host.querySelector('.lyt-container')!.className).toContain('lyt-container--fluid');
  });

  it('id / ariaLabel / ariaDescribedBy 必须透传到根节点', async () => {
    const host = await mount({
      id: 'layout-main',
      ariaLabel: '主内容区',
      ariaDescribedBy: 'layout-desc',
    });
    const root = host.querySelector('.lyt-container')!;
    expect(root.getAttribute('id')).toBe('layout-main');
    expect(root.getAttribute('aria-label')).toBe('主内容区');
    expect(root.getAttribute('aria-describedby')).toBe('layout-desc');
  });
});
