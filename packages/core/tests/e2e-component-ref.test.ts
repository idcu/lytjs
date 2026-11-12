// @vitest-environment jsdom
/**
 * 组件 `ref` 全链路接线（R-P0-5）。
 *
 * ## 回归背景（2026-11-12）
 *
 * `patch.ts` 的组件分支在挂载后**没有 setRef**、在卸载时又在 `ref` 清理代码之前
 * `return` ⇒ `<Child ref={r} />` 的 `r.value` 恒为 `null`，字符串 ref 也永不写入
 * 父实例的 `$refs`。元素 ref 一直正常（走 `patch-element.ts` 的 `setRef`），
 * 只有组件 vnode 这条链路是断的。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '../src/index';
import { ref } from '@lytjs/reactivity';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

function defineChild() {
  return {
    name: 'RefChild',
    setup(_props: unknown, ctx: { expose?: (exposed: Record<string, unknown>) => void }) {
      ctx.expose?.({ hello: 'hi' });
      return {};
    },
    render() {
      return h('div', null, 'child');
    },
  };
}

describe('组件 ref 全链路（R-P0-5）', () => {
  it('★ 对象 ref：挂载后指向 expose 的内容，卸载后置 null', async () => {
    const childRef = ref<Record<string, unknown> | null>(null);
    const Child = defineChild();
    const app = createApp({ render: () => h(Child, { ref: childRef }) });
    const host = newHost();

    await app.mount(host);

    // 改前：`childRef.value === null`（挂载侧从未 setRef）
    expect(childRef.value).not.toBeNull();
    expect((childRef.value as Record<string, unknown>).hello).toBe('hi');

    app.unmount();
    expect(childRef.value).toBeNull();
  });

  it('★ 字符串 ref：写入父实例 $refs，卸载后删除', async () => {
    const Child = defineChild();
    const app = createApp({ render: () => h(Child, { ref: 'childRef' }) });
    const host = newHost();

    const proxy = (await app.mount(host)) as unknown as { $refs: Record<string, unknown> };

    expect(proxy.$refs.childRef).toBeTruthy();

    app.unmount();
    expect(proxy.$refs.childRef).toBeUndefined();
  });

  it('★ 函数 ref：挂载时收到实例，卸载时收到 null', async () => {
    const seen: unknown[] = [];
    const Child = defineChild();
    const app = createApp({ render: () => h(Child, { ref: (v: unknown) => seen.push(v) }) });
    const host = newHost();

    await app.mount(host);
    expect(seen).toHaveLength(1);
    // 函数 ref 收到的是组件实例（此处为 expose 的对象），**不是**组件根 DOM
    expect((seen[0] as Record<string, unknown>).hello).toBe('hi');

    app.unmount();
    expect(seen).toHaveLength(2);
    expect(seen[1]).toBeNull();
  });
});
