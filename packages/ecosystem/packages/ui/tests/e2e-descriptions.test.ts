// @vitest-environment jsdom
/**
 * Descriptions 单节点插槽回归（P1-33）
 *
 * `slots.default()` 的契约允许返回**单个 VNode**，而组件里写的是
 * `bodyChildren.push(...slots.default())` —— 单 VNode 不是可迭代对象，
 * `...` 直接抛 `Spread syntax requires ...iterable`。
 *
 * 公共 API 路径（`initSlots`）在 2026-10-27 已统一把插槽返回值包成数组，
 * 所以这里同时锁两件事：
 * ① 真挂载（公共 API）渲染出恰好一个描述项；
 * ② 直接调用 `setup` 且插槽表**未经规范化**时也不能被展开/崩溃。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { createVNode } from '@lytjs/core/runtime';
import { Descriptions, DescriptionsItem } from '../src/components/Descriptions';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

describe('Descriptions — 单节点插槽', () => {
  it('公共 API：默认插槽返回单个 VNode 时只渲染一个描述项', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    await createApp({
      setup() {
        return () =>
          h(Descriptions as never, null, {
            default: () =>
              h(DescriptionsItem as never, { label: '姓名' }, { default: () => '张三' }),
          });
      },
    } as never).mount(host);

    expect(host.querySelectorAll('.lyt-descriptions-item')).toHaveLength(1);
    expect(host.textContent).toContain('姓名');
    expect(host.textContent).toContain('张三');
  });

  it('★ 未经规范化的插槽表（直接 setup）也不能把单 VNode 展开', () => {
    const item = createVNode(DescriptionsItem as never, { label: '姓名' });
    const render = (
      Descriptions as unknown as { setup: (p: object, ctx: object) => () => unknown }
    ).setup({}, { slots: { default: () => item } });

    const tree = render() as {
      children: Array<{ props: { class?: string }; children: unknown[] }>;
    };
    const body = tree.children.find((child) =>
      String(child.props?.class ?? '').includes('lyt-descriptions__body'),
    );
    expect(body).toBeTruthy();
    expect(body!.children).toHaveLength(1);
    expect(body!.children[0]).toBe(item);
  });
});
