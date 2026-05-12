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
    expect(vnode.props).toEqual({});
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

  // === 新增测试用例 ===

  describe('props 边界情况', () => {
    it('should handle empty object props', () => {
      const vnode = h('div', {}, 'content');
      expect(vnode.props).toEqual({});
    });

    it('should handle undefined children', () => {
      const vnode = h('div', { id: 'test' }, undefined);
      expect(vnode.children).toBeUndefined();
    });

    it('should handle null children', () => {
      const vnode = h('div', null, null);
      expect(vnode.children).toBeNull();
    });

    it('should handle number children', () => {
      const vnode = h('span', null, 42);
      expect(vnode.children).toBe(42);
    });

    it('should handle boolean children', () => {
      const vnode = h('span', null, true);
      expect(vnode.children).toBe(true);
    });

    it('should handle multiple string children as array', () => {
      const vnode = h('div', null, ['a', 'b', 'c']);
      expect(vnode.children).toHaveLength(3);
    });
  });

  describe('复杂 props', () => {
    it('should handle style object', () => {
      const vnode = h('div', { style: { color: 'red', fontSize: '16px' } });
      expect(vnode.props!.style).toEqual({ color: 'red', fontSize: '16px' });
    });

    it('should handle event handlers', () => {
      const handler = () => {};
      const vnode = h('button', { onClick: handler });
      expect(vnode.props!.onClick).toBe(handler);
    });

    it('should handle data attributes', () => {
      const vnode = h('div', { 'data-test': 'value', 'data-id': 123 });
      expect(vnode.props!['data-test']).toBe('value');
      expect(vnode.props!['data-id']).toBe(123);
    });

    it('should handle aria attributes', () => {
      const vnode = h('button', { 'aria-label': 'Close', 'aria-disabled': true });
      expect(vnode.props!['aria-label']).toBe('Close');
      expect(vnode.props!['aria-disabled']).toBe(true);
    });

    it('should handle mixed class types (string)', () => {
      const vnode = h('div', { class: 'foo bar' });
      expect(vnode.props!.class).toBe('foo bar');
    });

    it('should handle class array', () => {
      const vnode = h('div', { class: ['foo', 'bar'] });
      expect(vnode.props!.class).toEqual(['foo', 'bar']);
    });
  });

  describe('嵌套 VNode', () => {
    it('should create deeply nested VNodes', () => {
      const vnode = h('div', null, [
        h('section', null, [
          h('article', null, [
            h('p', null, 'deep content'),
          ]),
        ]),
      ]);
      expect(vnode.type).toBe('div');
      expect((vnode.children as any[])[0].type).toBe('section');
    });

    it('should handle mixed children types', () => {
      const vnode = h('div', null, [
        'text node',
        h('span', null, 'child'),
        null,
        h('br'),
      ]);
      expect((vnode.children as any[]).length).toBe(4);
    });

    it('should handle Fragment as child', () => {
      const vnode = h('div', null, [
        h(Fragment, null, [h('p'), h('p')]),
      ]);
      expect((vnode.children as any[])[0].type).toBe(Fragment);
    });
  });

  describe('特殊元素类型', () => {
    it('should handle SVG elements', () => {
      const vnode = h('svg', null, [
        h('circle', { cx: 50, cy: 50, r: 40 }),
      ]);
      expect(vnode.type).toBe('svg');
    });

    it('should handle input elements', () => {
      const vnode = h('input', { type: 'text', value: 'test' });
      expect(vnode.type).toBe('input');
      expect(vnode.props!.type).toBe('text');
    });

    it('should handle textarea with value', () => {
      const vnode = h('textarea', null, 'content');
      expect(vnode.children).toBe('content');
    });

    it('should handle void elements', () => {
      const voidElements = ['br', 'hr', 'img', 'input', 'meta', 'link'];
      voidElements.forEach(tag => {
        const vnode = h(tag);
        expect(vnode.type).toBe(tag);
      });
    });
  });

  describe('VNode 属性验证', () => {
    it('should have shapeFlag for element', () => {
      const vnode = h('div');
      expect(vnode.shapeFlag).toBeDefined();
    });

    it('should have shapeFlag for component', () => {
      const comp = { render: () => {} };
      const vnode = h(comp);
      expect(vnode.shapeFlag).toBeDefined();
    });

    it('should preserve all props order', () => {
      const vnode = h('div', {
        id: 'test',
        class: 'container',
        'data-value': 42,
      });
      expect(Object.keys(vnode.props!)).toContain('id');
      expect(Object.keys(vnode.props!)).toContain('class');
      expect(Object.keys(vnode.props!)).toContain('data-value');
    });
  });

  describe('性能相关', () => {
    it('should create VNode efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        h('div', { key: i }, `item ${i}`);
      }
      const end = performance.now();
      // 创建 1000 个 VNode 应该在合理时间内完成
      expect(end - start).toBeLessThan(100);
    });

    it('should reuse props object when possible', () => {
      const props = { id: 'shared' };
      const vnode1 = h('div', props);
      const vnode2 = h('div', props);
      // props 应该被正确引用
      expect(vnode1.props).toBe(props);
      expect(vnode2.props).toBe(props);
    });
  });
});
