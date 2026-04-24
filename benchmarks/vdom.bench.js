/**
 * Lyt.js VDOM Benchmark — 虚拟 DOM 基准测试
 *
 * 测试场景：
 * 1. VNode 创建性能（1000 / 10000 个节点）
 * 2. Diff 性能（1000 个节点的全量对比）
 * 3. 列表 Diff 性能（1000 项列表的增删改）
 *
 * 运行方式：
 *   node benchmarks/vdom.bench.js
 *
 * 纯原生零依赖实现，内联了 VDOM 系统的核心逻辑用于基准测试。
 */

'use strict';

const { BenchmarkSuite } = require('./runner');

// ============================================================
// 内联 VDOM 系统（从 @lyt/vdom 提取的核心逻辑）
// ============================================================

// ---- ShapeFlags ----

const ShapeFlags = {
  ELEMENT: 1,
  FUNCTIONAL_COMPONENT: 2,
  STATEFUL_COMPONENT: 4,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16,
  SLOTS_CHILDREN: 32,
};

// ---- PatchFlags ----

const PatchFlags = {
  TEXT: 1,
  CLASS: 2,
  STYLE: 4,
  PROPS: 8,
  FULL_PROPS: 16,
};

// ---- Fragment ----

const Fragment = Symbol('Fragment');

function isFragmentType(type) {
  return type === Fragment;
}

// ---- VNode 创建 ----

function normalizeChildren(vnode, children) {
  if (children == null) return;
  if (typeof children === 'string' || typeof children === 'number') {
    vnode.children = String(children);
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.children = children;
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  } else if (typeof children === 'object') {
    vnode.children = children;
    vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
  }
}

function createVNode(type, props, children) {
  if (props === undefined) props = null;
  if (children === undefined) children = null;

  let shapeFlag = 0;
  if (typeof type === 'string') {
    shapeFlag = ShapeFlags.ELEMENT;
  } else if (isFragmentType(type)) {
    shapeFlag = 0;
  } else if (typeof type === 'function') {
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT;
  } else if (typeof type === 'object' && type !== null) {
    if (type.setup || type.render) {
      shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
    }
  }

  const key = props?.key ?? null;
  const ref = props?.ref ?? null;

  let cleanProps = props;
  if (props) {
    const { key: _k, ref: _r, ...rest } = props;
    cleanProps = rest;
  }

  const vnode = {
    type,
    props: cleanProps,
    children: null,
    key,
    ref,
    shapeFlag,
    patchFlag: 0,
    dynamicChildren: null,
    dynamicProps: null,
    component: null,
    appContext: null,
    el: null,
    anchor: null,
  };

  if (children != null) {
    normalizeChildren(vnode, children);
  }

  return vnode;
}

function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}

// ---- h 函数 ----

function h(type, props, children) {
  return createVNode(type, props || null, children || null);
}

// ---- Patch（简化版，纯逻辑不含 DOM 操作） ----

/**
 * 简化版 patch：只计算 diff 结果，不操作 DOM。
 * 返回操作计数用于基准测试。
 */
function patchElement(oldVNode, newVNode) {
  let ops = 0;
  const oldProps = oldVNode.props || {};
  const newProps = newVNode.props || {};
  const patchFlag = newVNode.patchFlag;

  if (patchFlag > 0) {
    if (patchFlag & PatchFlags.TEXT) {
      if (oldVNode.children !== newVNode.children) ops++;
    }
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) ops++;
    }
    if (patchFlag & PatchFlags.STYLE) {
      if (oldProps.style !== newProps.style) ops++;
    }
    if (patchFlag & PatchFlags.PROPS) {
      if (newVNode.dynamicProps) {
        for (let i = 0; i < newVNode.dynamicProps.length; i++) {
          const key = newVNode.dynamicProps[i];
          if (oldProps[key] !== newProps[key]) ops++;
        }
      }
    }
  } else {
    // 全量 diff props
    for (const key in newProps) {
      if (oldProps[key] !== newProps[key]) ops++;
    }
    for (const key in oldProps) {
      if (!(key in newProps)) ops++;
    }
  }

  // 子节点 diff
  const oldChildren = oldVNode.children;
  const newChildren = newVNode.children;

  if (
    (oldVNode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) &&
    (newVNode.shapeFlag & ShapeFlags.ARRAY_CHILDREN)
  ) {
    ops += patchKeyedChildren(oldChildren, newChildren);
  }

  return ops;
}

