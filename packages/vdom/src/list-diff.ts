/**
 * @lytjs/vdom - list-diff
 * 高性能列表 Diff 算法模块
 *
 * 通过 DOM 操作注册模式实现 diff 计算与平台操作的解耦。
 * 包含快速路径优化、Int32Array 索引映射、内联 sameVNodeType 等性能优化。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import type { RendererHost } from '@lytjs/host-contract';
import { getSequence } from '@lytjs/common-algorithm';
import { warn } from '@lytjs/common-error';

// ============================================================
// Types
// ============================================================

/**
 * DOM 操作函数集合。
 * diff 算法通过此接口与平台操作解耦，具体实现由渲染器在初始化时注入。
 *
 * @deprecated Use RendererHost from @lytjs/host-contract instead.
 * This interface is kept for backward compatibility only.
 */
export interface DOMOperations<HostNodeType = unknown, SuspenseType = unknown> {
  /** 插入节点到容器中指定锚点前 */
  insert(child: VNode, container: HostNodeType, anchor: HostNodeType): void;
  /** 创建元素节点 */
  createElement(type: string): HostNodeType;
  /** 挂载 VNode 到容器 */
  mount(vnode: VNode, container: HostNodeType, anchor: HostNodeType): void;
  /** 对比更新两个 VNode */
  patch(
    n1: VNode | null,
    n2: VNode,
    container: HostNodeType,
    anchor: HostNodeType,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseType,
    isSVG: boolean,
  ): void;
  /** 卸载 VNode */
  unmount(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseType,
    doRemove: boolean,
  ): void;
  /** 移动 VNode 到新位置 */
  move(
    vnode: VNode,
    container: HostNodeType,
    anchor: HostNodeType,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseType,
  ): void;
}

// ============================================================
// DOM Operations Registration
// ============================================================

/** 模块级 DOM 操作实例映射，由渲染器初始化时注入。FIX: P0-04 使用 Map<symbol, DOMOperations> 替代单例，支持多渲染器场景 */
const registeredDOMOpsMap = new Map<symbol, DOMOperations<unknown, unknown>>();

// FIX: P2-19 删除冗余 __DEV__ 局部声明（env.d.ts 已全局声明）

/** FIX: P2-10 长列表性能保护阈值 */
const MAX_LIST_DIFF_SIZE = 1000;

/**
 * 注册 DOM 操作实现。
 * 应在渲染器初始化时调用一次，将平台相关的 DOM 操作注入到 diff 模块中。
 * FIX: P0-04 返回 symbol ID，支持多渲染器场景下的隔离注册
 *
 * @deprecated Use RendererHost from @lytjs/host-contract instead.
 * This function is kept for backward compatibility only.
 */
export function registerDOMOperations<HostNodeType = unknown, SuspenseType = unknown>(
  ops: DOMOperations<HostNodeType, SuspenseType>,
): symbol {
  if (!ops) {
    throw new Error(
      '[lytjs/list-diff] registerDOMOperations requires a valid DOMOperations object',
    );
  }
  const id = Symbol('DOMOperations');
  registeredDOMOpsMap.set(id, ops);
  return id;
}

/**
 * 获取已注册的 DOM 操作实例。
 * FIX: P0-04 接受 opsId 参数以支持多渲染器场景
 */
function getDOMOps(opsId?: symbol): DOMOperations {
  let ops: DOMOperations | undefined;
  if (opsId !== undefined) {
    ops = registeredDOMOpsMap.get(opsId);
  } else {
    // 向后兼容：未传 opsId 时使用最后一个注册的实例
    // FIX: P2-8 DEV 模式下发出警告，提醒开发者显式传递 opsId
    if (__DEV__) {
      warn(
        '[lytjs/list-diff] getDOMOps() called without opsId. ' +
          'This is deprecated and may cause issues in multi-renderer scenarios. ' +
          'Please pass an explicit opsId.',
      );
    }
    const entries = Array.from(registeredDOMOpsMap.values());
    ops = entries[entries.length - 1];
  }
  if (!ops) {
    throw new Error(
      '[lytjs/list-diff] DOMOperations not registered. ' +
        'Call registerDOMOperations() before using diff functions.',
    );
  }
  return ops;
}

// ============================================================
// Internal: resolve operations from host or registered ops
// ============================================================

/**
 * Internal operations interface that both RendererHost and DOMOperations satisfy.
 */
interface ResolvedOps {
  patch(
    n1: VNode | null,
    n2: VNode,
    container: unknown,
    anchor: unknown,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: unknown,
    isSVG: boolean,
  ): void;
  unmount(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: unknown,
    doRemove: boolean,
  ): void;
  move(
    vnode: VNode,
    container: unknown,
    anchor: unknown,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: unknown,
  ): void;
}

/**
 * Wrap a RendererHost into the ResolvedOps interface for use by diff functions.
 */
