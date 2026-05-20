 
/**
 * Tests for vnode creation and manipulation
 */
import { describe, it, expect } from 'vitest';
import {
  createVNode,
  createTextVNode,
  createCommentVNode,
  cloneVNode,
  mergeProps,
  normalizeChildren,
  getShapeFlag,
  ShapeFlags,
  PatchFlags,
  Fragment,
  Text,
  Comment,
  isVNode,
  isSameVNodeType,
} from '../src/index';

describe('createVNode', () => {
  it('should create an element vnode with string type', () => {
    const vnode = createVNode('div');
    expect(vnode.type).toBe('div');
    expect(vnode.__v_isVNode).toBe(true);
    expect(vnode.shapeFlag & ShapeFlags.ELEMENT).toBeTruthy();
    expect(vnode.children).toBe(null);
    expect(vnode.el).toBe(null);
  });

  it('should create vnode with props', () => {
    const vnode = createVNode('div', { id: 'app', class: 'container' });
    expect(vnode.key).toBe(null);
    expect(vnode.ref).toBe(null);
  });

  it('should extract key from props', () => {
    const vnode = createVNode('div', { key: 'my-key' });
    expect(vnode.key).toBe('my-key');
  });

  it('should extract ref from props', () => {
    const ref = { current: null };
    const vnode = createVNode('div', { ref });
    expect(vnode.ref).toBe(ref);
  });

  it('should create vnode with text children', () => {
    const vnode = createVNode('div', null, 'hello');
    expect(vnode.children).toBe('hello');
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
  });

  it('should create vnode with array children', () => {
    const child1 = createVNode('span');
    const child2 = createVNode('span');
    const vnode = createVNode('div', null, [child1, child2]);
    expect(vnode.children).toEqual([child1, child2]);
    expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
  });

  it('should create vnode with number children (converted to string)', () => {
    const vnode = createVNode('div', null, 42);
    expect(vnode.children).toBe('42');
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
  });

  it('should create vnode with boolean children (treated as null)', () => {
    const vnode = createVNode('div', null, true);
    expect(vnode.children).toBe(undefined);
  });

  it('should create vnode with patchFlag', () => {
    const vnode = createVNode('div', null, 'text', PatchFlags.TEXT);
    expect(vnode.patchFlag).toBe(PatchFlags.TEXT);
  });

  it('should create vnode with dynamicProps', () => {
    const vnode = createVNode('div', null, null, 0, ['id', 'class']);
    expect(vnode.dynamicProps).toEqual(['id', 'class']);
  });

  it('should create vnode with isBlockNode flag', () => {
    const vnode = createVNode('div', null, null, 0, null, true);
    expect(vnode.isBlockTree).toBe(true);
  });

  it('should create fragment vnode', () => {
    const vnode = createVNode(Fragment, null, [createVNode('div')]);
    expect(vnode.type).toBe(Fragment);
    expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
  });

  it('should create text vnode', () => {
    const vnode = createVNode(Text, null, 'hello');
    expect(vnode.type).toBe(Text);
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
  });

  it('should create comment vnode', () => {
    const vnode = createVNode(Comment, null, 'a comment');
    expect(vnode.type).toBe(Comment);
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
  });

  it('should create component vnode (object type)', () => {
    const comp = { __v_isComponent: true };
    const vnode = createVNode(comp);
    expect(vnode.type).toBe(comp);
    expect(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT).toBeTruthy();
  });

  it('should be recognized by isVNode', () => {
    const vnode = createVNode('div');
    expect(isVNode(vnode)).toBe(true);
    expect(isVNode({})).toBe(false);
    expect(isVNode(null)).toBe(false);
  });
});

describe('createTextVNode', () => {
  it('should create a text vnode', () => {
    const vnode = createTextVNode('hello');
    expect(vnode.type).toBe(Text);
    expect(vnode.children).toBe('hello');
    expect(vnode.__v_isVNode).toBe(true);
  });

  it('should create empty text vnode by default', () => {
    const vnode = createTextVNode();
    expect(vnode.children).toBe('');
  });
});

describe('createCommentVNode', () => {
  it('should create a comment vnode', () => {
    const vnode = createCommentVNode('my comment');
    expect(vnode.type).toBe(Comment);
    expect(vnode.isComment).toBe(true);
    expect(vnode.children).toBe('my comment');
  });
});

describe('cloneVNode', () => {
  it('should clone a vnode', () => {
    const original = createVNode('div', { id: 'app' }, 'hello');
    const cloned = cloneVNode(original);
    expect(cloned.type).toBe('div');
    expect(cloned.key).toBe(original.key);
    expect(cloned.isCloned).toBe(true);
    expect(cloned.__v_isVNode).toBe(true);
  });

  it('should merge extra props', () => {
    const original = createVNode('div', { id: 'app', class: 'old' });
    const cloned = cloneVNode(original, { class: 'new', dataAttr: 'test' });
    expect(cloned.key).toBe(original.key);
    expect(cloned.isCloned).toBe(true);
  });

  it('should merge children from extra props', () => {
    const original = createVNode('div', null, 'old text');
    const cloned = cloneVNode(original, { children: 'new text' });
    expect(cloned.children).toBe('new text');
  });
});

