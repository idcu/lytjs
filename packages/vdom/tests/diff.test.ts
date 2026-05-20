// @vitest-environment jsdom
/**
 * Tests for diff algorithm and renderer patch
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVNode,
  createTextVNode,
  createRenderer,
  ShapeFlags,
  PatchFlags,
  Fragment,
  Text,
} from '../src/index';
import { WebRendererHost } from '@lytjs/adapter-web';

describe('Renderer - mount', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should mount an element vnode', () => {
    const vnode = createVNode('div');
    renderer.mount(vnode, container);
    expect(container.firstChild).toBe(vnode.el);
    expect((vnode.el as Element).tagName).toBe('DIV');
  });

  it('should mount element with props', () => {
    const vnode = createVNode('div', { id: 'app', class: 'container' });
    renderer.mount(vnode, container);
    const el = vnode.el as HTMLElement;
    expect(el.id).toBe('app');
    expect(el.className).toBe('container');
  });

  it('should mount element with text children', () => {
    const vnode = createVNode('div', null, 'hello world');
    renderer.mount(vnode, container);
    const el = vnode.el as HTMLElement;
    expect(el.textContent).toBe('hello world');
  });

  it('should mount element with array children', () => {
    const vnode = createVNode('div', null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    renderer.mount(vnode, container);
    const el = vnode.el as HTMLElement;
    expect(el.children.length).toBe(2);
    expect(el.children[0]?.textContent).toBe('a');
    expect(el.children[1]?.textContent).toBe('b');
  });

  it('should mount text vnode', () => {
    const vnode = createTextVNode('hello');
    renderer.mount(vnode, container);
    expect(container.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(container.firstChild?.textContent).toBe('hello');
  });

  it('should mount nested elements', () => {
    const vnode = createVNode('div', { id: 'outer' }, [
      createVNode('div', { id: 'inner' }, 'text'),
    ]);
    renderer.mount(vnode, container);
    const outer = vnode.el as HTMLElement;
    expect(outer.id).toBe('outer');
    expect(outer.children.length).toBe(1);
    expect((outer.children[0] as HTMLElement).id).toBe('inner');
    expect(outer.children[0]?.textContent).toBe('text');
  });
});

describe('Renderer - patch', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should patch element with same type - update props', () => {
    const n1 = createVNode('div', { id: 'old' });
    const n2 = createVNode('div', { id: 'new' });
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.id).toBe('new');
    expect(container.firstChild).toBe(el);
  });

  it('should patch element with different type - replace', () => {
    const n1 = createVNode('div');
    const n2 = createVNode('span');
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect((container.firstChild as Element).tagName).toBe('SPAN');
  });

  it('should patch text children', () => {
    const n1 = createVNode('div', null, 'old text');
    const n2 = createVNode('div', null, 'new text');
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect((n2.el as HTMLElement).textContent).toBe('new text');
  });

  it('should patch from array children to text children', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    const n2 = createVNode('div', null, 'plain text');
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect((n2.el as HTMLElement).textContent).toBe('plain text');
    expect((n2.el as HTMLElement).children.length).toBe(0);
  });

  it('should patch from text children to array children', () => {
    const n1 = createVNode('div', null, 'plain text');
    const n2 = createVNode('div', null, [createVNode('span', null, 'a')]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(el.children[0]?.textContent).toBe('a');
  });

  it('should unmount old element when patching to different type', () => {
    const n1 = createVNode('div', { id: 'old' });
    const n2 = createVNode('span', { id: 'new' });
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.id).toBe('new');
    expect(container.childNodes.length).toBe(1);
  });
});

describe('Renderer - diffChildren', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should add new children at end', () => {
    const n1 = createVNode('div', null, [createVNode('span', { key: 'a' }, 'a')]);
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.children.length).toBe(2);
    expect(el.children[1]?.textContent).toBe('b');
  });

  it('should remove children from end', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ]);
    const n2 = createVNode('div', null, [createVNode('span', { key: 'a' }, 'a')]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.children.length).toBe(1);
    expect(el.children[0]?.textContent).toBe('a');
  });

  it('should handle reorder with keys', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
      createVNode('span', { key: 'c' }, 'c'),
    ]);
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 'c' }, 'c'),
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.children.length).toBe(3);
    // Check that all children are present
    const texts = Array.from(el.children).map((c) => c.textContent);
    expect(texts).toContain('a');
    expect(texts).toContain('b');
    expect(texts).toContain('c');
  });

  it('should handle mixed add/remove with keys', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
      createVNode('span', { key: 'c' }, 'c'),
    ]);
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 'b' }, 'b'),
      createVNode('span', { key: 'd' }, 'd'),
    ]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.children.length).toBe(2);
    const texts = Array.from(el.children).map((c) => c.textContent);
    expect(texts).toContain('b');
    expect(texts).toContain('d');
  });
});

describe('Renderer - unmount', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should unmount an element', () => {
    const vnode = createVNode('div');
    renderer.mount(vnode, container);
    expect(container.childNodes.length).toBe(1);
    renderer.unmount(vnode, null, null, true);
    expect(container.childNodes.length).toBe(0);
  });

  it('should unmount element with children', () => {
    const vnode = createVNode('div', null, [createVNode('span'), createVNode('span')]);
    renderer.mount(vnode, container);
    expect(container.childNodes.length).toBe(1);
    renderer.unmount(vnode, null, null, true);
    expect(container.childNodes.length).toBe(0);
  });

  it('should unmount text vnode', () => {
    const vnode = createTextVNode('hello');
    renderer.mount(vnode, container);
    expect(container.childNodes.length).toBe(1);
    renderer.unmount(vnode, null, null, true);
    expect(container.childNodes.length).toBe(0);
  });

  it('should unmount fragment with children', () => {
    const vnode = createVNode(Fragment, null, [
      createVNode('div'),
      createVNode('span'),
      createTextVNode('text'),
    ]);
    renderer.mount(vnode, container);
    // Fragment 使用两个注释锚点，所以总共有 5 个节点
    expect(container.childNodes.length).toBe(5);
    renderer.unmount(vnode, null, null, true);
    expect(container.childNodes.length).toBe(0);
  });
});

describe('Renderer - patch with PatchFlags', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should optimize patch with TEXT flag', () => {
    const n1 = createVNode('div', null, 'old', PatchFlags.TEXT);
    const n2 = createVNode('div', null, 'new', PatchFlags.TEXT);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect((n2.el as HTMLElement).textContent).toBe('new');
  });

  it('should optimize patch with CLASS flag', () => {
    const n1 = createVNode('div', { class: 'old' }, null, PatchFlags.CLASS);
    const n2 = createVNode('div', { class: 'new' }, null, PatchFlags.CLASS);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect((n2.el as HTMLElement).className).toBe('new');
  });

  it('should optimize patch with STYLE flag', () => {
    const n1 = createVNode('div', { style: { color: 'red' } }, null, PatchFlags.STYLE);
    const n2 = createVNode('div', { style: { color: 'blue' } }, null, PatchFlags.STYLE);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect((n2.el as HTMLElement).style.color).toBe('blue');
  });

  it('should optimize patch with PROPS flag', () => {
    const n1 = createVNode('div', { id: 'old' }, null, PatchFlags.PROPS, ['id']);
    const n2 = createVNode('div', { id: 'new' }, null, PatchFlags.PROPS, ['id']);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect((n2.el as HTMLElement).id).toBe('new');
  });

  it('should handle FULL_PROPS flag', () => {
    const n1 = createVNode('div', { id: 'old', class: 'old' }, null, PatchFlags.FULL_PROPS);
    const n2 = createVNode('div', { id: 'new', class: 'new' }, null, PatchFlags.FULL_PROPS);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.id).toBe('new');
    expect(el.className).toBe('new');
  });
});

describe('Renderer - Fragment handling', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should mount fragment with multiple children', () => {
    const vnode = createVNode(Fragment, null, [
      createVNode('div', null, 'a'),
      createVNode('span', null, 'b'),
      createTextVNode('c'),
    ]);
    renderer.mount(vnode, container);
    // Fragment 使用两个注释锚点标记边界
    // DOM 结构: [startComment, div, span, text, endComment]
    // children 被插入到 endAnchor 之前
    expect(container.childNodes.length).toBe(5);
    expect(container.childNodes[0]?.nodeType).toBe(8); // start comment
    expect(container.childNodes[1]?.textContent).toBe('a'); // div
    expect(container.childNodes[2]?.textContent).toBe('b'); // span
    expect(container.childNodes[3]?.textContent).toBe('c'); // text
    expect(container.childNodes[4]?.nodeType).toBe(8); // end comment
  });

  it('should patch fragment children', () => {
    const n1 = createVNode(Fragment, null, [
      createVNode('div', { key: 'a' }, 'a'),
      createVNode('div', { key: 'b' }, 'b'),
    ]);
    const n2 = createVNode(Fragment, null, [
      createVNode('div', { key: 'a' }, 'a-updated'),
      createVNode('div', { key: 'b' }, 'b-updated'),
    ]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    // DOM 结构: [startComment, div, div, endComment]
    expect(container.childNodes.length).toBe(4);
    expect(container.childNodes[0]?.nodeType).toBe(8); // start comment
    expect(container.childNodes[1]?.textContent).toBe('a-updated');
    expect(container.childNodes[2]?.textContent).toBe('b-updated');
    expect(container.childNodes[3]?.nodeType).toBe(8); // end comment
  });

  it('should handle empty fragment', () => {
    const vnode = createVNode(Fragment, null, []);
    renderer.mount(vnode, container);
    // 即使是空 Fragment，也会创建两个注释锚点
    expect(container.childNodes.length).toBe(2);
    expect(container.childNodes[0]?.nodeType).toBe(8); // Comment node
    expect(container.childNodes[1]?.nodeType).toBe(8); // Comment node
  });
});

describe('Renderer - Text node handling', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should patch text nodes', () => {
    const n1 = createTextVNode('old');
    const n2 = createTextVNode('new');
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect(container.firstChild?.textContent).toBe('new');
  });

  it('should handle empty text node', () => {
    const vnode = createTextVNode('');
    renderer.mount(vnode, container);
    expect(container.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(container.firstChild?.textContent).toBe('');
  });

  it('should patch element to text node', () => {
    const n1 = createVNode('div', null, 'element');
    const n2 = createTextVNode('text');
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect(container.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });

  it('should patch text node to element', () => {
    const n1 = createTextVNode('text');
    const n2 = createVNode('div', null, 'element');
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    expect(container.firstChild?.nodeType).toBe(Node.ELEMENT_NODE);
  });
});

describe('Renderer - dynamic children optimization', () => {
  let container: HTMLDivElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = createRenderer(new WebRendererHost());
  });

  it('should handle dynamic props update efficiently', () => {
    // 需要同时设置 TEXT 和 PROPS flags 来更新文本和 props
    const n1 = createVNode('div', { id: 'test' }, 'static', PatchFlags.TEXT | PatchFlags.PROPS, [
      'id',
    ]);
    const n2 = createVNode(
      'div',
      { id: 'updated' },
      'updated',
      PatchFlags.TEXT | PatchFlags.PROPS,
      ['id'],
    );
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.id).toBe('updated');
    expect(el.textContent).toBe('updated');
  });

  it('should handle keyed children reordering', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 1 }, '1'),
      createVNode('span', { key: 2 }, '2'),
      createVNode('span', { key: 3 }, '3'),
    ]);
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 3 }, '3'),
      createVNode('span', { key: 1 }, '1'),
      createVNode('span', { key: 2 }, '2'),
    ]);
    renderer.mount(n1, container);
    renderer.patch(n1, n2, container);
    const el = n2.el as HTMLElement;
    expect(el.children.length).toBe(3);
    expect(el.children[0]?.textContent).toBe('3');
    expect(el.children[1]?.textContent).toBe('1');
    expect(el.children[2]?.textContent).toBe('2');
  });
});
