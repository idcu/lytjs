/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// @vitest-environment jsdom
/**
 * Tests for Fragment operations
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVNode,
  createRenderer,
  createFragment,
  isFragment,
  getFragmentChildren,
  getFragmentChildCount,
  Fragment,
  ShapeFlags,
} from '../src/index';
import { WebRendererHost } from '@lytjs/adapter-web';

describe('Fragment - vnode creation', () => {
  it('should create fragment vnode via createVNode', () => {
    const vnode = createVNode(Fragment, null, [createVNode('div'), createVNode('span')]);
    expect(vnode.type).toBe(Fragment);
    expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
    expect(Array.isArray(vnode.children)).toBe(true);
    expect((vnode.children as any[]).length).toBe(2);
  });

  it('should create fragment via createFragment helper', () => {
    const children = [createVNode('div'), createVNode('span')];
    const vnode = createFragment(children);
    expect(vnode.type).toBe(Fragment);
    expect(vnode.__v_isVNode).toBe(true);
    // createFragment 会扁平化 children，返回新数组
    expect(vnode.children).toEqual(children);
    expect((vnode.children as any[]).length).toBe(2);
  });
});

describe('Fragment - helpers', () => {
  it('isFragment should detect fragments', () => {
    const frag = createVNode(Fragment, null, []);
    const div = createVNode('div');
    expect(isFragment(frag)).toBe(true);
    expect(isFragment(div)).toBe(false);
  });

  it('getFragmentChildren should return children array', () => {
    const children = [createVNode('div'), createVNode('span')];
    const frag = createVNode(Fragment, null, children);
    // getFragmentChildren 会扁平化，返回新数组
    expect(getFragmentChildren(frag)).toEqual(children);
    expect(getFragmentChildren(frag).length).toBe(2);
  });

  it('getFragmentChildren should return empty for non-fragment', () => {
    const div = createVNode('div', null, 'text');
    expect(getFragmentChildren(div)).toEqual([]);
  });

  it('getFragmentChildCount should count children', () => {
    const frag = createVNode(Fragment, null, [
      createVNode('div'),
      createVNode('span'),
      createVNode('p'),
    ]);
    expect(getFragmentChildCount(frag)).toBe(3);
  });

  it('getFragmentChildCount should return 0 for non-fragment', () => {
    const div = createVNode('div');
    expect(getFragmentChildCount(div)).toBe(0);
  });
});

describe('Fragment - renderer mount', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should mount fragment children', () => {
    const frag = createVNode(Fragment, null, [
      createVNode('div', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    renderer.mount(frag, container);
    // Fragment creates two comment anchors + 2 children = 4 nodes
    // But the actual content should be the children
    const allChildren = Array.from(container.childNodes);
    // Filter out comment nodes (anchors)
    const elements = allChildren.filter((n) => n.nodeType === Node.ELEMENT_NODE);
    expect(elements.length).toBe(2);
    expect(elements[0]?.textContent).toBe('a');
    expect(elements[1]?.textContent).toBe('b');
  });

  it('should mount empty fragment', () => {
    const frag = createVNode(Fragment, null, []);
    renderer.mount(frag, container);
    // Only anchors should be present
    const comments = Array.from(container.childNodes).filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(comments.length).toBe(2);
  });

  it('should mount nested fragments', () => {
    const innerFrag = createVNode(Fragment, null, [createVNode('span', null, 'inner')]);
    const outerFrag = createVNode(Fragment, null, [createVNode('div', null, 'outer'), innerFrag]);
    renderer.mount(outerFrag, container);
    const elements = Array.from(container.childNodes).filter(
      (n) => n.nodeType === Node.ELEMENT_NODE,
    );
    expect(elements.length).toBe(2);
    expect(elements[0]?.textContent).toBe('outer');
    expect(elements[1]?.textContent).toBe('inner');
  });
});

describe('Fragment - renderer patch', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should patch fragment children (same type, update)', () => {
    const n1 = createVNode(Fragment, null, [createVNode('div', { key: 'a' }, 'old')]);
    const n2 = createVNode(Fragment, null, [createVNode('div', { key: 'a' }, 'new')]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const elements = Array.from(container.childNodes).filter(
      (n) => n.nodeType === Node.ELEMENT_NODE,
    );
    expect(elements.length).toBe(1);
    expect(elements[0]?.textContent).toBe('new');
  });

  it('should patch fragment - add children', () => {
    const n1 = createVNode(Fragment, null, [createVNode('div', { key: 'a' }, 'a')]);
    const n2 = createVNode(Fragment, null, [
      createVNode('div', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const elements = Array.from(container.childNodes).filter(
      (n) => n.nodeType === Node.ELEMENT_NODE,
    );
    expect(elements.length).toBe(2);
  });

  it('should patch fragment - remove children', () => {
    const n1 = createVNode(Fragment, null, [
      createVNode('div', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ]);
    const n2 = createVNode(Fragment, null, [createVNode('div', { key: 'a' }, 'a')]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const elements = Array.from(container.childNodes).filter(
      (n) => n.nodeType === Node.ELEMENT_NODE,
    );
    expect(elements.length).toBe(1);
    expect(elements[0]?.textContent).toBe('a');
  });
});

describe('Fragment - renderer unmount', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should unmount fragment and all children', () => {
    const frag = createVNode(Fragment, null, [
      createVNode('div', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    renderer.mount(frag, container);
    expect(container.childNodes.length).toBeGreaterThan(0);
    renderer.unmount(frag, null, null, true);
    expect(container.childNodes.length).toBe(0);
  });
});
