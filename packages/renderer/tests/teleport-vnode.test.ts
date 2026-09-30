// @vitest-environment jsdom
/**
 * **Teleport vnode 底座**（2026-09-30 新增）
 *
 * 背景：vdom 里 teleport / suspense 的 patch **早就存在**（`patch-teleport.ts`，
 * 分派条件 `shapeFlag & ShapeFlags.TELEPORT`），但**没有任何地方产生带该 flag 的 vnode** ——
 * `getShapeFlag()` 没有 Teleport 分支、全仓也没有 Teleport 符号 ⇒ 该能力**一直不可达**。
 * `@lytjs/component` 导出的 `Teleport` 组件是**空壳**（`setup()` 无逻辑，注释指向 vdom）。
 *
 * 本文件验证补齐底座后该能力**真的可用**：Teleport vnode → 内容被搬到目标元素。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createVNode, Teleport, Text, ShapeFlags } from '@lytjs/vdom';
import { h } from '@lytjs/core';
import { mountVNode } from '../src/index';

describe('Teleport vnode（底座）', () => {
  let target: HTMLElement;
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    target = document.createElement('div');
    target.id = 'tp-target';
    document.body.appendChild(target);
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  it('getShapeFlag 为 Teleport vnode 置上 TELEPORT 标志', () => {
    const vnode = createVNode(Teleport as never, { to: '#tp-target' } as never, [] as never);
    const flag = (vnode as { shapeFlag: number }).shapeFlag;
    expect(flag & ShapeFlags.TELEPORT).toBeTruthy();
  });

  it('内容被搬到目标元素，而不是留在宿主里', () => {
    const vnode = createVNode(
      Teleport as never,
      { to: '#tp-target' } as never,
      [h('b', { id: 'tp-inner' }, 'TP')] as never,
    );

    mountVNode(vnode, host);

    expect(target.querySelector('#tp-inner')?.textContent).toBe('TP');
    expect(host.querySelector('#tp-inner')).toBeNull();
  });

  it('目标不存在时不抛错', () => {
    const vnode = createVNode(
      Teleport as never,
      { to: '#not-exist' } as never,
      [h('b', {}, 'X')] as never,
    );
    expect(() => mountVNode(vnode, host)).not.toThrow();
  });

  // 回归用例（2026-10-01 修复）：teleport 搬运**含数组子节点（Text vnode）**的内容
  // 曾抛 `NotFoundError`（vdom 的 `mountElement` 把外层 anchor 传进了新建元素 ⇒ 锚点不属于该父节点）。
  // 对照用例（字符串子节点）见上一条。
  it('teleport 搬运含数组子节点（Text vnode）的内容不抛错', () => {
    const vnode = createVNode(
      Teleport as never,
      { to: '#tp-target' } as never,
      [
        createVNode(
          'b',
          { id: 'arr-child' } as never,
          [createVNode(Text as never, null, 'ARR') as never] as never,
        ),
      ] as never,
    );

    mountVNode(vnode, host);
    expect(target.querySelector('#arr-child')?.textContent).toBe('ARR');
  });
});
