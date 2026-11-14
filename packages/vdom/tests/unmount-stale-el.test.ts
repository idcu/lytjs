// @vitest-environment jsdom
/**
 * P1-6 负控：vnode 被卸载后，`vnode.el` 不得继续指向已摘除的节点。
 *
 * 缺陷：`unmount()` 移除 DOM 后没有清 `vnode.el`，而 `patch()` 顶部有一条
 * 「`n1.el === null` ⇒ 当作未挂载、走 mount」的守卫（patch.ts:489-500）——
 * 只要 `el` 不清空，这条守卫对元素节点**永远不会触发**（死分支）。
 * 结果：卸载后仍持有该 vnode 的调用方再次 patch 同类型 vnode 时，
 * 走的是「复用旧 el」的捷径，DOM 被写进一个已经脱离文档的节点，新容器保持为空。
 */
import { describe, it, expect } from 'vitest';
import { createVNode, createRenderer } from '../src/index';
import { WebRendererHost } from '@lytjs/adapter-web';

describe('P1-6 卸载后不得复用旧 el', () => {
  it('卸载后 patch 同一 vnode 到新容器：必须重新挂载，不得改写已摘除的节点', () => {
    const renderer = createRenderer(new WebRendererHost());
    const first = document.createElement('div');
    const second = document.createElement('div');

    const n1 = createVNode('div', null, 'old');
    renderer.mount(n1, first);
    const stale = n1.el as HTMLElement;
    expect(first.firstChild).toBe(stale);

    renderer.unmount(n1, null, null, true);
    expect(first.firstChild).toBeNull();

    renderer.patch(n1, createVNode('div', null, 'new'), second);

    // 新容器必须真的拿到一个 div（而不是空容器）
    expect(second.firstChild).not.toBeNull();
    expect((second.firstChild as HTMLElement).textContent).toBe('new');
    // 已摘除的节点不得被当成复用目标改写
    expect(stale.textContent).toBe('old');
    expect(stale.isConnected).toBe(false);
  });
});