// ---- 列表 Diff（五步比较 + LIS） ----

function patchKeyedChildren(oldChildren, newChildren) {
  let ops = 0;
  let i = 0;
  const oldLength = oldChildren.length;
  const newLength = newChildren.length;
  let oldEndIndex = oldLength - 1;
  let newEndIndex = newLength - 1;

  // Step 1: 从头同步
  while (i <= oldEndIndex && i <= newEndIndex) {
    if (isSameVNodeType(oldChildren[i], newChildren[i])) {
      ops++;
    } else {
      break;
    }
    i++;
  }

  // Step 2: 从尾同步
  while (i <= oldEndIndex && i <= newEndIndex) {
    if (isSameVNodeType(oldChildren[oldEndIndex], newChildren[newEndIndex])) {
      ops++;
    } else {
      break;
    }
    oldEndIndex--;
    newEndIndex--;
  }

  // Step 3: 挂载新节点
  if (i > oldEndIndex) {
    if (i <= newEndIndex) {
      ops += (newEndIndex - i + 1);
    }
  }
  // Step 4: 卸载旧节点
  else if (i > newEndIndex) {
    ops += (oldEndIndex - i + 1);
  }
  // Step 5: 未知子序列
  else {
    const newKeyToIndexMap = new Map();
    for (let j = i; j <= newEndIndex; j++) {
      const key = newChildren[j].key;
      if (key != null) {
        newKeyToIndexMap.set(key, j);
      }
    }

    let j;
    let patched = 0;
    let pos = 0;
    const toBePatched = newEndIndex - i + 1;
    let moved = false;

    const newIndexToOldIndexMap = new Array(toBePatched).fill(0);

    for (j = i; j <= oldEndIndex; j++) {
      const oldVNode = oldChildren[j];
      const oldKey = oldVNode.key;

      if (patched >= toBePatched) {
        ops++; // unmount
        continue;
      }

      const newIndex = oldKey != null ? newKeyToIndexMap.get(oldKey) : undefined;

      if (newIndex === undefined) {
        ops++; // unmount
      } else {
        newIndexToOldIndexMap[newIndex - i] = j + 1;
        if (newIndex >= pos) {
          pos = newIndex + 1;
        } else {
          moved = true;
        }
        ops++; // patch
        patched++;
      }
    }

    if (moved) {
      getSequence(newIndexToOldIndexMap);
    }

    for (let k = toBePatched - 1; k >= 0; k--) {
      const newIndex = i + k;
      if (newIndexToOldIndexMap[k] === 0) {
        ops++; // mount
      }
    }
  }

  return ops;
}

// ---- LIS ----

