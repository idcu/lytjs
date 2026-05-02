/**
 * Tests for PatchFlags optimization
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVNode,
  createRenderer,
  createDOMRendererOptions,
  PatchFlags,
  ShapeFlags,
  hasPatchFlag,
  isStaticVNode,
  isDynamicVNode,
} from '../src/index';

describe('PatchFlags', () => {
  it('TEXT flag should be 1', () => {
    expect(PatchFlags.TEXT).toBe(1);
  });

  it('CLASS flag should be 2', () => {
    expect(PatchFlags.CLASS).toBe(2);
  });

  it('STYLE flag should be 4', () => {
    expect(PatchFlags.STYLE).toBe(4);
  });

  it('PROPS flag should be 8', () => {
    expect(PatchFlags.PROPS).toBe(8);
  });

  it('HOISTED flag should be -1', () => {
    expect(PatchFlags.HOISTED).toBe(-1);
  });

  it('BAIL flag should be -2', () => {
    expect(PatchFlags.BAIL).toBe(-2);
  });

  it('should combine flags with bitwise OR', () => {
    const combined = PatchFlags.TEXT | PatchFlags.CLASS;
    expect(hasPatchFlag({ patchFlag: combined } as any, PatchFlags.TEXT)).toBe(true);
    expect(hasPatchFlag({ patchFlag: combined } as any, PatchFlags.CLASS)).toBe(true);
    expect(hasPatchFlag({ patchFlag: combined } as any, PatchFlags.STYLE)).toBe(false);
  });
});

describe('PatchFlags - renderer optimization', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(createDOMRendererOptions());
  });

  it('TEXT patchFlag should only update text content', () => {
    const n1 = createVNode('div', { id: 'app', class: 'container' }, 'old text', PatchFlags.TEXT);
    const n2 = createVNode('div', { id: 'app', class: 'container' }, 'new text', PatchFlags.TEXT);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.textContent).toBe('new text');
    // id and class should remain (not reset)
    expect(el.id).toBe('app');
    expect(el.className).toBe('container');
  });

  it('CLASS patchFlag should only update class', () => {
    const n1 = createVNode('div', { id: 'app', class: 'old' }, 'text', PatchFlags.CLASS);
    const n2 = createVNode('div', { id: 'app', class: 'new' }, 'text', PatchFlags.CLASS);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.className).toBe('new');
  });

  it('PROPS patchFlag with dynamicProps should only diff specified props', () => {
    const n1 = createVNode(
      'div',
      { id: 'app', class: 'old', 'data-x': '1' },
      'text',
      PatchFlags.PROPS,
      ['class'],
    );
    const n2 = createVNode(
      'div',
      { id: 'app', class: 'new', 'data-x': '2' },
      'text',
      PatchFlags.PROPS,
      ['class'],
    );
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.className).toBe('new');
    // data-x should NOT be updated because it's not in dynamicProps
    expect(el.getAttribute('data-x')).toBe('1');
  });

  it('FULL_PROPS patchFlag should diff all props', () => {
    const n1 = createVNode(
      'div',
      { id: 'app', class: 'old', 'data-x': '1', title: 'old title' },
      'text',
      PatchFlags.FULL_PROPS,
    );
    const n2 = createVNode(
      'div',
      { id: 'app', class: 'new', 'data-x': '2', title: 'new title' },
      'text',
      PatchFlags.FULL_PROPS,
    );
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.className).toBe('new');
    expect(el.getAttribute('data-x')).toBe('2');
    expect(el.title).toBe('new title');
  });

  it('STYLE patchFlag should only update style', () => {
    const n1 = createVNode(
      'div',
      { id: 'app', class: 'container', style: { color: 'red', fontSize: '14px' } },
      'text',
      PatchFlags.STYLE,
    );
    const n2 = createVNode(
      'div',
      { id: 'app', class: 'container', style: { color: 'blue', fontSize: '16px' } },
      'text',
      PatchFlags.STYLE,
    );
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.style.color).toBe('blue');
    expect(el.style.fontSize).toBe('16px');
    // class should remain (not reset)
    expect(el.className).toBe('container');
  });
});

describe('VNode utility checks', () => {
  it('isStaticVNode should detect HOISTED', () => {
    const vnode = createVNode('div', null, 'static', PatchFlags.HOISTED);
    expect(isStaticVNode(vnode)).toBe(true);
  });

  it('isStaticVNode should return false for non-HOISTED', () => {
    const vnode = createVNode('div', null, 'dynamic', PatchFlags.TEXT);
    expect(isStaticVNode(vnode)).toBe(false);
  });

  it('isDynamicVNode should detect dynamic vnodes', () => {
    const vnode = createVNode('div', null, 'text', PatchFlags.TEXT);
    expect(isDynamicVNode(vnode)).toBe(true);
  });

  it('isDynamicVNode should return false for HOISTED', () => {
    const vnode = createVNode('div', null, 'static', PatchFlags.HOISTED);
    expect(isDynamicVNode(vnode)).toBe(false);
  });

  it('isDynamicVNode should return false for no flags', () => {
    const vnode = createVNode('div', null, 'text');
    expect(isDynamicVNode(vnode)).toBe(false);
  });
});
