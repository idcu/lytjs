import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVNode, Fragment } from '@lytjs/vdom';
import { createHydrationFunctions } from '../src/dom/hydration';

describe('Hydration', () => {
  let container: HTMLElement;
  let hydrate: (vnode: any, container: HTMLElement) => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const { hydrate: hydrateFn } = createHydrationFunctions({});
    hydrate = hydrateFn;
  });

  // 1. Hydrate simple element
  it('should hydrate a simple element matching existing DOM', () => {
    container.innerHTML = '<div id="app">hello</div>';
    const vnode = createVNode('div', { id: 'app' }, 'hello');
    hydrate(vnode, container);
    expect(container.querySelector('div')!.textContent).toBe('hello');
    expect(vnode.el).toBe(container.querySelector('div'));
  });

  // 2. Hydrate mismatched text
  it('should update text content on mismatch', () => {
    container.innerHTML = '<div>old</div>';
    const vnode = createVNode('div', null, 'new');
    hydrate(vnode, container);
    expect(container.querySelector('div')!.textContent).toBe('new');
  });

  // 3. Hydrate nested elements
  it('should hydrate nested elements', () => {
    container.innerHTML = '<div><span>child</span></div>';
    const vnode = createVNode('div', null, [createVNode('span', null, 'child')]);
    hydrate(vnode, container);
    expect(container.querySelector('span')!.textContent).toBe('child');
  });

  // 4. Hydrate fragment
  it('should hydrate fragments', () => {
    container.innerHTML = '<span>a</span><span>b</span>';
    const vnode = createVNode(Fragment, null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ]);
    hydrate(vnode, container);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(2);
    expect(spans[0]!.textContent).toBe('a');
    expect(spans[1]!.textContent).toBe('b');
  });

  // 5. Hydrate with event listeners
  it('should attach event listeners during hydration', () => {
    container.innerHTML = '<button>click me</button>';
    const handler = vi.fn();
    const vnode = createVNode('button', { onClick: handler }, 'click me');
    hydrate(vnode, container);

    const btn = container.querySelector('button')!;
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // 6. Hydrate mismatched tag
  it('should replace mismatched element', () => {
    container.innerHTML = '<span>hello</span>';
    const vnode = createVNode('div', null, 'hello');
    hydrate(vnode, container);
    expect(container.querySelector('div')).not.toBeNull();
    expect(container.querySelector('span')).toBeNull();
    expect(container.querySelector('div')!.textContent).toBe('hello');
  });

  // 7. Hydrate with extra DOM nodes
  it('should remove extra DOM nodes', () => {
    container.innerHTML = '<ul><li>a</li><li>b</li><li>c</li></ul>';
    const vnode = createVNode('ul', null, [createVNode('li', null, 'a')]);
    hydrate(vnode, container);
    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(1);
    expect(lis[0]!.textContent).toBe('a');
  });

  // 8. Hydrate Fragment with static import (not require)
  it('should hydrate Fragment using static import', () => {
    container.innerHTML = '<p>1</p><p>2</p><p>3</p>';
    const vnode = createVNode(Fragment, null, [
      createVNode('p', null, '1'),
      createVNode('p', null, '2'),
      createVNode('p', null, '3'),
    ]);
    hydrate(vnode, container);
    const ps = container.querySelectorAll('p');
    expect(ps.length).toBe(3);
  });

  // 9. Hydrate empty container
  it('should mount into empty container', () => {
    const vnode = createVNode('div', { id: 'new' }, 'new content');
    hydrate(vnode, container);
    expect(container.querySelector('div')!.textContent).toBe('new content');
    expect(container.querySelector('div')!.id).toBe('new');
  });

  // 10. Hydrate with attribute sync
  it('should sync attributes during hydration', () => {
    container.innerHTML = '<input type="text">';
    const vnode = createVNode('input', { type: 'password', value: 'secret' });
    hydrate(vnode, container);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('password');
  });
});
