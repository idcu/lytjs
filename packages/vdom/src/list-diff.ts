/**
 * @lytjs/vdom - list-diff
 * 高性能列表 Diff 算法模块
 *
 * 通过 DOM 操作注册模式实现 diff 计算与平台操作的解耦。
 * 包含快速路径优化、Int32Array 索引映射、内联 sameVNodeType 等性能优化。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { getSequence } from '@lytjs/common-algorithm';

// ============================================================
// Types
// ============================================================

/**
 * DOM 操作函数集合。
 * diff 算法通过此接口与平台操作解耦，具体实现由渲染器在初始化时注入。
 */
export interface DOMOperations {
  /** 插入节点到容器中指定锚点前 */
  insert(child: VNode, container: any, anchor: any): void;
  /** 创建元素节点 */
  createElement(type: string): any;
  /** 挂载 VNode 到容器 */
  mount(vnode: VNode, container: any, anchor: any): void;
  /** 对比更新两个 VNode */
  patch(
    n1: VNode | null,
    n2: VNode,
    container: any,
    anchor: any,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: any,
    isSVG: boolean,
  ): void;
  /** 卸载 VNode */
  unmount(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: any,
    doRemove: boolean,
  ): void;
  /** 移动 VNode 到新位置 */
  move(
    vnode: VNode,
    container: any,
    anchor: any,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: any,
  ): void;
}

// ============================================================
// DOM Operations Registration
// ============================================================

/** 模块级 DOM 操作实例，由渲染器初始化时注入 */
let registeredDOMOps: DOMOperations | null = null;

/**
 * 注册 DOM 操作实现。
 * 应在渲染器初始化时调用一次，将平台相关的 DOM 操作注入到 diff 模块中。
 */
export function registerDOMOperations(ops: DOMOperations): void {
  if (!ops) {
    throw new Error(
      '[lytjs/list-diff] registerDOMOperations requires a valid DOMOperations object',
    );
  }
  registeredDOMOps = ops;
}

/**
 * 获取已注册的 DOM 操作实例。
 */
function getDOMOps(): DOMOperations {
  const ops = registeredDOMOps;
  if (!ops) {
    throw new Error(
      '[lytjs/list-diff] DOMOperations not registered. ' +
        'Call registerDOMOperations() before using diff functions.',
    );
  }
  return ops;
}

// ============================================================
// Inline sameVNodeType
// ============================================================

/**
 * 内联的 VNode 类型比较函数。
 * 在 diff 热路径中使用，避免外部函数调用开销。
 */
function sameVNodeType(a: VNode, b: VNode): boolean {
  return a.type === b.type && a.key === b.key;
}

// ============================================================
// patchKeyedChildren — 带 key 的子节点 diff（核心）
// ============================================================

/**
 * 带 key 的子节点 diff 算法。
 *
 * 执行流程：
 * 1. 快速路径：长度相同 && 所有节点类型匹配 → 逐个 patch，跳过完整 diff
 * 2. 同步前缀：从前往后匹配相同类型节点
 * 3. 同步后缀：从后往前匹配相同类型节点
 * 4. 新增挂载 / 旧节点卸载
 * 5. 未知子序列：key 映射 + LIS 最小移动
 */
