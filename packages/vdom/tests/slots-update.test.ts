// @vitest-environment jsdom
/**
 * 组件更新时必须重建插槽（P0 回归）
 *
 * ## 为什么需要这条
 *
 * `initSlots` 此前只在**首次挂载**（`setupComponent`）调用一次，更新路径只重建 props。
 * 后果：父组件重渲染后，子组件的 `$slots` 仍指向**首帧的插槽函数**（模板形态下还被
 * 固化成 `() => list`）⇒ 子组件一直渲染旧内容，且不报错。
 *
 * ## 判据
 *
 * 直接驱动渲染器的组件分支（`patch.ts`）：
 *   1. 首次 patch（n1=null）→ 走挂载，**不应**触发更新期的 initSlots；
 *   2. 第二次 patch（同一实例、children 变了）→ **必须**调用 `initSlots(instance, 新 children)`；
 *   3. children 没变时不应重建（避免无谓开销）。
 *
 * 这里注入的是 spy 版本的 `initSlots`，断言的是「渲染器有没有在正确的时机调用它」——
 * 这是 `patch.ts` 的职责；`initSlots` 本身的正确性由 component 包的 431 条用例覆盖。
 */

import { describe, it, expect, vi } from 'vitest';
import { createDOMRenderer } from '@lytjs/adapter-web';
import { createVNode } from '../src/vnode';
import type { ComponentInternalInstance } from '@lytjs/common-vnode';

function makeInstance(update: () => void): ComponentInternalInstance {
  return {
    type: { name: 'Child' },
    ctx: {},
    parent: null,
    root: null,
    subTree: null,
    vnode: null,
    refs: {},
    attrs: null,
    props: {},
    update,
    isMounted: true,
  } as unknown as ComponentInternalInstance;
}

describe('组件更新时重建插槽（P0 回归）', () => {
  it('children 变化时应调用 initSlots；未变化时不调用', () => {
    const initSlots = vi.fn();
    const update = vi.fn();
    // ⚠️ 签名是 `createDOMRenderer(extraOptions?)` —— **只有一个参数**，
    //    不要再传 host（传了会把 host 当 options，回调全部丢失）。
    const renderer = createDOMRenderer({
      initSlots,
      normalizeProps: vi.fn(),
    });

    const container = document.createElement('div');
    const instance = makeInstance(update);
    // ⚠️ 必须复用**同一个** type 对象：patch 用 `n1.type === n2.type` 判断是否同类，
    //    每次新建 `{ name: 'Child' }` 会被当成不同类型 ⇒ 走卸载+重挂，测不到更新分支。
    const ChildType = { name: 'Child' };
    const childA = createVNode('span', null, 'A');
    const childB = createVNode('span', null, 'B');

    // 首次：挂载路径（n1 = null）—— 不应触发更新期的 initSlots
    const vnode1 = createVNode(ChildType as never, null, [childA]);
    (vnode1 as unknown as { component: ComponentInternalInstance }).component = instance;
    renderer.patch(null, vnode1, container);
    expect(initSlots).not.toHaveBeenCalled();

    // 第二次：同一实例、children 换成新数组 —— 必须重建插槽
    const vnode2 = createVNode(ChildType as never, null, [childB]);
    (vnode2 as unknown as { component: ComponentInternalInstance }).component = instance;
    renderer.patch(vnode1, vnode2, container);

    expect(initSlots).toHaveBeenCalledTimes(1);
    expect(initSlots.mock.calls[0]?.[0]).toBe(instance);
    expect(initSlots.mock.calls[0]?.[1]).toBe(vnode2.children);
    expect(update).toHaveBeenCalled();

    // 第三次：children 引用未变 —— 不应重复重建
    const vnode3 = createVNode(ChildType as never, null, vnode2.children);
    (vnode3 as unknown as { component: ComponentInternalInstance }).component = instance;
    renderer.patch(vnode2, vnode3, container);
    expect(initSlots).toHaveBeenCalledTimes(1);
  });
});