function getSequence(arr) {
  const len = arr.length;
  if (len === 0) return [];

  const tails = [];
  const parent = new Array(len).fill(-1);

  for (let i = 0; i < len; i++) {
    const val = arr[i];
    if (val === 0) continue;

    let left = 0;
    let right = tails.length;
    while (left < right) {
      const mid = (left + right) >> 1;
      if (arr[tails[mid]] < val) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    if (left > 0) {
      parent[i] = tails[left - 1];
    }

    if (left === tails.length) {
      tails.push(i);
    } else {
      tails[left] = i;
    }
  }

  const result = [];
  let current = tails[tails.length - 1];
  while (current !== -1) {
    result.push(current);
    current = parent[current];
  }
  result.reverse();
  return result;
}

// ============================================================
// 基准测试
// ============================================================

const suite = new BenchmarkSuite('Lyt.js VDOM');

// ---- 1. VNode 创建性能 ----

suite.addTest('VNode 创建 (1000 个节点)', () => {
  for (let i = 0; i < 1000; i++) {
    createVNode('div', { class: 'item', key: i }, [
      createVNode('span', null, `Item ${i}`),
    ]);
  }
});

suite.addTest('VNode 创建 (10000 个节点)', () => {
  for (let i = 0; i < 10000; i++) {
    createVNode('div', { class: 'item', key: i }, `Item ${i}`);
  }
});

suite.addTest('h() 函数调用 (1000 次)', () => {
  for (let i = 0; i < 1000; i++) {
    h('div', { class: 'item', key: i }, [
      h('span', null, `Item ${i}`),
    ]);
  }
});

// ---- 2. Diff 性能（全量对比） ----

suite.addTest('Diff 全量对比 (1000 节点, 无变化)', () => {
  const oldChildren = [];
  const newChildren = [];
  for (let i = 0; i < 1000; i++) {
    const vnode = createVNode('div', { class: 'item', key: i }, `Item ${i}`);
    oldChildren.push(vnode);
    newChildren.push(createVNode('div', { class: 'item', key: i }, `Item ${i}`));
  }
  patchKeyedChildren(oldChildren, newChildren);
});

suite.addTest('Diff 全量对比 (1000 节点, 全部变化)', () => {
  const oldChildren = [];
  const newChildren = [];
  for (let i = 0; i < 1000; i++) {
    oldChildren.push(createVNode('div', { class: 'item', key: i }, `Old ${i}`));
    newChildren.push(createVNode('div', { class: 'item', key: i }, `New ${i}`));
  }
  patchKeyedChildren(oldChildren, newChildren);
});

// ---- 3. 列表 Diff 性能（增删改） ----

suite.addTest('列表 Diff (1000 项, 头部插入 1 项)', () => {
  const oldChildren = [];
  for (let i = 0; i < 1000; i++) {
    oldChildren.push(createVNode('div', { key: i }, `Item ${i}`));
  }
  const newChildren = [
    createVNode('div', { key: -1 }, 'New Item'),
    ...oldChildren,
  ];
  patchKeyedChildren(oldChildren, newChildren);
});

suite.addTest('列表 Diff (1000 项, 尾部插入 1 项)', () => {
  const oldChildren = [];
  for (let i = 0; i < 1000; i++) {
    oldChildren.push(createVNode('div', { key: i }, `Item ${i}`));
  }
  const newChildren = [
    ...oldChildren,
    createVNode('div', { key: 1000 }, 'New Item'),
  ];
  patchKeyedChildren(oldChildren, newChildren);
});

suite.addTest('列表 Diff (1000 项, 中间删除 1 项)', () => {
  const oldChildren = [];
  for (let i = 0; i < 1000; i++) {
    oldChildren.push(createVNode('div', { key: i }, `Item ${i}`));
  }
  const newChildren = oldChildren.filter((_, idx) => idx !== 500);
  patchKeyedChildren(oldChildren, newChildren);
});

suite.addTest('列表 Diff (1000 项, 反转顺序)', () => {
  const oldChildren = [];
  for (let i = 0; i < 1000; i++) {
    oldChildren.push(createVNode('div', { key: i }, `Item ${i}`));
  }
  const newChildren = [...oldChildren].reverse();
  patchKeyedChildren(oldChildren, newChildren);
});

suite.addTest('列表 Diff (1000 项, 乱序洗牌)', () => {
  const oldChildren = [];
  for (let i = 0; i < 1000; i++) {
    oldChildren.push(createVNode('div', { key: i }, `Item ${i}`));
  }
  // Fisher-Yates 洗牌
  const newChildren = [...oldChildren];
  for (let i = newChildren.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newChildren[i], newChildren[j]] = [newChildren[j], newChildren[i]];
  }
  patchKeyedChildren(oldChildren, newChildren);
});

// ---- 4. PatchFlag 精确更新 ----

suite.addTest('PatchFlag TEXT 精确更新', () => {
  const oldVNode = createVNode('div', null, 'old text');
  oldVNode.patchFlag = PatchFlags.TEXT;
  const newVNode = createVNode('div', null, 'new text');
  newVNode.patchFlag = PatchFlags.TEXT;
  patchElement(oldVNode, newVNode);
});

suite.addTest('PatchFlag CLASS 精确更新', () => {
  const oldVNode = createVNode('div', { class: 'old' }, null);
  oldVNode.patchFlag = PatchFlags.CLASS;
  const newVNode = createVNode('div', { class: 'new' }, null);
  newVNode.patchFlag = PatchFlags.CLASS;
  patchElement(oldVNode, newVNode);
});

// ---- 运行 ----

const iterations = parseInt(process.argv[2], 10) || 1000;
suite.run(iterations);
