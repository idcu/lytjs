// @vitest-environment jsdom
/**
 * 行为级判据：`Breadcrumb` 的插槽消费与分隔符渲染（P0-4 回归）
 *
 * ## 为什么要有这条
 *
 * 2026-10-10 实测发现：`Breadcrumb` 的 `setup` 里写的是
 *   `const items: VNode[] = [];`
 * —— 一个**硬编码的空数组**，全函数没有任何填充点 ⇒ 后面的 `items.forEach`
 * 循环体永不执行 ⇒ 组件**恒渲染** `<div class="lyt-breadcrumb"></div>`。
 * 子组件 `BreadcrumbItem` 实现完好，但**从未被消费**。
 *
 * 该缺陷的特征是「不报错、不警告、老测试全绿」：
 * 老测试只断言组件能导出 / `setup()` 不抛异常，抓不到"渲染结果恒空"。
 * 因此这里用 `createApp` **真挂载 + 断言真实 DOM 文本**（硬约束 2）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Breadcrumb, BreadcrumbItem } from '../src/components/Breadcrumb';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

function makeHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

/** 真挂载：用 createApp + h，而不是直接调 setup() */
async function renderBreadcrumb(
  host: HTMLElement,
  props: Record<string, unknown>,
  slotChildren: unknown,
): Promise<void> {
  await createApp({
    setup() {
      return () =>
        h(Breadcrumb as never, props, {
          default: slotChildren as never,
        });
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
}

describe('行为：Breadcrumb 渲染真实内容', () => {
  it('★ 插槽里的 item 必须真实渲染出来（此前恒为空容器）', async () => {
    const host = makeHost();
    await renderBreadcrumb(host, {}, () => [
      h(BreadcrumbItem as never, { label: '首页' }),
      h(BreadcrumbItem as never, { label: '产品' }),
      h(BreadcrumbItem as never, { label: '详情' }),
    ]);

    // 硬约束 2：断言真实 DOM 文本
    expect(host.querySelector('.lyt-breadcrumb')).not.toBeNull();
    expect(host.textContent).toBe('首页/产品/详情');
    expect(host.querySelectorAll('.lyt-breadcrumb__item')).toHaveLength(3);
  });

  it('分隔符数量 = item 数 − 1，且默认分隔符是 `/`', async () => {
    const host = makeHost();
    await renderBreadcrumb(host, {}, () => [
      h(BreadcrumbItem as never, { label: 'A' }),
      h(BreadcrumbItem as never, { label: 'B' }),
      h(BreadcrumbItem as never, { label: 'C' }),
    ]);

    const seps = host.querySelectorAll('.lyt-breadcrumb__separator');
    expect(seps).toHaveLength(2);
    expect([...seps].map((s) => s.textContent)).toEqual(['/', '/']);
  });

  it('自定义 separator 生效', async () => {
    const host = makeHost();
    await renderBreadcrumb(host, { separator: '>' }, () => [
      h(BreadcrumbItem as never, { label: 'A' }),
      h(BreadcrumbItem as never, { label: 'B' }),
    ]);

    expect(host.textContent).toBe('A>B');
  });

  it('★ 单个子节点（非数组形态）不得被丢弃', async () => {
    // 守卫 `check-ui-slot-single-node` 的语义：只处理数组形态会在单子节点时
    // 把内容整个丢掉（Steps 曾踩过同一个坑）。
    const host = makeHost();
    await renderBreadcrumb(host, {}, () => h(BreadcrumbItem as never, { label: '唯一' }));

    expect(host.textContent).toBe('唯一');
    expect(host.querySelectorAll('.lyt-breadcrumb__item')).toHaveLength(1);
  });

  it('无子节点时渲染空容器且不抛异常', async () => {
    const host = makeHost();
    await renderBreadcrumb(host, {}, () => []);

    expect(host.querySelector('.lyt-breadcrumb')).not.toBeNull();
    expect(host.querySelectorAll('.lyt-breadcrumb__item')).toHaveLength(0);
  });

  it('BreadcrumbItem 的 label 与 disabled 类真实生效', async () => {
    const host = makeHost();
    await renderBreadcrumb(host, {}, () => [
      h(BreadcrumbItem as never, { label: '可点' }),
      h(BreadcrumbItem as never, { label: '禁用', disabled: true }),
    ]);

    const items = [...host.querySelectorAll('.lyt-breadcrumb__item')];
    expect(items).toHaveLength(2);
    expect(items[0]?.className).not.toContain('disabled');
    expect(items[1]?.className).toContain('lyt-breadcrumb__item--disabled');
  });
});