export function patchKeyedChildren(
  c1: VNode[],
  c2: VNode[],
  container: any,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: any,
  isSVG: boolean,
  fallbackAnchor: any = null,
): void {
  const ops = getDOMOps();
  let i = 0;
  const l2 = c2.length;
  let e1 = c1.length - 1;
  let e2 = l2 - 1;

  // ----------------------------------------------------------
  // 快速路径（Fast Path）
  // ----------------------------------------------------------
  const oldLength = c1.length;
  const newLength = c2.length;
  if (oldLength === newLength && oldLength > 0) {
    let fastPathMatch = true;
    for (let fi = 0; fi < oldLength; fi++) {
      if (!sameVNodeType(c1[fi]!, c2[fi]!)) {
        fastPathMatch = false;
        break;
      }
    }
    if (fastPathMatch) {
      for (let fi = 0; fi < oldLength; fi++) {
        ops.patch(c1[fi]!, c2[fi]!, container, null, parentComponent, parentSuspense, isSVG);
      }
      return;
    }
  }

  // ----------------------------------------------------------
  // 1. 同步前缀（Sync from start）
  // ----------------------------------------------------------
  while (i <= e1 && i <= e2) {
    const n1 = c1[i]!;
    const n2 = c2[i]!;
    if (sameVNodeType(n1, n2)) {
      ops.patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG);
    } else {
      break;
    }
    i++;
  }

  // ----------------------------------------------------------
  // 2. 同步后缀（Sync from end）
  // ----------------------------------------------------------
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1]!;
    const n2 = c2[e2]!;
    if (sameVNodeType(n1, n2)) {
      ops.patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG);
    } else {
      break;
    }
    e1--;
    e2--;
  }

  // ----------------------------------------------------------
  // 3. 同步公共序列 + 挂载新节点
  // ----------------------------------------------------------
  if (i > e1) {
    if (i <= e2) {
      const nextPos = e2 + 1;
      const nextEl = nextPos < l2 ? c2[nextPos]?.el : null;
      const anchor = nextEl ?? fallbackAnchor;
      while (i <= e2) {
        ops.patch(null, c2[i]!, container, anchor, parentComponent, parentSuspense, isSVG);
        i++;
      }
    }
  }
  // ----------------------------------------------------------
  // 4. 同步公共序列 + 卸载旧节点
  // ----------------------------------------------------------
  else if (i > e2) {
    while (i <= e1) {
      ops.unmount(c1[i]!, parentComponent, parentSuspense, true);
      i++;
    }
  }
  // ----------------------------------------------------------
  // 5. 未知子序列 — key 映射 + LIS 最小移动
  // ----------------------------------------------------------
  else {
    const s1 = i;
    const s2 = i;

    // 5.1 构建 key -> index 映射
    const newKeyToIndexMap = new Map<PropertyKey, number>();
    for (let j = s2; j <= e2; j++) {
      const key = c2[j]!.key;
      if (key !== null && key !== undefined) {
        newKeyToIndexMap.set(key, j);
      }
    }

    // 5.1b 构建 type -> index 映射（用于无 key 节点的 O(1) 查找）
    const newTypeMap = new Map<string, number[]>();
    for (let j = s2; j <= e2; j++) {
      const child = c2[j];
      if (child && !child.key) {
        const typeKey = String(child.type);
        if (!newTypeMap.has(typeKey)) newTypeMap.set(typeKey, []);
        newTypeMap.get(typeKey)!.push(j);
      }
    }

    let j: number;
    let patched = 0;
    const toBePatched = e2 - s2 + 1;
    let moved = false;
    let maxNewIndexSoFar = 0;

    // 使用 Int32Array 替代普通数组，减少 GC 压力
    const newIndexToOldIndexMap = new Int32Array(toBePatched);

    // 5.2 遍历旧节点，复用或卸载
    for (i = s1; i <= e1; i++) {
      const prevChild = c1[i]!;
      if (patched >= toBePatched) {
        ops.unmount(prevChild, parentComponent, parentSuspense, true);
        continue;
      }

      let newIndex: number | undefined;
      if (prevChild.key !== null && prevChild.key !== undefined) {
        newIndex = newKeyToIndexMap.get(prevChild.key);
      } else {
        // 无 key 节点：使用 type 映射做 O(1) 查找
        const typeKey = String(prevChild.type);
        const candidates = newTypeMap.get(typeKey);
        if (candidates) {
          for (const candidateIdx of candidates) {
            if (
              newIndexToOldIndexMap[candidateIdx - s2] === 0 &&
              sameVNodeType(prevChild, c2[candidateIdx]!)
            ) {
              newIndex = candidateIdx;
              break;
            }
          }
        }
      }

      if (newIndex === undefined) {
        ops.unmount(prevChild, parentComponent, parentSuspense, true);
      } else {
        newIndexToOldIndexMap[newIndex - s2] = i + 1;
        if (newIndex >= maxNewIndexSoFar) {
          maxNewIndexSoFar = newIndex;
        } else {
          moved = true;
        }
        ops.patch(
          prevChild,
          c2[newIndex]!,
          container,
          null,
          parentComponent,
          parentSuspense,
          isSVG,
        );
        patched++;
      }
    }

    // 5.3 仅在发生移动时计算 LIS
    // getSequence 接受普通数组，需要从 Int32Array 转换
    const increasingNewIndexSequence = moved
      ? getSequence(Array.from(newIndexToOldIndexMap))
      : [];

    j = increasingNewIndexSequence.length - 1;

    // 5.4 从后往前遍历，移动或挂载
    for (i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = s2 + i;
      const nextChild = c2[nextIndex]!;
      const nextEl = nextIndex + 1 < l2 ? c2[nextIndex + 1]?.el : null;
      const anchor = nextEl ?? fallbackAnchor;

      if (newIndexToOldIndexMap[i] === 0) {
        // 新节点，需要挂载
        ops.patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (moved) {
        if (j < 0 || i !== increasingNewIndexSequence[j]!) {
          // 不在 LIS 中，需要移动
          if (nextChild.el) {
            ops.move(nextChild, container, anchor, parentComponent, parentSuspense);
          }
        } else {
          j--;
        }
      }
    }
  }
}

// ============================================================
// patchUnkeyedChildren — 不带 key 的子节点 diff
// ============================================================

/**
 * 不带 key 的子节点 diff 算法。
 * 从前往后逐个比较，类型匹配则 patch，不匹配则卸载旧节点并挂载新节点。
 */
export function patchUnkeyedChildren(
  c1: VNode[],
  c2: VNode[],
  container: any,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: any,
  isSVG: boolean,
  fallbackAnchor: any = null,
): void {
  const ops = getDOMOps();
  const l1 = c1.length;
  const l2 = c2.length;
  const commonLength = Math.min(l1, l2);

  // 同步公共前缀
  for (let i = 0; i < commonLength; i++) {
    if (sameVNodeType(c1[i]!, c2[i]!)) {
      ops.patch(c1[i]!, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
    } else {
      ops.unmount(c1[i]!, parentComponent, parentSuspense, true);
      ops.patch(null, c2[i]!, container, null, parentComponent, parentSuspense, isSVG);
    }
  }

  // 挂载剩余新节点
  if (l2 > l1) {
    for (let i = commonLength; i < l2; i++) {
      ops.patch(null, c2[i]!, container, fallbackAnchor, parentComponent, parentSuspense, isSVG);
    }
  }
  // 卸载剩余旧节点
  else if (l1 > l2) {
    for (let i = commonLength; i < l1; i++) {
      ops.unmount(c1[i]!, parentComponent, parentSuspense, true);
    }
  }
}
