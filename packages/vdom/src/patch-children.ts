/**
 * @lytjs/vdom - patch-children
 *
 * 子节点的 diff 和挂载/卸载逻辑。
 * 包含 patchChildren、patchBlockChildren、mountChildren、unmountChildren、
 * diffChildren、diffChildrenInternal 函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { ShapeFlags, isVNode } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';
import { patchKeyedChildren as listDiffPatchKeyedChildren } from './list-diff';
import { createTextVNode, cloneIfMounted } from './vnode';

// ============================================================
// normalizeVNode —— 数组子节点里的「非 VNode 值」规范化
// ============================================================

/**
 * 把数组 children 中**非 VNode 的值**（字符串 / 数字）就地转换为文本 VNode。
 *
 * ⚠️ 2026-09-28 修复：此前 `mountChildren` 直接对每个元素 `patch(null, child, …)`，
 * 而 `patch` 对「非 VNode 且非 null」的值**无任何分支命中**（`child.type` /
 * `child.shapeFlag` 均为 undefined），于是**静默丢弃**——
 * 实测 `h('div', null, ['hello'])` 渲染出空 div，而 `h('div', null, 'hello')` 正常
 * （后者走 `normalizeChildren` 的 `TEXT_CHILDREN` 分支）。
 *
 * 与 Vue 一致：在挂载 / diff 前对数组元素做规范化，并**写回原数组**，
 * 使后续 diff / unmount 见到的都是真实 VNode。
 * `null` / `undefined` / 布尔值保持原样（由各分支按既有语义跳过）。
 */
function normalizeVNodeChildren(children: unknown[]): void {
  // 写指针：把「有效子节点」就地前移，末尾截断 —— 即**真正移除**无效项。
  //
  // ⚠️ 2026-10-10（P0-3 修复的连带缺陷）：此前对 `null` / `undefined` / 布尔只是
  // `continue`（**跳过但保留在数组里**），于是数组仍带着空洞进入 keyed diff，
  // `patchKeyedChildren` 读 `c2[j].key` 直接抛 `TypeError: Cannot read properties of
  // null (reading 'key')`。
  // 触发者：`<b v-if="ok">` 为假时插槽产物是 `[null]`（v-if 无 v-else 的正常形态）。
  // 该缺陷此前被 Vapor 路径「每次清空 + 重新 mount」掩盖（mount 会跳过 null，
  // 永不进入 diff）；改为 patch 复用后立刻暴露。
  let write = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    // null / undefined / 布尔（v-if 为假时的产物）不产生任何节点 ⇒ 从数组中剔除
    if (child == null || typeof child === 'boolean') continue;
    if (isVNode(child)) {
      children[write++] = child;
      continue;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      children[write++] = createTextVNode(String(child));
      continue;
    }
    if (__DEV__) {
      warn(
        `normalizeVNodeChildren: child at index ${i} is of type "${typeof child}", ` +
          `which is not a valid VNode. Coercing to text via String().`,
      );
    }
    children[write++] = createTextVNode(String(child));
  }
  children.length = write;
}

// ============================================================
// Children patch 工厂
// ============================================================

