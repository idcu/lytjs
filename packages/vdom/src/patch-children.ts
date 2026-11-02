/**
 * @lytjs/vdom - patch-children
 *
 * 子节点的 diff 和挂载/卸载逻辑。
 * 包含 patchChildren、patchBlockChildren、mountChildren、unmountChildren、
 * diffChildren、diffChildrenInternal 函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { ShapeFlags, isSameVNodeType, isVNode } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';
import { patchKeyedChildren as listDiffPatchKeyedChildren } from './list-diff';
import { createTextVNode } from './vnode';

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
  // patchBlockChildren — Block Tree 快速路径
  // ============================================================

  /**
   * FIX: P2-5 VDOM-NEW-12 - 静态提升优化
   * 检查 vnode 是否为静态节点（无需 diff 的节点）
   */
  function isStaticVNode(vnode: VNode | null | undefined): boolean {
    if (!vnode) return false;
    // 检查静态标记
    return !!(vnode.isStatic || vnode.isStaticRoot);
  }

  /**
   * FIX: P2-5 VDOM-NEW-12 - 静态提升优化
   * 直接复用静态 vnode，跳过 diff 过程
   */
  function patchStaticVNode(
    n1: VNode,
    n2: VNode,
    _container: HN,
    _parentComponent: ComponentInternalInstance | null,
    _parentSuspense: SuspenseBoundary | null,
    _isSVG: boolean,
  ): boolean {
    // 如果两个节点都是静态节点且类型相同，直接复用
    if (isStaticVNode(n1) && isStaticVNode(n2) && isSameVNodeType(n1, n2)) {
      // 静态节点：复用 DOM 元素，只更新 vnode 引用
      n2.el = n1.el;
      n2.anchor = n1.anchor;
      return true; // 表示已处理，跳过 diff
    }
    return false; // 需要正常 diff
  }

  /**
   * 仅遍历 dynamicChildren 进行 patch。
   * dynamicChildren 中的每个节点按索引一一对应（顺序稳定），
   * 跳过所有静态子树的 diff。
   *
   * ⚠️ **前提是「位序稳定」**。本函数用**索引**把新旧动态子节点配对，
   * 一旦数量或位序变化，配对就完全错位。见下方 `canFastPath` 的说明。
   */
  function patchBlockChildren(
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // FIX: P1-08 dynamicChildren 非空断言改为条件检查，
    // 避免在 dynamicChildren 为 null/undefined 时抛出运行时错误
    const oldDynamicChildren = n1.dynamicChildren;
    const newDynamicChildren = n2.dynamicChildren;

    if (!oldDynamicChildren || !newDynamicChildren) return;

    // ============================================================
    // ★ 2026-11-02 修复（P0）：block 快速路径的「位序稳定」前置校验
    // ============================================================
    //
    // ## 缺陷
    //
    // 本函数按**索引位置**把 `oldDynamicChildren[i]` 与 `newDynamicChildren[i]`
    // 当作「同一个节点的新旧两代」来 patch。但 v-for 的产物（每个列表项都是
    // `openBlock() + createBlock()` 造出来的 block）会被收集进**外层 block** 的
    // `dynamicChildren`，于是**列表长度一变，整个数组的位序就变了**：
    //
    //   首帧   wrap.dynamicChildren = [button]          （列表为空，无 li）
    //   更新帧 wrap.dynamicChildren = [li, button]      （列表有了 1 项）
    //
    // 结果 i=0 把 `button` 和 `li` 配成一对 ⇒ 类型不同 ⇒ 卸载 button，
    // 再 `patch(null, li, container, …)`，而这里的 `container` 是**被 patch 元素
    // 的容器**（即 `wrap`），不是 `ul` ⇒ `li` 被挂到 `ul` 的**兄弟位置**。
    // 同时 button 在 i=1 被重新挂载。
    //
    // 实测症状（`<ul><li v-for>` 从空变非空）：
    //   `<div class="wrap"><h1>…</h1><ul></ul><li>a</li><button>…</button></div>`
    //   —— li 跑到了 ul 外面，且列表项越多错得越离谱。
    //
    // 为什么此前没被发现：只要模板里**没有别的动态子节点**（比如没有 `@click`），
    // 首帧 dynamicChildren 就是空数组，`patchElement` 会走 `patchChildren`
    // 全量 diff 分支，恰好绕开这里。一旦旁边有个绑定事件的按钮，就必现。
    //
    // ## 修法
    //
    // 位序稳定才走快速路径；否则**退回全量 children diff**（正确性优先，
    // 代价只是静态子树也参与一次比较）。判定条件：
    //   · 两代长度相同
    //   · 每一位都 `isSameVNodeType`（已同时比较 `type` 与 `key`）
    //
    // 长度不同 ⇒ 列表增删；`isSameVNodeType` 为假 ⇒ 类型变化或 key 重排。
    // 两种情况都必须交给 keyed diff 处理。
    const canFastPath =
      oldDynamicChildren.length === newDynamicChildren.length &&
      oldDynamicChildren.every((oldVNode, i) => {
        const newVNode = newDynamicChildren[i];
        return !!oldVNode && !!newVNode && isSameVNodeType(oldVNode, newVNode);
      });

    if (!canFastPath) {
      // 退回全量 diff：`patchChildren` 会按 children 的真实形态
      // （数组 / 文本 / 空）选正确分支，并把 v-for 交给 keyed diff。
      patchChildren(n1, n2, container, parentComponent, parentSuspense, isSVG);
      return;
    }

    // 走到这里：长度相同且逐位同类型同 key ⇒ 索引配对是安全的。
    for (let i = 0; i < newDynamicChildren.length; i++) {
      const oldVNode = oldDynamicChildren[i];
      const newVNode = newDynamicChildren[i]!;

      // FIX: P2-5 VDOM-NEW-12 - 静态提升优化：检查是否可以直接复用静态节点
      if (patchStaticVNode(oldVNode, newVNode, container, parentComponent, parentSuspense, isSVG)) {
        continue; // 静态节点已复用，跳过 diff
      }

      // 同类型节点：走 patch 更新路径
      patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG);
    }
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
      const child = children[i];
      if (child != null) {
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
