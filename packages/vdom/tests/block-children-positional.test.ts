// @vitest-environment jsdom
/**
 * 回归测试：block 快速路径在 dynamicChildren **位序变化**时必须退回全量 diff
 *
 * ## 缺陷（2026-11-02 修复，P0）
 *
 * `patchBlockChildren` 按**索引**把新旧 `dynamicChildren` 配对。v-for 的每个列表项
 * 都是 block，会被收集进**外层 block** 的 `dynamicChildren`，于是列表长度一变，
 * 整个数组的位序就变了：
 *
 *   首帧   wrap.dynamicChildren = [button]        （列表为空）
 *   更新帧 wrap.dynamicChildren = [li, button]    （列表有 1 项）
 *
 * i=0 把 `button` 与 `li` 配成一对 ⇒ 类型不同 ⇒ 卸载 button，再
 * `patch(null, li, container)`，而 container 是**被 patch 元素的容器**（wrap），
 * 不是 `ul` ⇒ `li` 被挂到 `ul` 的**兄弟位置**，button 被重新挂载。
 *
 * 实测症状：`<ul><li v-for></ul>` 从空变非空后，li 出现在 ul 外面。
 *
 * ## 本测试锁什么
 *
 * 用**手工构造的 block 树**（与模板编译产物同构）直接驱动 `patch`，
 * 断言「列表项必须落在自己的父元素内」。这是最贴近缺陷根因的一层：
 * 不依赖编译器、不依赖组件系统，只验证 vdom 的 patch 语义。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestRenderer } from './helpers';
import { openBlock, createBlock, resetBlockStack } from '../src/block';
import { createElementVNode } from '../src/render-helpers';
import type { VNode } from '@lytjs/common-vnode';

/**
 * 构造与编译产物同构的 block 树：
 *
 * ```html
 * <div class="wrap">
 *   <h1>title</h1>
 *   <ul class="list"><li v-for=...></ul>
 *   <button @click="add">add</button>
 * </div>
 * ```
 *
 * 编译器的产物形态是：`button` 与每个 `li` 都是 block，被收集进 `wrap` 的
 * `dynamicChildren`；`h1` / `ul` 是静态元素，不进 `dynamicChildren`。
 */
function buildTree(items: string[]): VNode {
  resetBlockStack();

  // ── wrap 的 block 作用域 ──
  openBlock();

  // 每个列表项：openBlock + createBlock（与编译产物一致）
  const lis = items.map((text, i) => {
    openBlock();
    return createBlock('li', { key: i, class: 'li' }, text);
  });

  // 按钮：也是 block（有 @click 绑定 ⇒ 动态）
  openBlock();
  const button = createBlock('button', { onClick: () => {} }, 'add');

  // 静态元素：不进 dynamicChildren
  const h1 = createElementVNode('h1', null, 'title');
  const ul = createElementVNode('ul', { class: 'list' }, lis);

  // 收尾：createBlock 会 closeBlock() 并把自身登记进外层 block
  const wrap = createBlock('div', { class: 'wrap' }, [h1, ul, button]);

  return wrap;
}

describe('patchBlockChildren — dynamicChildren 位序变化', () => {
  beforeEach(() => {
    resetBlockStack();
    document.body.innerHTML = '';
  });

  it('列表从空变非空时，li 必须挂在自己的 ul 内（不能跑到兄弟位置）', () => {
    const renderer = createTestRenderer();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const oldTree = buildTree([]);
    // 前置断言：旧树的 dynamicChildren 只有 button（列表为空）
    expect(oldTree.dynamicChildren?.length).toBe(1);

    renderer.mount(oldTree, container);

    const newTree = buildTree(['a']);
    // 前置断言：新树的 dynamicChildren 是 [li, button] —— 位序已变
    expect(newTree.dynamicChildren?.length).toBe(2);

    renderer.patch(oldTree, newTree, container);

    const ul = container.querySelector('ul.list')!;
    const li = container.querySelector('li.li');

    expect(li).toBeTruthy();
    // 核心断言：li 的父节点必须是 ul，而不是 wrap
    expect(li!.parentElement).toBe(ul);
    expect(ul.querySelectorAll('li').length).toBe(1);
    // 兄弟元素不能被误卸载后重挂到错误位置
    expect(container.querySelector('.wrap > button')).toBeTruthy();
  });

  it('列表从 1 项增到 3 项时，所有 li 都在 ul 内且顺序正确', () => {
    const renderer = createTestRenderer();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const oldTree = buildTree(['a']);
    renderer.mount(oldTree, container);

    const newTree = buildTree(['a', 'b', 'c']);
    renderer.patch(oldTree, newTree, container);

    const ul = container.querySelector('ul.list')!;
    const items = Array.from(ul.querySelectorAll('li')).map((el) => el.textContent);

    expect(items).toEqual(['a', 'b', 'c']);
    // 没有 li 逃到 ul 外面
    expect(container.querySelectorAll('li').length).toBe(3);
  });

  it('列表清空时，li 全部移除且 ul 与兄弟节点都保留', () => {
    const renderer = createTestRenderer();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const oldTree = buildTree(['a', 'b']);
    renderer.mount(oldTree, container);

    const newTree = buildTree([]);
    renderer.patch(oldTree, newTree, container);

    expect(container.querySelectorAll('li').length).toBe(0);
    expect(container.querySelector('ul.list')).toBeTruthy();
    expect(container.querySelector('.wrap > button')).toBeTruthy();
  });

  it('位序稳定（dynamicChildren 逐位同类型同 key）时仍走快速路径且结果正确', () => {
    const renderer = createTestRenderer();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const oldTree = buildTree(['a']);
    renderer.mount(oldTree, container);

    // 长度不变、key 不变 ⇒ 位序稳定
    const newTree = buildTree(['a']);
    expect(newTree.dynamicChildren?.length).toBe(oldTree.dynamicChildren?.length);

    renderer.patch(oldTree, newTree, container);

    const ul = container.querySelector('ul.list')!;
    expect(ul.querySelectorAll('li').length).toBe(1);
    expect(container.querySelectorAll('li').length).toBe(1);
  });
});