function hostToOps<HN, HE extends HN>(
  _host: RendererHost<HN, HE>,
  patchFn: (
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: unknown,
    isSVG: boolean,
  ) => void,
  unmountFn: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: unknown,
    doRemove: boolean,
  ) => void,
  moveFn: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: unknown,
  ) => void,
): ResolvedOps {
  return {
    patch: (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG) =>
      patchFn(n1, n2, container as HN, anchor as HN | null, parentComponent, parentSuspense, isSVG),
    unmount: (vnode, parentComponent, parentSuspense, doRemove) =>
      unmountFn(vnode, parentComponent, parentSuspense, doRemove),
    move: (vnode, container, anchor, parentComponent, parentSuspense) =>
      moveFn(vnode, container as HN, anchor as HN | null, parentComponent, parentSuspense),
  };
}

/**
 * Wrap registered DOMOperations into the ResolvedOps interface.
 */
function domOpsToResolved(ops: DOMOperations): ResolvedOps {
  return {
    patch: (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG) =>
      ops.patch(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG),
    unmount: (vnode, parentComponent, parentSuspense, doRemove) =>
      ops.unmount(vnode, parentComponent, parentSuspense, doRemove),
    move: (vnode, container, anchor, parentComponent, parentSuspense) =>
      ops.move(vnode, container, anchor, parentComponent, parentSuspense),
  };
}

// ============================================================
// Inline sameVNodeType
// ============================================================

/**
 * 内联的 VNode 类型比较函数。
 * 必须与 @lytjs/common-vnode 中的 isSameVNodeType 保持同步。
 * 使用 Object.is 替代 === 以正确处理 NaN 等边界情况。
 */
