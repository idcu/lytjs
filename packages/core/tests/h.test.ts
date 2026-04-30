import { describe, it, expect } from 'vitest';
import { h, Fragment } from '../src/index';

describe('h', () => {
  it('should create element VNode', () => {
    const vnode = h('div');
    expect(vnode.type).toBe('div');
  });

  it('should create VNode with props', () => {
    const vnode = h('div', { id: 'app' });
    expect(vnode.props).toEqual({ id: 'app' });
  });

  it('should create VNode with children', () => {
    const vnode = h('div', null, 'hello');
    expect(vnode.children).toBe('hello');
  });

  it('should create VNode with array children', () => {
    const vnode = h('ul', null, [h('li', null, 'a'), h('li', null, 'b')]);
    expect(vnode.children).toHaveLength(2);
  });

  it('should create component VNode', () => {
    const comp = { render: () => {} };
    const vnode = h(comp);
    expect(vnode.type).toBe(comp);
  });

  it('should create Fragment', () => {
    const vnode = h(Fragment, null, [h('p'), h('p')]);
    expect(vnode.type).toBe(Fragment);
  });

  it('should handle null props', () => {
    const vnode = h('div', null, 'text');
    expect(vnode.props).toEqual(null);
  });

  it('should merge class', () => {
    const vnode = h('div', { class: 'a' }, null);
    expect(vnode.props!.class).toBe('a');
  });

  it('should handle key in props', () => {
    const vnode = h('div', { key: 'unique' });
    expect(vnode.key).toBe('unique');
  });

  it('should handle ref in props', () => {
    const ref = { current: null };
    const vnode = h('div', { ref });
    expect(vnode.ref).toBe(ref);
  });
});