describe('mergeProps', () => {
  it('should merge simple props', () => {
    const result = mergeProps({ id: 'a' }, { class: 'b' });
    expect(result.id).toBe('a');
    expect(result.class).toBe('b');
  });

  it('should concatenate class values', () => {
    const result = mergeProps({ class: 'a' }, { class: 'b' });
    expect(result.class).toBe('a b');
  });

  it('should merge style objects', () => {
    const result = mergeProps({ style: { color: 'red' } }, { style: { fontSize: '16px' } });
    expect(result.style).toEqual({ color: 'red', fontSize: '16px' });
  });

  it('should concatenate event handlers', () => {
    const handler1 = () => {};
    const handler2 = () => {};
    const result = mergeProps({ onClick: handler1 }, { onClick: handler2 });
    expect(result.onClick).toEqual([handler1, handler2]);
  });

  it('should skip key and ref', () => {
    const result = mergeProps({ key: 'a', ref: {} }, { key: 'b', ref: {} });
    expect(result.key).toBeUndefined();
    expect(result.ref).toBeUndefined();
  });

  it('should handle null/undefined args', () => {
    const result = mergeProps(null, undefined, { id: 'test' });
    expect(result.id).toBe('test');
  });
});

describe('normalizeChildren', () => {
  it('should set ARRAY_CHILDREN for array', () => {
    const vnode = createVNode('div');
    vnode.shapeFlag = 0;
    normalizeChildren(vnode, [createVNode('span')]);
    expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
  });

  it('should set TEXT_CHILDREN for string', () => {
    const vnode = createVNode('div');
    vnode.shapeFlag = 0;
    normalizeChildren(vnode, 'hello');
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
  });

  it('should set SLOTS_CHILDREN for object', () => {
    const vnode = createVNode('div');
    vnode.shapeFlag = 0;
    normalizeChildren(vnode, { default: [] });
    expect(vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN).toBeTruthy();
  });
});

describe('getShapeFlag', () => {
  it('should return ELEMENT for string type', () => {
    expect(getShapeFlag('div')).toBe(ShapeFlags.ELEMENT);
  });

  it('should return ARRAY_CHILDREN for Fragment', () => {
    expect(getShapeFlag(Fragment)).toBe(ShapeFlags.ARRAY_CHILDREN);
  });

  it('should return TEXT_CHILDREN for Text', () => {
    expect(getShapeFlag(Text)).toBe(ShapeFlags.TEXT_CHILDREN);
  });

  it('should return 0 for Comment', () => {
    expect(getShapeFlag(Comment)).toBe(0);
  });

  it('should return STATEFUL_COMPONENT for object type', () => {
    expect(getShapeFlag({})).toBe(ShapeFlags.STATEFUL_COMPONENT);
  });
});

describe('isSameVNodeType', () => {
  it('should return true for same type and key', () => {
    const n1 = createVNode('div', { key: 'a' });
    const n2 = createVNode('div', { key: 'a' });
    expect(isSameVNodeType(n1, n2)).toBe(true);
  });

  it('should return false for different type', () => {
    const n1 = createVNode('div', { key: 'a' });
    const n2 = createVNode('span', { key: 'a' });
    expect(isSameVNodeType(n1, n2)).toBe(false);
  });

  it('should return false for different key', () => {
    const n1 = createVNode('div', { key: 'a' });
    const n2 = createVNode('div', { key: 'b' });
    expect(isSameVNodeType(n1, n2)).toBe(false);
  });

  it('should return true when both keys are null', () => {
    const n1 = createVNode('div');
    const n2 = createVNode('div');
    expect(isSameVNodeType(n1, n2)).toBe(true);
  });
});

describe('cloneVNode merge props', () => {
  it('should merge props in cloneVNode', () => {
    const vnode = createVNode('div', { id: 'app', class: 'old' });
    const cloned = cloneVNode(vnode, { class: 'new' });
    expect(cloned.props).toEqual({ id: 'app', class: 'new' });
  });
});