export interface ChildrenPatchAPI<HN, _HE extends HN> {
  patchChildren: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchBlockChildren: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  mountChildren: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  unmountChildren: (
    children: VNode[],
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  diffChildren: (
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  diffChildrenInternal: (
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    fallbackAnchor: HN | null,
  ) => void;
}

/**
 * 创建 children 相关的 patch 函数集合。
 */
export function createChildrenPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): ChildrenPatchAPI<HN, HE> {
  const { setElementText, patch, unmount } = ctx;

  // ============================================================
  // patchBlockChildren — 已停用的快速路径（保留为安全别名）
  // ============================================================
  //
  // 注：原来的 `isStaticVNode` / `patchStaticVNode` 两个局部辅助函数
  //     只被这条快速路径使用，随快速路径一起删除（`utils.ts` 里另有一个
  //     同名的导出函数，与这里无关）。

  /**
   * Block Tree 快速路径 —— **已停用，保留为安全别名**（2026-11-02）
   *
   * ## 为什么停用
   *
   * 原实现按**索引**配对 `oldDynamicChildren[i]` / `newDynamicChildren[i]`，
   * 只 diff 动态子节点、跳过静态子树。它有两个维护不住的前提：
   *
   * 1. **位序稳定**：v-for 的每个列表项都是 block，会被收集进**外层** block，
   *    列表长度一变位序就变 ⇒ 索引配对错位 ⇒ 节点挂到错误的父节点。
   *    （实测：`<ul><li v-for>` 从空变非空后，li 跑到 ul 外面）
   *
   * 2. **被跳过的静态子节点仍持有有效 `el`**：实际不成立 —— 跳过就意味着新一代
   *    vnode 上的 `el` 仍是 null。下一次结构变化走全量 diff 时，`patch()` 见
   *    `n1.el === null` 会按「需要挂载」处理且不卸载旧节点 ⇒ **DOM 重复**。
   *    这个缺口还是递归的：静态子树内部的后代同样缺 `el`。
   *
   * 两个缺陷都在 8432 个用例 + 12 项门禁下存活，且触发形态极普通。
   * 优化收益没有任何门禁度量，而缺陷已两次击穿全部防线
   * ⇒ 按「正确性优先」停用。
   *
   * ## 现在它做什么
   *
   * 直接转全量 `patchChildren`。保留这个名字是为了：
   *   · 不破坏 `ChildrenPatchAPI` 的既有形状（`patch.ts` 会转挂它）；
   *   · 让任何**未来的**调用者即使调用它也是安全的 —— 不会再踩同一个坑。
   *
   * ⚠️ 不要再把它改回「只 diff dynamicChildren」。
   */
  function patchBlockChildren(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    patchChildren(n1, n2, container, parentComponent, parentSuspense, isSVG);
  }

  // ============================================================
  // patchChildren
  // ============================================================

  function patchChildren(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    const c1 = n1.children as VNode[] | string | null;
    const c2 = n2.children as VNode[] | string | null;
    const { shapeFlag: prevShapeFlag } = n1;
    const { shapeFlag: nextShapeFlag } = n2;

    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新 children 为文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 旧 children 为数组 - 全部卸载
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense);
      }
      // 始终设置新文本（上面的 unmountChildren 可能已清空 DOM）
      // FIX: P2-11 添加运行时类型检查，避免不安全的类型断言。
      // container 的实际类型为 HN，而 setElementText 期望 HE（HN 的子类型）。
      // 使用运行时检查确保 container 是元素类型，如果不是则跳过操作。
      if (container && typeof container === 'object' && 'nodeType' in container) {
        setElementText(container as HE, String(c2 ?? ''));
      } else if (__DEV__) {
        warn(
          `[lytjs/patch-children] setElementText called with invalid container: ${String(container)}`,
        );
      }
    } else {
      // 新 children 为数组（或 null）
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 旧 children 为文本 - 清空它
        // FIX: P2-11 添加运行时类型检查
        if (container && typeof container === 'object' && 'nodeType' in container) {
          setElementText(container as HE, '');
        }
      }

      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 新 children 里可能混有裸字符串 / 数字 —— diff 前必须先规范化
          // （否则与旧 VNode 做 isSameVNodeType 比较会全部不匹配而重建/丢弃）。
          normalizeVNodeChildren(c2 as unknown[]);
          // 两者都是数组 - diff
          diffChildren(
            c1 as VNode[],
            c2 as VNode[],
            container,
            parentComponent,
            parentSuspense,
            isSVG,
          );
        } else {
          // 新 children 为 null - 卸载所有旧 children
          unmountChildren(c1 as VNode[], parentComponent, parentSuspense);
        }
      } else if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 旧 children 为 null/无 - 挂载新数组
        mountChildren(n2, container, null, isSVG, parentComponent, parentSuspense);
      }
    }
  }

  // ============================================================
  // mountChildren
  // ============================================================

  function mountChildren(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null = null,
    parentSuspense: SuspenseBoundary | null = null,
  ): void {
    const children = vnode.children;
    if (!isArray(children)) return;

    // 规范化：数组里可能混有裸字符串 / 数字（如 `h('div', null, ['x'])`），
    // 不转换的话 `patch` 无分支命中会**静默丢弃**（见 normalizeVNodeChildren 说明）。
    normalizeVNodeChildren(children as unknown[]);

    for (let i = 0; i < children.length; i++) {
      const rawChild = children[i];
      if (rawChild != null) {
        // 提升的静态子树跨实例复用时，子 vnode 的 el 仍指向上一个实例的 DOM。
        // 逐层克隆并写回数组，保证每个实例持有自己的 el；首次挂载不克隆。
        const child = cloneIfMounted(rawChild);
        if (child !== rawChild) children[i] = child;
        patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG);
      }
    }
  }

  // ============================================================
  // unmountChildren
  // ============================================================

  function unmountChildren(
    children: VNode[],
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void {
    for (let i = 0; i < children.length; i++) {
      // 防御：数组里理论上已由 normalizeVNodeChildren 剔除 null/undefined，
      // 但卸载路径可能收到未经过该函数的历史数组，此处再兜一次底。
      const child = children[i];
      if (child != null) {
        unmount(child, parentComponent, parentSuspense, true);
      }
    }
  }

  // ============================================================
  // diffChildrenInternal - 委托给 list-diff 模块
  // ============================================================

  function diffChildrenInternal(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    fallbackAnchor: HN | null,
  ): void {
    // FIX: P0-04 传递 opsId 以支持多渲染器场景下的 DOM 操作隔离
    //
    // ⚠️ 2026-10-30 修复：此前这里用 `as unknown as` 把函数断言成「第 8 个参数是
    // opsId」，然后传了 8 个实参 —— 而真实签名是
    // `(…, fallbackAnchor, host, opsId)`，于是 `ctx.opsId` 落进了 **host 形参**，
    // 真正的 `opsId` 恒为 `undefined`。断言让 TypeScript 没能发现这个错位。
    // 现在按真实签名传参（`list-diff` 新增了「只传 opsId」的重载，不再需要断言）。
    const opsId = ctx.opsId;
    if (opsId !== undefined) {
      listDiffPatchKeyedChildren(
        c1,
        c2,
        container,
        parentComponent,
        parentSuspense,
        isSVG,
        fallbackAnchor,
        opsId,
      );
      return;
    }
    // 兜底：`ctx.opsId` 理论上在 createRenderer 返回前就已写入；若某个自定义渲染器
    // 没走 `registerDOMOperations`，退回 legacy 签名（取最后注册的 ops）。
    listDiffPatchKeyedChildren(
      c1,
      c2,
      container,
      parentComponent,
      parentSuspense,
      isSVG,
      fallbackAnchor,
    );
  }

  // ============================================================
  // diffChildren - 带 LIS 优化的 keyed diff
  // ============================================================

  function diffChildren(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    diffChildrenInternal(c1, c2, container, parentComponent, parentSuspense, isSVG, null);
  }

  return {
    patchChildren,
    patchBlockChildren,
    mountChildren,
    unmountChildren,
    diffChildren,
    diffChildrenInternal,
  };
}
