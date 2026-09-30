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

  // ⚠️ **已知缺陷（本批定位，最小复现）**：vdom 的 teleport patch 在搬运
  // **含「数组 + Text vnode」子节点**的内容时抛
  // `NotFoundError: The child can not be found in the parent`（锚点错位）。
  // 对照：子节点为**字符串**（`h('b', {}, 'O')`）时正常 —— 见上一条用例。
  // &#x26; codegen 产出的正是「数组 + `V(T,null,'x')`」形态 ⇒ 这是 `<Teleport>` 在 signal 模式
  // 无法接线的**真正拦路石**（不是 codegen 问题）。修好后本用例会自动翻红，请移出清单。
  it.fails('已知缺陷：teleport 搬运含数组子节点（Text vnode）的内容应不抛错', () => {
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

  // ⚠️ **已知缺陷（本批定位，最小复现）**：vdom 的 teleport patch 在搬运
  // **含「数组 + Text vnode」子节点**的内容时抛
  // `NotFoundError: The child can not be found in the parent`（锚点错位）。
  // 对照：子节点为**字符串**（`h('b', {}, 'O')`）时正常 —— 见上一条用例。
  // &#x26; codegen 产出的正是「数组 + `V(T,null,'x')`」形态 ⇒ 这是 `<Teleport>` 在 signal 模式
  // 无法接线的**真正拦路石**（不是 codegen 问题）。修好后本用例会自动翻红，请移出清单。
  it.fails('已知缺陷：teleport 搬运含数组子节点（Text vnode）的内容应不抛错', () => {
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