describe('vnode edge cases', () => {
  it('should handle null children correctly', () => {
    const vnode = createVNode('div', null, null);
    expect(vnode.children).toBe(null);
  });

  it('should handle undefined children correctly', () => {
    const vnode = createVNode('div', null, undefined);
    expect(vnode.children).toBe(null); // undefined 被默认值转换为 null
  });

  it('should handle empty string children', () => {
    const vnode = createVNode('div', null, '');
    expect(vnode.children).toBe('');
  });

  it('should handle zero as children', () => {
    const vnode = createVNode('div', null, 0);
    expect(vnode.children).toBe('0');
  });

  it('should handle falsy values in array children', () => {
    const child1 = createVNode('span');
    const child2 = createVNode('span');
    const vnode = createVNode('div', null, [child1, null, child2, false]);
    expect(Array.isArray(vnode.children)).toBe(true);
  });

  it('should preserve vnode properties after cloning with extra props', () => {
    const original = createVNode('div', { id: 'original' }, 'text', PatchFlags.TEXT);
    const cloned = cloneVNode(original, { class: 'added' });
    expect(cloned.type).toBe('div');
    expect(cloned.patchFlag).toBe(PatchFlags.TEXT);
    expect(cloned.isCloned).toBe(true);
  });

  it('should handle vnode with both key and ref extracted', () => {
    const ref = { current: null };
    const vnode = createVNode('div', { key: 'my-key', ref, id: 'test' });
    expect(vnode.key).toBe('my-key');
    expect(vnode.ref).toBe(ref);
  });

  it('should handle nested fragment vnodes', () => {
    const innerFragment = createVNode(Fragment, null, [createVNode('span')]);
    const outerFragment = createVNode(Fragment, null, [innerFragment, createVNode('div')]);
    expect(outerFragment.type).toBe(Fragment);
    expect(Array.isArray(outerFragment.children)).toBe(true);
  });

  it('should handle vnode with symbol key', () => {
    const symKey = Symbol('key');
    const vnode = createVNode('div', { key: symKey });
    expect(vnode.key).toBe(symKey);
  });

  it('should correctly identify different vnode types with isVNode', () => {
    const elementVNode = createVNode('div');
    const textVNode = createTextVNode('hello');
    const commentVNode = createCommentVNode('comment');
    const fragmentVNode = createVNode(Fragment, null, []);

    expect(isVNode(elementVNode)).toBe(true);
    expect(isVNode(textVNode)).toBe(true);
    expect(isVNode(commentVNode)).toBe(true);
    expect(isVNode(fragmentVNode)).toBe(true);
    expect(isVNode('not a vnode')).toBe(false);
    expect(isVNode(123)).toBe(false);
    expect(isVNode({})).toBe(false);
  });
});

describe('mergeProps advanced cases', () => {
  it('should merge multiple style objects deeply', () => {
    const result = mergeProps(
      { style: { color: 'red', margin: '10px' } },
      { style: { fontSize: '16px', color: 'blue' } },
      { style: { padding: '5px' } },
    );
    expect(result.style).toEqual({
      color: 'blue',
      margin: '10px',
      fontSize: '16px',
      padding: '5px',
    });
  });

  it('should handle merging props with null values', () => {
    const result = mergeProps({ id: null }, { class: undefined });
    expect(result.id).toBeNull();
    expect(result.class).toBe(''); // normalizeClass(undefined) 返回空字符串
  });

  it('should merge multiple event handlers into array', () => {
    const handler1 = () => 'a';
    const handler2 = () => 'b';
    const handler3 = () => 'c';
    const result = mergeProps({ onClick: handler1 }, { onClick: handler2 }, { onClick: handler3 });
    expect(result.onClick).toHaveLength(3);
    expect(result.onClick[0]).toBe(handler1);
    expect(result.onClick[1]).toBe(handler2);
    expect(result.onClick[2]).toBe(handler3);
  });

  it('should handle merging props with special HTML attributes', () => {
    const result = mergeProps(
      { 'data-id': '1', 'aria-label': 'test' },
      { 'data-value': '2', 'aria-hidden': 'true' },
    );
    expect(result['data-id']).toBe('1');
    expect(result['data-value']).toBe('2');
    expect(result['aria-label']).toBe('test');
    expect(result['aria-hidden']).toBe('true');
  });
});

describe('normalizeChildren advanced cases', () => {
  it('should handle null children', () => {
    const vnode = createVNode('div');
    vnode.shapeFlag = 0;
    normalizeChildren(vnode, null);
    // null should not set any children flag
  });

  it('should handle undefined children', () => {
    const vnode = createVNode('div');
    vnode.shapeFlag = 0;
    normalizeChildren(vnode, undefined);
    // undefined should not set any children flag
  });

  it('should handle number children as text', () => {
    const vnode = createVNode('div');
    vnode.shapeFlag = 0;
    normalizeChildren(vnode, 42);
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
    expect(vnode.children).toBe('42');
  });

  it('should handle boolean children (treated as no children)', () => {
    const vnode = createVNode('div');
    vnode.shapeFlag = 0;
    normalizeChildren(vnode, true);
    // boolean should not set TEXT_CHILDREN flag
  });
});