function sameVNodeType(a: VNode, b: VNode): boolean {
  return Object.is(a.type, b.type) && Object.is(a.key, b.key);
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
 *
 * @param host - Optional RendererHost for platform-agnostic operation.
 *               If provided, uses host methods; otherwise falls back to registered DOMOperations.
 */
export function patchKeyedChildren<HN, HE extends HN>(
  c1: VNode[],
  c2: VNode[],
  container: HN,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: unknown,
  isSVG: boolean,
  fallbackAnchor: HN | null,
  host: RendererHost<HN, HE>,
  opsId?: symbol,
): void;

/**
 * @deprecated Use the overload with RendererHost parameter instead.
 * Legacy signature using registered DOMOperations.
 */
export function patchKeyedChildren(
  c1: VNode[],
  c2: VNode[],
  container: unknown,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: unknown,
  isSVG: boolean,
  fallbackAnchor?: unknown,
): void;

export function patchKeyedChildren<HN, HE extends HN>(
  c1: VNode[],
  c2: VNode[],
  container: HN,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: unknown,
  isSVG: boolean,
  fallbackAnchor: HN | null | undefined,
  hostOrUndefined?: RendererHost<HN, HE>,
  opsId?: symbol,
): void {
  // FIX: P1-7 VDOM-NEW-06 - MAX_LIST_DIFF_SIZE 强制执行
  // 超过阈值时使用简单 diff 策略（全量卸载+挂载），避免复杂 LIS 算法导致性能问题
  const totalLength = c1.length + c2.length;
  if (totalLength > MAX_LIST_DIFF_SIZE) {
    if (__DEV__) {
      console.warn(
        `[lytjs/list-diff] 列表长度(${totalLength})超过阈值(${MAX_LIST_DIFF_SIZE})，` +
          `使用简单 diff 策略以避免性能问题。建议对大数据列表使用虚拟滚动。`,
      );
    }
    // FIX: P2-14 简化超过阈值时的 ops 解析逻辑。
    // 之前无论 hostOrUndefined 是否存在都通过 hostToOps 包装（冗余的间接层），
    // 现在直接使用 domOpsToResolved(getDOMOps(opsId))，因为简单策略
    // 只需要 patch/unmount 操作，不需要 host 的低级操作。
    const ops = domOpsToResolved(getDOMOps(opsId));
    // 卸载所有旧节点
    for (let i = 0; i < c1.length; i++) {
      ops.unmount(c1[i]!, parentComponent, parentSuspense, true);
    }
    // 挂载所有新节点
    for (let i = 0; i < c2.length; i++) {
      ops.patch(null, c2[i]!, container, fallbackAnchor ?? null, parentComponent, parentSuspense, isSVG);
    }
    return;
  }

  // Determine whether to use RendererHost or fallback to registered DOMOperations
  const useHost = hostOrUndefined !== undefined;
  const ops: ResolvedOps = useHost
    ? hostToOps(
        hostOrUndefined,
        // These patch/unmount/move functions are not available here directly;
        // we need to use the registered ops for the actual patch/unmount/move calls
        // since the host only provides low-level node operations.
        // The DOMOperations registered by createRenderer already wrap the host's
        // low-level operations into VNode-level patch/unmount/move.
        // So when a host is provided, we still rely on registeredDOMOps for VNode-level ops.
        (n1, n2, cont, anchor, pc, ps, svg) => getDOMOps(opsId).patch(n1, n2, cont, anchor, pc, ps, svg),
        (vnode, pc, ps, doRemove) => getDOMOps(opsId).unmount(vnode, pc, ps, doRemove),
        (vnode, cont, anchor, pc, ps) => getDOMOps(opsId).move(vnode, cont, anchor, pc, ps),
      )
    : domOpsToResolved(getDOMOps(opsId));

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
      // FIX: P2-21 添加防御性检查，避免数组索引越界时的非空断言崩溃
      const oldVNode = c1[fi];
      const newVNode = c2[fi];
      if (!oldVNode || !newVNode || !sameVNodeType(oldVNode, newVNode)) {
        fastPathMatch = false;
        break;
      }
    }
    if (fastPathMatch) {
      for (let fi = 0; fi < oldLength; fi++) {
        const nextIdx = fi + 1;
        const anchor = nextIdx < oldLength ? c2[nextIdx]?.el : null;
        // FIX: P2-21 防御性检查
        const oldV = c1[fi];
        const newV = c2[fi];
        if (!oldV || !newV) continue;
        ops.patch(
          oldV,
          newV,
          container,
          anchor ?? fallbackAnchor,
          parentComponent,
          parentSuspense,
          isSVG,
        );
      }
      return;
    }
  }

  // ----------------------------------------------------------
  // 1. 同步前缀（Sync from start）
  // ----------------------------------------------------------
  while (i <= e1 && i <= e2) {
    const n1 = c1[i];
    const n2 = c2[i];
    // FIX: P2-21 防御性检查
    if (!n1 || !n2 || !sameVNodeType(n1, n2)) {
      break;
    }
    ops.patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG);
    i++;
  }

  // ----------------------------------------------------------
  // 2. 同步后缀（Sync from end）
  // ----------------------------------------------------------
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1];
    const n2 = c2[e2];
    // FIX: P2-21 防御性检查
    if (!n1 || !n2 || !sameVNodeType(n1, n2)) {
      break;
    }
    ops.patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG);
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
      const prevChild = c1[i];
      // FIX: P2-21 防御性检查
      if (!prevChild) {
        continue;
      }
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
    const increasingNewIndexSequence = moved ? getSequence(Array.from(newIndexToOldIndexMap)) : [];

    j = increasingNewIndexSequence.length - 1;

    // 5.4 从后往前遍历，移动或挂载
    for (i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = s2 + i;
      const nextChild = c2[nextIndex];
      // FIX: P2-21 防御性检查
      if (!nextChild) continue;
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
 *
 * @param host - Optional RendererHost for platform-agnostic operation.
 *               If provided, uses host methods; otherwise falls back to registered DOMOperations.
 */
export function patchUnkeyedChildren<HN, HE extends HN>(
  c1: VNode[],
  c2: VNode[],
  container: HN,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: unknown,
  isSVG: boolean,
  fallbackAnchor: HN | null,
  host: RendererHost<HN, HE>,
  opsId?: symbol,
): void;

/**
 * @deprecated Use the overload with RendererHost parameter instead.
 * Legacy signature using registered DOMOperations.
 */
export function patchUnkeyedChildren(
  c1: VNode[],
  c2: VNode[],
  container: unknown,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: unknown,
  isSVG: boolean,
  fallbackAnchor?: unknown,
): void;

export function patchUnkeyedChildren<HN, HE extends HN>(
  c1: VNode[],
  c2: VNode[],
  container: HN,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: unknown,
  isSVG: boolean,
  fallbackAnchor: HN | null | undefined,
  hostOrUndefined?: RendererHost<HN, HE>,
  opsId?: symbol,
): void {
  const useHost = hostOrUndefined !== undefined;
  const ops: ResolvedOps = useHost
    ? hostToOps(
        hostOrUndefined,
        (n1, n2, cont, anchor, pc, ps, svg) => getDOMOps(opsId).patch(n1, n2, cont, anchor, pc, ps, svg),
        (vnode, pc, ps, doRemove) => getDOMOps(opsId).unmount(vnode, pc, ps, doRemove),
        (vnode, cont, anchor, pc, ps) => getDOMOps(opsId).move(vnode, cont, anchor, pc, ps),
      )
    : domOpsToResolved(getDOMOps(opsId));

  const l1 = c1.length;
  const l2 = c2.length;
  const commonLength = Math.min(l1, l2);

  // 同步公共前缀
  for (let i = 0; i < commonLength; i++) {
    // FIX: P2-21 防御性检查
    const oldV = c1[i];
    const newV = c2[i];
    if (!oldV || !newV) {
      if (oldV) ops.unmount(oldV, parentComponent, parentSuspense, true);
      if (newV) ops.patch(null, newV, container, null, parentComponent, parentSuspense, isSVG);
      continue;
    }
    if (sameVNodeType(oldV, newV)) {
      ops.patch(oldV, newV, container, null, parentComponent, parentSuspense, isSVG);
    } else {
      ops.unmount(oldV, parentComponent, parentSuspense, true);
      ops.patch(null, newV, container, null, parentComponent, parentSuspense, isSVG);
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
