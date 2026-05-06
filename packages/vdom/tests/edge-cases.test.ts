/**
 * 边界条件测试用例 - Edge Cases
 * 覆盖 VNode 创建、ShapeFlags、PatchFlags、Fragment、Block Tree、
 * VNode 池化、工具函数、Diff 分析等模块的边界场景
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createVNode,
  createTextVNode,
  createCommentVNode,
  cloneVNode,
  mergeProps,
  normalizeChildren,
  getShapeFlag,
  EMPTY_OBJ,
  isStaticVNode,
  isDynamicVNode,
  getVNodeText,
  hasDynamicChildren,
  collectDynamicChildren,
  hasArrayChildren,
  hasTextChildren,
  getArrayChildren,
  openBlock,
  closeBlock,
  createBlock,
  trackDynamicChild,
  isBlock,
  getCurrentBlock,
  getBlockStackDepth,
  resetBlockStack,
  isFragmentVNode,
  getFragmentChildren,
  getFragmentChildCount,
  createFragment,
  canUseFastDiff,
  countNewNodes,
  countRemovedNodes,
  releaseVNode,
  getVNodePoolStats,
  resetVNodePoolStats,
  ShapeFlags,
  PatchFlags,
  Fragment,
  Text,
  Comment,
  isVNode,
  isSameVNodeType,
  hasPatchFlag,
  describePatchFlag,
} from '../src/index';
import {
  allChildrenHaveKeys,
  noChildrenHaveKeys,
  analyzeDiff,
} from '../src/diff';
import type { VNode } from '@lytjs/common-vnode';

// ============================================================
// 1. VNode 创建边界
// ============================================================

describe('VNode 创建边界', () => {
  describe('createVNode 空参数 / null / undefined 类型', () => {
    it('createVNode 不传参数时应使用默认值', () => {
      // type 为 null/undefined 时，getShapeFlag 返回 0
      const vnode = createVNode(null as any);
      expect(vnode.type).toBeNull();
      expect(vnode.props).toBeNull();
      expect(vnode.children).toBeNull();
      expect(vnode.key).toBeNull();
      expect(vnode.ref).toBeNull();
      expect(vnode.patchFlag).toBe(0);
      expect(vnode.dynamicProps).toBeNull();
      expect(vnode.isBlockTree).toBe(false);
    });

    it('createVNode 传入 undefined 类型应正常工作', () => {
      const vnode = createVNode(undefined as any);
      expect(vnode.type).toBeUndefined();
      expect(vnode.__v_isVNode).toBe(true);
    });
  });

  describe('createVNode 数字 children', () => {
    it('正整数 children 应转为字符串', () => {
      const vnode = createVNode('div', null, 42);
      expect(vnode.children).toBe('42');
      expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
    });

    it('零 children 应转为字符串 "0"', () => {
      const vnode = createVNode('div', null, 0);
      expect(vnode.children).toBe('0');
      expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
    });

    it('负数 children 应转为字符串', () => {
      const vnode = createVNode('div', null, -100);
      expect(vnode.children).toBe('-100');
    });

    it('浮点数 children 应转为字符串', () => {
      const vnode = createVNode('div', null, 3.14);
      expect(vnode.children).toBe('3.14');
    });

    it('NaN children 应转为字符串 "NaN"', () => {
      const vnode = createVNode('div', null, NaN);
      expect(vnode.children).toBe('NaN');
    });

    it('Infinity children 应转为字符串 "Infinity"', () => {
      const vnode = createVNode('div', null, Infinity);
      expect(vnode.children).toBe('Infinity');
    });
  });

  describe('createVNode 布尔 children', () => {
    it('true children 应被忽略（children 设为 undefined）', () => {
      const vnode = createVNode('div', null, true);
      expect(vnode.children).toBeUndefined();
    });

    it('false children 应被忽略（children 设为 undefined）', () => {
      const vnode = createVNode('div', null, false);
      expect(vnode.children).toBeUndefined();
    });
  });

  describe('createVNode 数组 children', () => {
    it('空数组 children 应设置 ARRAY_CHILDREN flag', () => {
      const vnode = createVNode('div', null, []);
      expect(vnode.children).toEqual([]);
      expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
    });

    it('混合类型数组 children 应正常处理', () => {
      const textChild = createTextVNode('hello');
      const elemChild = createVNode('span');
      const vnode = createVNode('div', null, [textChild, elemChild]);
      expect(vnode.children).toEqual([textChild, elemChild]);
      expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
    });
  });

  describe('createVNode 嵌套数组 children', () => {
    it('Fragment 类型应扁平化嵌套的 Fragment children', () => {
      const innerFrag = createVNode(Fragment, null, [createVNode('span', null, 'inner')]);
      const outerFrag = createVNode(Fragment, null, [
        createVNode('div', null, 'outer'),
        innerFrag,
      ]);
      // Fragment children 应被扁平化
      expect(Array.isArray(outerFrag.children)).toBe(true);
      expect(outerFrag.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
    });
  });

  describe('cloneVNode 保留/覆盖 props', () => {
    it('cloneVNode 不传 extraProps 应保留原始 props（浅拷贝）', () => {
      const original = createVNode('div', { id: 'app', class: 'container' });
      const cloned = cloneVNode(original);
      expect(cloned.props).toEqual({ id: 'app', class: 'container' });
      expect(cloned.props).not.toBe(original.props); // 浅拷贝，新对象
    });

    it('cloneVNode 传入 extraProps 应合并 props', () => {
      const original = createVNode('div', { id: 'app', class: 'old' });
      const cloned = cloneVNode(original, { class: 'new', dataAttr: 'test' });
      expect(cloned.props).toEqual({ id: 'app', class: 'new', dataAttr: 'test' });
    });

    it('cloneVNode 应覆盖 key', () => {
      const original = createVNode('div', { key: 'old-key' });
      const cloned = cloneVNode(original, { key: 'new-key' });
      expect(cloned.key).toBe('new-key');
    });

    it('cloneVNode 应覆盖 ref', () => {
      const ref1 = () => {};
      const ref2 = () => {};
      const original = createVNode('div', { ref: ref1 });
      const cloned = cloneVNode(original, { ref: ref2 });
      expect(cloned.ref).toBe(ref2);
    });

    it('cloneVNode 应标记 isCloned 为 true', () => {
      const original = createVNode('div');
      const cloned = cloneVNode(original);
      expect(cloned.isCloned).toBe(true);
      expect(original.isCloned).toBe(false);
    });

    it('cloneVNode 无 props 的 vnode 应正常工作', () => {
      const original = createVNode('div');
      const cloned = cloneVNode(original);
      expect(cloned.props).toBeNull();
    });
  });

  describe('cloneVNode 深克隆 children', () => {
    it('数组 children 应浅拷贝（新数组，相同元素引用）', () => {
      const child1 = createVNode('span');
      const child2 = createVNode('span');
      const original = createVNode('div', null, [child1, child2]);
      const cloned = cloneVNode(original);
      expect(cloned.children).toEqual([child1, child2]);
      expect(cloned.children).not.toBe(original.children); // 新数组
      expect((cloned.children as VNode[])[0]).toBe(child1); // 相同引用
    });

    it('字符串 children 应保留相同值', () => {
      const original = createVNode('div', null, 'hello');
      const cloned = cloneVNode(original);
      expect(cloned.children).toBe('hello');
    });

    it('dynamicChildren 应浅拷贝', () => {
      const original = createVNode('div');
      original.dynamicChildren = [createVNode('span')];
      const cloned = cloneVNode(original);
      expect(cloned.dynamicChildren).not.toBe(original.dynamicChildren);
      expect(cloned.dynamicChildren!.length).toBe(1);
    });
  });

  describe('mergeProps 多个 props 合并', () => {
    it('三个 props 对象应正确合并', () => {
      const result = mergeProps(
        { id: 'a' },
        { class: 'b' },
        { style: { color: 'red' } },
      );
      expect(result.id).toBe('a');
      expect(result.class).toBe('b');
      expect(result.style).toEqual({ color: 'red' });
    });

    it('后面的值应覆盖前面的值', () => {
      const result = mergeProps({ id: 'old' }, { id: 'new' });
      expect(result.id).toBe('new');
    });

    it('null 和 undefined 参数应被跳过', () => {
      const result = mergeProps(null, undefined, null, { id: 'test' });
      expect(result.id).toBe('test');
    });

    it('空对象应不影响结果', () => {
      const result = mergeProps({ id: 'a' }, {}, { class: 'b' });
      expect(result.id).toBe('a');
      expect(result.class).toBe('b');
    });

    it('key 和 ref 应始终被跳过', () => {
      const result = mergeProps({ key: 'a', ref: {} }, { key: 'b', ref: {} });
      expect(result.key).toBeUndefined();
      expect(result.ref).toBeUndefined();
    });

    it('事件处理器应合并为数组', () => {
      const h1 = () => {};
      const h2 = () => {};
      const h3 = () => {};
      const result = mergeProps({ onClick: h1 }, { onClick: h2 }, { onClick: h3 });
      expect(result.onClick).toEqual([h1, h2, h3]);
    });
  });

  describe('mergeProps class/style 合并', () => {
    it('多个 class 应拼接', () => {
      const result = mergeProps(
        { class: 'a' },
        { class: 'b' },
        { class: 'c' },
      );
      expect(result.class).toBe('a b c');
    });

    it('数组 class 应正确处理', () => {
      const result = mergeProps({ class: ['a', 'b'] }, { class: 'c' });
      expect(result.class).toContain('a');
      expect(result.class).toContain('b');
      expect(result.class).toContain('c');
    });

    it('多个 style 对象应深度合并', () => {
      const result = mergeProps(
        { style: { color: 'red', margin: '10px' } },
        { style: { color: 'blue', padding: '5px' } },
      );
      expect(result.style).toEqual({ color: 'blue', margin: '10px', padding: '5px' });
    });

    it('数组 style 应正确合并', () => {
      const result = mergeProps(
        { style: [{ color: 'red' }] },
        { style: { fontSize: '16px' } },
      );
      expect(result.style).toEqual({ color: 'red', fontSize: '16px' });
    });
  });

  describe('normalizeChildren 各种输入类型', () => {
    it('null children 不应设置任何 flag', () => {
      const vnode = createVNode('div');
      vnode.shapeFlag = 0;
      normalizeChildren(vnode, null);
      expect(vnode.shapeFlag).toBe(0);
    });

    it('undefined children 不应设置任何 flag', () => {
      const vnode = createVNode('div');
      vnode.shapeFlag = 0;
      normalizeChildren(vnode, undefined);
      expect(vnode.shapeFlag).toBe(0);
    });

    it('函数 children 应设置 TEXT_CHILDREN flag', () => {
      const vnode = createVNode('div');
      vnode.shapeFlag = 0;
      const fn = () => 'hello';
      normalizeChildren(vnode, fn as any);
      expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
    });

    it('对象 children 应设置 SLOTS_CHILDREN flag', () => {
      const vnode = createVNode('div');
      vnode.shapeFlag = 0;
      normalizeChildren(vnode, { default: [], header: [] });
      expect(vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN).toBeTruthy();
    });

    it('空对象 children 应设置 SLOTS_CHILDREN flag', () => {
      const vnode = createVNode('div');
      vnode.shapeFlag = 0;
      normalizeChildren(vnode, {});
      expect(vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN).toBeTruthy();
    });
  });
});

// ============================================================
// 2. ShapeFlags 边界
// ============================================================

describe('ShapeFlags 边界', () => {
  it('纯文本 children 的 shapeFlag 应包含 TEXT_CHILDREN', () => {
    const vnode = createVNode('div', null, 'hello');
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
    expect(vnode.shapeFlag & ShapeFlags.ELEMENT).toBeTruthy();
  });

  it('数组 children 的 shapeFlag 应包含 ARRAY_CHILDREN', () => {
    const vnode = createVNode('div', null, [createVNode('span')]);
    expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
    expect(vnode.shapeFlag & ShapeFlags.ELEMENT).toBeTruthy();
  });

  it('插槽 children 的 shapeFlag 应包含 SLOTS_CHILDREN', () => {
    const vnode = createVNode('div');
    normalizeChildren(vnode, { default: [] });
    expect(vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN).toBeTruthy();
  });

  it('组合 shapeFlag（ELEMENT + STATEFUL_COMPONENT + SLOTS_CHILDREN）应正确组合', () => {
    // 组件 vnode + 插槽 children
    const comp = { __v_isComponent: true };
    const vnode = createVNode(comp);
    normalizeChildren(vnode, { default: [] });
    expect(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT).toBeTruthy();
    expect(vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN).toBeTruthy();
  });

  it('Fragment 的基础 shapeFlag 应包含 ARRAY_CHILDREN', () => {
    const flag = getShapeFlag(Fragment);
    expect(flag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
  });

  it('Text 的基础 shapeFlag 应包含 TEXT_CHILDREN', () => {
    const flag = getShapeFlag(Text);
    expect(flag & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
  });

  it('Comment 的基础 shapeFlag 应为 0', () => {
    const flag = getShapeFlag(Comment);
    expect(flag).toBe(0);
  });

  it('shapeFlag 应支持位运算组合', () => {
    const combined = ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN;
    expect(combined & ShapeFlags.ELEMENT).toBeTruthy();
    expect(combined & ShapeFlags.TEXT_CHILDREN).toBeTruthy();
    expect(combined & ShapeFlags.ARRAY_CHILDREN).toBeFalsy();
  });

  it('无 children 的元素 shapeFlag 应只有 ELEMENT', () => {
    const vnode = createVNode('div');
    expect(vnode.shapeFlag).toBe(ShapeFlags.ELEMENT);
  });
});

// ============================================================
// 3. PatchFlags 边界
// ============================================================

describe('PatchFlags 边界', () => {
  it('各种 PatchFlag 值应为正确的 2 的幂', () => {
    expect(PatchFlags.TEXT).toBe(1);
    expect(PatchFlags.CLASS).toBe(2);
    expect(PatchFlags.STYLE).toBe(4);
    expect(PatchFlags.PROPS).toBe(8);
    expect(PatchFlags.FULL_PROPS).toBe(16);
    expect(PatchFlags.HYDRATE_EVENTS).toBe(32);
    expect(PatchFlags.STABLE_FRAGMENT).toBe(64);
    expect(PatchFlags.KEYED_FRAGMENT).toBe(128);
    expect(PatchFlags.UNKEYED_FRAGMENT).toBe(256);
    expect(PatchFlags.NEED_PATCH).toBe(512);
    expect(PatchFlags.DYNAMIC_SLOTS).toBe(1024);
    expect(PatchFlags.DYNAMIC_CHILDREN).toBe(2048);
  });

  it('HOISTED 应为 -1', () => {
    expect(PatchFlags.HOISTED).toBe(-1);
  });

  it('BAIL 应为 -2', () => {
    expect(PatchFlags.BAIL).toBe(-2);
  });

  describe('hasPatchFlag 检测', () => {
    it('单个 flag 应正确检测', () => {
      const vnode = createVNode('div', null, 'text', PatchFlags.TEXT);
      expect(hasPatchFlag(vnode, PatchFlags.TEXT)).toBe(true);
      expect(hasPatchFlag(vnode, PatchFlags.CLASS)).toBe(false);
    });

    it('组合 flag 应能检测各个组成部分', () => {
      const vnode = createVNode('div', null, null, PatchFlags.TEXT | PatchFlags.CLASS);
      expect(hasPatchFlag(vnode, PatchFlags.TEXT)).toBe(true);
      expect(hasPatchFlag(vnode, PatchFlags.CLASS)).toBe(true);
      expect(hasPatchFlag(vnode, PatchFlags.STYLE)).toBe(false);
    });

    it('HOISTED flag 应对所有检测返回 true', () => {
      const vnode = createVNode('div', null, null, PatchFlags.HOISTED);
      expect(hasPatchFlag(vnode, PatchFlags.TEXT)).toBe(true);
      expect(hasPatchFlag(vnode, PatchFlags.CLASS)).toBe(true);
      expect(hasPatchFlag(vnode, PatchFlags.STYLE)).toBe(true);
    });

    it('BAIL flag 应对所有检测返回 true', () => {
      const vnode = createVNode('div', null, null, PatchFlags.BAIL);
      expect(hasPatchFlag(vnode, PatchFlags.TEXT)).toBe(true);
      expect(hasPatchFlag(vnode, PatchFlags.FULL_PROPS)).toBe(true);
    });

    it('无 flag (0) 应对所有检测返回 false', () => {
      const vnode = createVNode('div', null, null, 0);
      expect(hasPatchFlag(vnode, PatchFlags.TEXT)).toBe(false);
      expect(hasPatchFlag(vnode, PatchFlags.CLASS)).toBe(false);
    });
  });

  describe('describePatchFlag 描述文本', () => {
    it('HOISTED 应返回 "HOISTED"', () => {
      expect(describePatchFlag(PatchFlags.HOISTED)).toBe('HOISTED');
    });

    it('BAIL 应返回 "BAIL"', () => {
      expect(describePatchFlag(PatchFlags.BAIL)).toBe('BAIL');
    });

    it('单个 flag 应返回对应名称', () => {
      expect(describePatchFlag(PatchFlags.TEXT)).toBe('TEXT');
      expect(describePatchFlag(PatchFlags.CLASS)).toBe('CLASS');
      expect(describePatchFlag(PatchFlags.STYLE)).toBe('STYLE');
      expect(describePatchFlag(PatchFlags.PROPS)).toBe('PROPS');
      expect(describePatchFlag(PatchFlags.FULL_PROPS)).toBe('FULL_PROPS');
    });

    it('组合 flag 应返回用 " | " 连接的名称', () => {
      const combined = PatchFlags.TEXT | PatchFlags.CLASS;
      const desc = describePatchFlag(combined);
      expect(desc).toContain('TEXT');
      expect(desc).toContain('CLASS');
      expect(desc).toContain(' | ');
    });

    it('无 flag (0) 应返回 "NO_FLAGS"', () => {
      expect(describePatchFlag(0)).toBe('NO_FLAGS');
    });
  });
});

// ============================================================
// 4. Fragment 边界
// ============================================================

describe('Fragment 边界', () => {
  it('空 Fragment 应有 ARRAY_CHILDREN flag', () => {
    const frag = createVNode(Fragment, null, []);
    expect(frag.type).toBe(Fragment);
    expect(frag.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy();
  });

  it('Fragment 包含文本节点应正常处理', () => {
    const textNode = createTextVNode('hello');
    const frag = createVNode(Fragment, null, [textNode]);
    expect(frag.type).toBe(Fragment);
    const children = getFragmentChildren(frag);
    expect(children.length).toBe(1);
    expect(children[0]).toBe(textNode);
  });

  it('Fragment 包含元素节点应正常处理', () => {
    const elem = createVNode('div', null, 'content');
    const frag = createVNode(Fragment, null, [elem]);
    const children = getFragmentChildren(frag);
    expect(children.length).toBe(1);
    expect(children[0]).toBe(elem);
  });

  it('嵌套 Fragment 应被 getFragmentChildren 扁平化', () => {
    const innerChild = createVNode('span', null, 'deep');
    const innerFrag = createFragment([innerChild]);
    const outerFrag = createFragment([
      createVNode('div', null, 'a'),
      innerFrag,
      createVNode('div', null, 'b'),
    ]);
    const children = getFragmentChildren(outerFrag);
    // 扁平化后应包含 3 个节点（内层 Fragment 被展开）
    expect(children.length).toBe(3);
  });

  it('getFragmentChildren 对非 Fragment 应返回空数组', () => {
    const div = createVNode('div', null, 'text');
    expect(getFragmentChildren(div)).toEqual([]);
  });

  it('getFragmentChildCount 对空 Fragment 应返回 0', () => {
    const frag = createVNode(Fragment, null, []);
    expect(getFragmentChildCount(frag)).toBe(0);
  });

  it('getFragmentChildCount 对非 Fragment 应返回 0', () => {
    const div = createVNode('div');
    expect(getFragmentChildCount(div)).toBe(0);
  });

  it('getFragmentChildCount 应正确计算扁平化后的子节点数', () => {
    const innerFrag = createFragment([
      createVNode('span'),
      createVNode('span'),
    ]);
    const outerFrag = createFragment([
      createVNode('div'),
      innerFrag,
    ]);
    expect(getFragmentChildCount(outerFrag)).toBe(3);
  });

  it('createFragment 应创建带扁平化 children 的 Fragment', () => {
    const innerFrag = createFragment([createVNode('span')]);
    const frag = createFragment([createVNode('div'), innerFrag]);
    expect(frag.type).toBe(Fragment);
    expect(getFragmentChildCount(frag)).toBe(2);
  });

  it('isFragmentVNode 应正确识别 Fragment', () => {
    const frag = createVNode(Fragment, null, []);
    const div = createVNode('div');
    expect(isFragmentVNode(frag)).toBe(true);
    expect(isFragmentVNode(div)).toBe(false);
  });
});

// ============================================================
// 5. Block Tree 边界
// ============================================================

describe('Block Tree 边界', () => {
  beforeEach(() => {
    resetBlockStack();
  });

  describe('openBlock/closeBlock 嵌套', () => {
    it('多层嵌套 openBlock/closeBlock 应正确恢复', () => {
      openBlock(); // depth 1
      openBlock(); // depth 2
      openBlock(); // depth 3
      expect(getBlockStackDepth()).toBe(3);

      closeBlock(); // back to 2
      expect(getBlockStackDepth()).toBe(2);

      closeBlock(); // back to 1
      expect(getBlockStackDepth()).toBe(1);

      closeBlock(); // back to 0
      expect(getBlockStackDepth()).toBe(0);
    });

    it('嵌套 block 的 dynamicChildren 应各自独立', () => {
      openBlock(); // outer
      const outerVNode = createVNode('div');
      trackDynamicChild(outerVNode);

      openBlock(); // inner
      const innerVNode = createVNode('span');
      trackDynamicChild(innerVNode);

      const innerBlock = closeBlock();
      expect(innerBlock).toEqual([innerVNode]);

      const outerBlock = closeBlock();
      expect(outerBlock).toEqual([outerVNode]);
    });

    it('无 openBlock 直接 closeBlock 应返回 null', () => {
      expect(closeBlock()).toBeNull();
    });

    it('closeBlock 后再 closeBlock 应返回 null', () => {
      openBlock();
      closeBlock();
      expect(closeBlock()).toBeNull();
    });
  });

  describe('createBlock 与 createVNode 区别', () => {
    it('createBlock 应设置 dynamicChildren（至少为空数组）', () => {
      openBlock();
      const block = createBlock('div', null, null, 0);
      expect(isBlock(block)).toBe(true);
      expect(Array.isArray(block.dynamicChildren)).toBe(true);
    });

    it('createVNode 的 dynamicChildren 默认为 null', () => {
      const vnode = createVNode('div');
      expect(vnode.dynamicChildren).toBeNull();
      expect(isBlock(vnode)).toBe(false);
    });

    it('createBlock 应设置 isBlockTree 为 true', () => {
      openBlock();
      const block = createBlock('div');
      expect(block.isBlockTree).toBe(true);
    });

    it('createBlock 应将自身注册到外层 block', () => {
      openBlock(); // outer
      openBlock(); // inner (createBlock will close this)
      const innerBlock = createBlock('div', null, null, 0);
      expect(getCurrentBlock()).toEqual([innerBlock]);
    });

    it('createBlock 无外层 block 时不注册', () => {
      openBlock();
      const block = createBlock('div', null, null, 0);
      expect(getCurrentBlock()).toBeNull();
    });
  });

  describe('trackDynamicChild 追踪', () => {
    it('同一 vnode 多次追踪应去重', () => {
      openBlock();
      const vnode = createVNode('span');
      trackDynamicChild(vnode);
      trackDynamicChild(vnode);
      trackDynamicChild(vnode);
      expect(getCurrentBlock()).toEqual([vnode]);
    });

    it('无 block 上下文时追踪应不报错', () => {
      const vnode = createVNode('span');
      expect(() => trackDynamicChild(vnode)).not.toThrow();
    });

    it('不同 vnode 应按顺序追踪', () => {
      openBlock();
      const v1 = createVNode('span');
      const v2 = createVNode('div');
      const v3 = createVNode('p');
      trackDynamicChild(v1);
      trackDynamicChild(v2);
      trackDynamicChild(v3);
      expect(getCurrentBlock()).toEqual([v1, v2, v3]);
    });
  });

  describe('resetBlockStack 清理', () => {
    it('resetBlockStack 应清理所有状态', () => {
      openBlock();
      openBlock();
      openBlock();
      trackDynamicChild(createVNode('div'));

      resetBlockStack();

      expect(getBlockStackDepth()).toBe(0);
      expect(getCurrentBlock()).toBeNull();
    });

    it('resetBlockStack 后应能正常使用 block', () => {
      openBlock();
      resetBlockStack();

      openBlock();
      expect(getBlockStackDepth()).toBe(1);
      const vnode = createVNode('span');
      trackDynamicChild(vnode);
      expect(getCurrentBlock()).toEqual([vnode]);
    });
  });
});

// ============================================================
// 6. VNode 池化边界
// ============================================================

describe('VNode 池化边界', () => {
  beforeEach(() => {
    resetVNodePoolStats();
  });

  it('getVNodePoolStats 应返回正确的初始状态', () => {
    const stats = getVNodePoolStats();
    expect(stats.hit).toBe(0);
    expect(stats.miss).toBe(0);
    expect(stats.size).toBeGreaterThanOrEqual(0);
  });

  it('resetVNodePoolStats 应重置计数器', () => {
    // 创建一些 vnode 以产生 miss 计数
    createVNode('div');
    createVNode('span');

    resetVNodePoolStats();

    const stats = getVNodePoolStats();
    expect(stats.hit).toBe(0);
    expect(stats.miss).toBe(0);
  });

  it('releaseVNode 应将 vnode 归还到池中', () => {
    const vnode = createVNode('div', { id: 'test' }, 'hello');
    releaseVNode(vnode);

    const stats = getVNodePoolStats();
    expect(stats.size).toBeGreaterThanOrEqual(1);
  });

  it('releaseVNode 后 vnode 的属性应被清空', () => {
    const vnode = createVNode('div', { id: 'test' }, 'hello');
    releaseVNode(vnode);
    expect(vnode.type).toBeNull();
    expect(vnode.props).toBeNull();
    expect(vnode.key).toBeNull();
    expect(vnode.children).toBeNull();
    expect(vnode.shapeFlag).toBe(0);
    expect(vnode.patchFlag).toBe(0);
  });

  it('池化容量上限应为 200', () => {
    // 归还超过 200 个 vnode
    for (let i = 0; i < 250; i++) {
      const vnode = createVNode('div');
      releaseVNode(vnode);
    }
    const stats = getVNodePoolStats();
    expect(stats.size).toBeLessThanOrEqual(200);
  });

  it('多次 releaseVNode 后 size 应正确增长', () => {
    const v1 = createVNode('div');
    const v2 = createVNode('span');
    const v3 = createVNode('p');

    releaseVNode(v1);
    expect(getVNodePoolStats().size).toBeGreaterThanOrEqual(1);

    releaseVNode(v2);
    expect(getVNodePoolStats().size).toBeGreaterThanOrEqual(2);

    releaseVNode(v3);
    expect(getVNodePoolStats().size).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================
// 7. 工具函数边界
// ============================================================

describe('工具函数边界', () => {
  describe('isStaticVNode / isDynamicVNode', () => {
    it('isStaticVNode 应识别 HOISTED vnode', () => {
      const vnode = createVNode('div', null, 'static', PatchFlags.HOISTED);
      expect(isStaticVNode(vnode)).toBe(true);
    });

    it('isStaticVNode 对非 HOISTED vnode 应返回 false', () => {
      const vnode = createVNode('div', null, 'text', PatchFlags.TEXT);
      expect(isStaticVNode(vnode)).toBe(false);
    });

    it('isStaticVNode 对无 flag vnode 应返回 false', () => {
      const vnode = createVNode('div');
      expect(isStaticVNode(vnode)).toBe(false);
    });

    it('isDynamicVNode 应识别有 patchFlag 的动态 vnode', () => {
      const vnode = createVNode('div', null, 'text', PatchFlags.TEXT);
      expect(isDynamicVNode(vnode)).toBe(true);
    });

    it('isDynamicVNode 对 HOISTED 应返回 false', () => {
      const vnode = createVNode('div', null, 'static', PatchFlags.HOISTED);
      expect(isDynamicVNode(vnode)).toBe(false);
    });

    it('isDynamicVNode 对 BAIL 应返回 false', () => {
      const vnode = createVNode('div', null, null, PatchFlags.BAIL);
      expect(isDynamicVNode(vnode)).toBe(false);
    });

    it('isDynamicVNode 对无 flag 应返回 false', () => {
      const vnode = createVNode('div');
      expect(isDynamicVNode(vnode)).toBe(false);
    });
  });

  describe('getVNodeText 各种类型', () => {
    it('字符串 children 应返回原字符串', () => {
      const vnode = createVNode('div', null, 'hello');
      expect(getVNodeText(vnode)).toBe('hello');
    });

    it('数字 children 应返回数字的字符串形式', () => {
      const vnode = createVNode('div', null, 42);
      expect(getVNodeText(vnode)).toBe('42');
    });

    it('null children 应返回空字符串', () => {
      const vnode = createVNode('div');
      expect(getVNodeText(vnode)).toBe('');
    });

    it('undefined children 应返回空字符串', () => {
      const vnode = createVNode('div', null, undefined);
      expect(getVNodeText(vnode)).toBe('');
    });

    it('数组 children 应返回空字符串', () => {
      const vnode = createVNode('div', null, [createVNode('span')]);
      expect(getVNodeText(vnode)).toBe('');
    });

    it('空字符串 children 应返回空字符串', () => {
      const vnode = createVNode('div', null, '');
      expect(getVNodeText(vnode)).toBe('');
    });
  });

  describe('hasDynamicChildren / collectDynamicChildren', () => {
    it('有 dynamicChildren 的 vnode 应返回 true', () => {
      const vnode = createVNode('div');
      vnode.dynamicChildren = [createVNode('span')];
      expect(hasDynamicChildren(vnode)).toBe(true);
    });

    it('dynamicChildren 为空数组时应返回 false', () => {
      const vnode = createVNode('div');
      vnode.dynamicChildren = [];
      expect(hasDynamicChildren(vnode)).toBe(false);
    });

    it('dynamicChildren 为 null 时应返回 false', () => {
      const vnode = createVNode('div');
      expect(hasDynamicChildren(vnode)).toBe(false);
    });

    it('collectDynamicChildren 应收集所有层级的动态子节点', () => {
      const leaf = createVNode('span');
      leaf.dynamicChildren = [];

      const mid = createVNode('div');
      mid.dynamicChildren = [leaf];

      const root = createVNode('section');
      root.dynamicChildren = [mid];

      const collected = collectDynamicChildren(root);
      expect(collected).toHaveLength(2);
      expect(collected).toContain(mid);
      expect(collected).toContain(leaf);
    });

    it('collectDynamicChildren 应去重（避免循环引用）', () => {
      const child = createVNode('span');
      const root = createVNode('div');
      root.dynamicChildren = [child, child]; // 同一引用出现两次
      const collected = collectDynamicChildren(root);
      expect(collected).toHaveLength(1);
    });

    it('collectDynamicChildren 无 dynamicChildren 应返回空数组', () => {
      const vnode = createVNode('div');
      expect(collectDynamicChildren(vnode)).toEqual([]);
    });
  });

  describe('hasArrayChildren / hasTextChildren / getArrayChildren', () => {
    it('hasArrayChildren 对数组 children 应返回 true', () => {
      const vnode = createVNode('div', null, [createVNode('span')]);
      expect(hasArrayChildren(vnode)).toBe(true);
    });

    it('hasArrayChildren 对文本 children 应返回 false', () => {
      const vnode = createVNode('div', null, 'text');
      expect(hasArrayChildren(vnode)).toBe(false);
    });

    it('hasTextChildren 对文本 children 应返回 true', () => {
      const vnode = createVNode('div', null, 'text');
      expect(hasTextChildren(vnode)).toBe(true);
    });

    it('hasTextChildren 对数组 children 应返回 false', () => {
      const vnode = createVNode('div', null, [createVNode('span')]);
      expect(hasTextChildren(vnode)).toBe(false);
    });

    it('getArrayChildren 对数组 children 应返回该数组', () => {
      const children = [createVNode('span'), createVNode('div')];
      const vnode = createVNode('div', null, children);
      expect(getArrayChildren(vnode)).toEqual(children);
    });

    it('getArrayChildren 对非数组 children 应返回空数组', () => {
      const vnode = createVNode('div', null, 'text');
      expect(getArrayChildren(vnode)).toEqual([]);
    });

    it('getArrayChildren 对 null children 应返回空数组', () => {
      const vnode = createVNode('div');
      expect(getArrayChildren(vnode)).toEqual([]);
    });
  });
});

// ============================================================
// 8. Diff 分析边界
// ============================================================

describe('Diff 分析边界', () => {
  describe('canUseFastDiff', () => {
    it('空数组应返回 true（长度相同且无类型不匹配）', () => {
      expect(canUseFastDiff([], [])).toBe(true);
    });

    it('不同长度应返回 false', () => {
      const c1 = [createVNode('div')];
      const c2 = [createVNode('div'), createVNode('span')];
      expect(canUseFastDiff(c1, c2)).toBe(false);
    });

    it('相同类型相同长度应返回 true', () => {
      const c1 = [createVNode('div'), createVNode('span')];
      const c2 = [createVNode('div'), createVNode('span')];
      expect(canUseFastDiff(c1, c2)).toBe(true);
    });

    it('不同类型应返回 false', () => {
      const c1 = [createVNode('div')];
      const c2 = [createVNode('span')];
      expect(canUseFastDiff(c1, c2)).toBe(false);
    });

    it('相同类型不同 key 应仍返回 true（canUseFastDiff 不检查 key）', () => {
      const c1 = [createVNode('div', { key: 'a' })];
      const c2 = [createVNode('div', { key: 'b' })];
      expect(canUseFastDiff(c1, c2)).toBe(true);
    });
  });

  describe('countNewNodes / countRemovedNodes', () => {
    it('countNewNodes 对相同列表应返回 0', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      expect(countNewNodes(c1, c2)).toBe(0);
    });

    it('countNewNodes 应正确统计新增节点', () => {
      const c1 = [createVNode('div', { key: 'a' })];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      expect(countNewNodes(c1, c2)).toBe(1);
    });

    it('countNewNodes 对无 key 节点应视为新增', () => {
      const c1 = [createVNode('div', { key: 'a' })];
      const c2 = [createVNode('div'), createVNode('span', { key: 'b' })];
      // 无 key 的 div 被视为新增，key: 'b' 也是新增
      expect(countNewNodes(c1, c2)).toBe(2);
    });

    it('countRemovedNodes 对相同列表应返回 0', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      expect(countRemovedNodes(c1, c2)).toBe(0);
    });

    it('countRemovedNodes 应正确统计删除节点', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      const c2 = [createVNode('div', { key: 'a' })];
      expect(countRemovedNodes(c1, c2)).toBe(1);
    });

    it('countRemovedNodes 对无 key 节点应视为删除', () => {
      const c1 = [createVNode('div'), createVNode('span', { key: 'b' })];
      const c2 = [createVNode('span', { key: 'b' })];
      // 无 key 的 div 被视为删除
      expect(countRemovedNodes(c1, c2)).toBe(1);
    });

    it('空列表到有节点应全部为新增', () => {
      const c1: VNode[] = [];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      expect(countNewNodes(c1, c2)).toBe(2);
      expect(countRemovedNodes(c1, c2)).toBe(0);
    });

    it('有节点到空列表应全部为删除', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      const c2: VNode[] = [];
      expect(countNewNodes(c1, c2)).toBe(0);
      expect(countRemovedNodes(c1, c2)).toBe(2);
    });
  });

  describe('allChildrenHaveKeys / noChildrenHaveKeys', () => {
    it('allChildrenHaveKeys 全部有 key 应返回 true', () => {
      const children = [
        createVNode('div', { key: 'a' }),
        createVNode('span', { key: 'b' }),
      ];
      expect(allChildrenHaveKeys(children)).toBe(true);
    });

    it('allChildrenHaveKeys 部分无 key 应返回 false', () => {
      const children = [
        createVNode('div', { key: 'a' }),
        createVNode('span'),
      ];
      expect(allChildrenHaveKeys(children)).toBe(false);
    });

    it('allChildrenHaveKeys 空数组应返回 false', () => {
      expect(allChildrenHaveKeys([])).toBe(false);
    });

    it('allChildrenHaveKeys 全部无 key 应返回 false', () => {
      const children = [createVNode('div'), createVNode('span')];
      expect(allChildrenHaveKeys(children)).toBe(false);
    });

    it('noChildrenHaveKeys 全部无 key 应返回 true', () => {
      const children = [createVNode('div'), createVNode('span')];
      expect(noChildrenHaveKeys(children)).toBe(true);
    });

    it('noChildrenHaveKeys 空数组应返回 true', () => {
      expect(noChildrenHaveKeys([])).toBe(true);
    });

    it('noChildrenHaveKeys 部分有 key 应返回 false', () => {
      const children = [
        createVNode('div', { key: 'a' }),
        createVNode('span'),
      ];
      expect(noChildrenHaveKeys(children)).toBe(false);
    });

    it('noChildrenHaveKeys 全部有 key 应返回 false', () => {
      const children = [
        createVNode('div', { key: 'a' }),
        createVNode('span', { key: 'b' }),
      ];
      expect(noChildrenHaveKeys(children)).toBe(false);
    });
  });

  describe('analyzeDiff 各种场景', () => {
    it('相同列表应推荐 fast 策略', () => {
      const c1 = [createVNode('div'), createVNode('span')];
      const c2 = [createVNode('div'), createVNode('span')];
      const result = analyzeDiff(c1, c2);
      expect(result.recommendedStrategy).toBe('fast');
      expect(result.added).toBe(0);
      expect(result.removed).toBe(0);
    });

    it('全部有 key 的不同列表应推荐 keyed 策略', () => {
      const c1 = [createVNode('div', { key: 'a' })];
      const c2 = [createVNode('span', { key: 'b' })];
      const result = analyzeDiff(c1, c2);
      expect(result.recommendedStrategy).toBe('keyed');
    });

    it('全部无 key 的不同列表应推荐 unkeyed 策略', () => {
      const c1 = [createVNode('div')];
      const c2 = [createVNode('span')];
      const result = analyzeDiff(c1, c2);
      expect(result.recommendedStrategy).toBe('unkeyed');
    });

    it('混合 key 的情况应推荐 full 策略', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('span')];
      const c2 = [createVNode('div', { key: 'b' }), createVNode('p')];
      const result = analyzeDiff(c1, c2);
      expect(result.recommendedStrategy).toBe('full');
    });

    it('空列表到空列表应推荐 fast 策略', () => {
      const result = analyzeDiff([], []);
      expect(result.recommendedStrategy).toBe('fast');
      expect(result.added).toBe(0);
      expect(result.removed).toBe(0);
      expect(result.unchanged).toBe(0);
    });

    it('analyzeDiff 的 moved 应为非负数', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      const c2 = [createVNode('span', { key: 'b' }), createVNode('div', { key: 'a' })];
      const result = analyzeDiff(c1, c2);
      expect(result.moved).toBeGreaterThanOrEqual(0);
    });
  });
});
