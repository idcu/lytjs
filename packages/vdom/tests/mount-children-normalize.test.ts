// @vitest-environment jsdom
/**
 * mountChildren：数组 children 中的**非 VNode 值**必须被渲染为文本
 *
 * 回归防线 —— 修复前 `h('div', null, ['hello'])`（数组含裸字符串）渲染出**空 div**：
 * `mountChildren` 直接对每个元素 `patch(null, child, …)`，而 `patch` 对
 * 「非 VNode 且非 null」的值没有任何分支命中（`child.type` / `child.shapeFlag`
 * 均为 undefined）⇒ **静默丢弃**（不渲染、不报错）。
 *
 * 对照：`h('div', null, 'hello')`（字符串直接子节点）此前正常 ——
 * 因为它走 `normalizeChildren` 的 `TEXT_CHILDREN` 分支。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestRenderer } from './helpers';
import { createVNode } from '../src/vnode';
import type { VNode } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function makeHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

function mountAndGetHtml(vnode: VNode): string {
  const host = makeHost();
  createTestRenderer().mount(vnode, host);
  return host.innerHTML;
}

describe('mountChildren - 非 VNode 子节点（裸字符串 / 数字）应渲染为文本', () => {
  it("h('div', null, ['hello']) 应渲染出文本", () => {
    expect(mountAndGetHtml(createVNode('div', null, ['hello'] as never))).toBe(
      '<div>hello</div>',
    );
  });

  it('数组含多个裸值（字符串 + 数字）按顺序拼接', () => {
    expect(mountAndGetHtml(createVNode('div', null, ['a', 1, 'b'] as never))).toBe(
      '<div>a1b</div>',
    );
  });

  it('VNode 与裸字符串混合', () => {
    const span = createVNode('span', null, 'S');
    expect(mountAndGetHtml(createVNode('div', null, [span, ' tail'] as never))).toBe(
      '<div><span>S</span> tail</div>',
    );
  });

  it('字符串直接子节点（对照，行为不变）', () => {
    expect(mountAndGetHtml(createVNode('div', null, 'hello'))).toBe('<div>hello</div>');
  });

  it('数组中的 null / undefined 仍被跳过，不渲染出 "null" 文本', () => {
    expect(mountAndGetHtml(createVNode('div', null, [null, 'x', undefined] as never))).toBe(
      '<div>x</div>',
    );
  });

  it('更新路径：数组从 [VNode] 变为 [裸字符串] 也能正确 diff', () => {
    const host = makeHost();
    const renderer = createTestRenderer();
    const n1 = createVNode('div', null, [createVNode('span', null, 'old')] as never);
    renderer.mount(n1, host);
    expect(host.innerHTML).toBe('<div><span>old</span></div>');

    const n2 = createVNode('div', null, ['new'] as never);
    renderer.patch(n1, n2, host, null);
    expect(host.innerHTML).toBe('<div>new</div>');
  });
});
