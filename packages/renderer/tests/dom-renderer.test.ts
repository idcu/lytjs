import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVNode, Fragment } from '@lytjs/vdom';
import { createDOMRenderer } from '../src/dom/dom-renderer';

describe('DOM Renderer', () => {
  let renderer: ReturnType<typeof createDOMRenderer>;
  let container: HTMLElement;

  beforeEach(() => {
    renderer = createDOMRenderer();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  // 1. Mount element
  it('should mount an element with correct innerHTML', () => {
    const vnode = createVNode('div', { id: 'app' }, 'hello');
    renderer.render(vnode, container);
    expect(container.innerHTML).toBe('<div id="app">hello</div>');
  });

  // 2. Update props
  it('should update props on re-render', () => {
    const vnode1 = createVNode('div', { id: 'app' }, 'hello');
    renderer.render(vnode1, container);

    const vnode2 = createVNode('div', { id: 'changed' }, 'hello');
    renderer.render(vnode2, container);

    expect(container.querySelector('div')!.id).toBe('changed');
  });

  // 3. Update text
  it('should update text content on re-render', () => {
    const vnode1 = createVNode('div', null, 'hello');
    renderer.render(vnode1, container);

    const vnode2 = createVNode('div', null, 'world');
    renderer.render(vnode2, container);

    expect(container.querySelector('div')!.textContent).toBe('world');
  });

  // 4. Unmount
  it('should unmount and clear container', () => {
    const vnode = createVNode('div', null, 'hello');
    renderer.render(vnode, container);
    expect(container.innerHTML).toBe('<div>hello</div>');

    renderer.render(null, container);
    expect(container.innerHTML).toBe('');
  });

  // 5. Nested elements
  it('should render nested elements correctly', () => {
    const vnode = createVNode('div', null, [createVNode('span', null, 'child')]);
    renderer.render(vnode, container);

    const div = container.querySelector('div')!;
    expect(div.tagName.toLowerCase()).toBe('div');
    expect(div.querySelector('span')!.textContent).toBe('child');
  });

  // 6. Fragment
  it('should render fragments with multiple children', () => {
    const vnode = createVNode(Fragment, null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    renderer.render(vnode, container);

    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(2);
    expect(spans[0]!.textContent).toBe('a');
    expect(spans[1]!.textContent).toBe('b');
  });

  // 7. Class update
  it('should update className', () => {
    const vnode1 = createVNode('div', { class: 'foo' }, 'hello');
    renderer.render(vnode1, container);

    const vnode2 = createVNode('div', { class: 'bar' }, 'hello');
    renderer.render(vnode2, container);

    expect(container.querySelector('div')!.className).toBe('bar');
  });

  // 8. Style update
  it('should update style', () => {
    const vnode1 = createVNode('div', { style: { color: 'red' } }, 'hello');
    renderer.render(vnode1, container);

    const vnode2 = createVNode('div', { style: { color: 'blue' } }, 'hello');
    renderer.render(vnode2, container);

    const el = container.querySelector('div') as HTMLElement;
    expect(el.style.color).toBe('blue');
  });

  // 9. Add event
  it('should add click event listener', () => {
    const handler = vi.fn();
    const vnode = createVNode('button', { onClick: handler }, 'click me');
    renderer.render(vnode, container);

    const btn = container.querySelector('button')!;
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // 10. Update event
  it('should replace event handler on update', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const vnode1 = createVNode('button', { onClick: handler1 }, 'click me');
    renderer.render(vnode1, container);

    const vnode2 = createVNode('button', { onClick: handler2 }, 'click me');
    renderer.render(vnode2, container);

    const btn = container.querySelector('button')!;
    btn.click();
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  // 11. SVG
  it('should render SVG elements with correct namespace', () => {
    const vnode = createVNode('svg', null, [createVNode('circle', { cx: '10', cy: '10', r: '5' })]);
    renderer.render(vnode, container);

    const svg = container.querySelector('svg')!;
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.querySelector('circle')).not.toBeNull();
  });

  // 12. Input value
  it('should set input value correctly', () => {
    const vnode = createVNode('input', { value: 'test' });
    renderer.render(vnode, container);

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('test');
  });

  // 13. Add children
  it('should add children to an element', () => {
    const vnode1 = createVNode('ul', null, []);
    renderer.render(vnode1, container);

    const vnode2 = createVNode('ul', null, [
      createVNode('li', null, 'item 1'),
      createVNode('li', null, 'item 2'),
    ]);
    renderer.render(vnode2, container);

    const ul = container.querySelector('ul')!;
    expect(ul.childNodes.length).toBe(2);
  });

  // 14. Remove children
  it('should remove children from an element', () => {
    const vnode1 = createVNode('ul', null, [
      createVNode('li', null, 'item 1'),
      createVNode('li', null, 'item 2'),
      createVNode('li', null, 'item 3'),
    ]);
    renderer.render(vnode1, container);

    const vnode2 = createVNode('ul', null, [createVNode('li', null, 'item 1')]);
    renderer.render(vnode2, container);

    const ul = container.querySelector('ul')!;
    expect(ul.childNodes.length).toBe(1);
    expect(ul.querySelector('li')!.textContent).toBe('item 1');
  });

  // 15. Keyed reorder
  it('should correctly reorder keyed children', () => {
    const vnode1 = createVNode('ul', null, [
      createVNode('li', { key: 'a' }, 'A'),
      createVNode('li', { key: 'b' }, 'B'),
      createVNode('li', { key: 'c' }, 'C'),
    ]);
    renderer.render(vnode1, container);

    const vnode2 = createVNode('ul', null, [
      createVNode('li', { key: 'c' }, 'C'),
      createVNode('li', { key: 'a' }, 'A'),
      createVNode('li', { key: 'b' }, 'B'),
    ]);
    renderer.render(vnode2, container);

    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect(lis[0]!.textContent).toBe('C');
    expect(lis[1]!.textContent).toBe('A');
    expect(lis[2]!.textContent).toBe('B');
  });
});
