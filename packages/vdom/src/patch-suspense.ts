/**
 * @lytjs/vdom - patch-suspense
 *
 * Suspense vnode 的挂载、更新和卸载逻辑。
 * 包含 mountSuspense、patchSuspense、unmountSuspense、resolveSuspenseChildren 函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { isSameVNodeType } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';

// FIX: P2-20 删除冗余 __DEV__ 局部声明（env.d.ts 已全局声明）

/** FIX: P2-14 fallback 层级限制，防止无限嵌套 suspense */
const MAX_SUSPENSE_DEPTH = 10;
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';

/**
 * 渲染器内部的 suspension 边界。
 *
 * 公开类型 `SuspenseBoundary` 的字段（`activeBranch` / `pendingBranch` /
 * `fallbackBranch`）保持不变，作为「第一根」的兼容视图；多根分支的真实状态
 * 记录在这三个数组里：整组挂载、整组摘除、整组放回。
 */
interface SuspenseBoundaryRoots extends SuspenseBoundary {
  /** 当前正在显示的 default 根节点（多根时为全部） */
  activeRoots: VNode[];
  /** 被 fallback 顶替、已从 DOM 摘下但实例仍存活的 default 根节点 */
  pendingRoots: VNode[];
  /** 当前正在显示的 fallback 根节点（多根时为全部） */
  fallbackRoots: VNode[];
}

// ============================================================
// 跨包 linker 注册（避免循环依赖）
// ============================================================

type SuspenseLinkerFn = (
  asyncState: unknown,
  vnodeBoundary: SuspenseBoundary,
  domSwitch: (boundary: unknown, toFallback: boolean) => void,
) => void;

let suspenseLinker: SuspenseLinkerFn | null = null;

/**
 * 注册一个 linker 函数，连接 vdom 层的 SuspenseBoundary
 * 和 component 层的 SuspenseAsyncState。
 *
 * 由 @lytjs/component 在初始化时调用以避免循环导入。
 */
export function registerSuspenseLinker(linker: SuspenseLinkerFn): void {
  suspenseLinker = linker;
}

// ============================================================
// ★ 2026-10-29 新增：异步子组件的「登记 / 注销」入口
// ============================================================
//
// ## 为什么需要这两个函数
//
// `patchSuspense` 此前靠 `defaultBranch.isAsyncPlaceholder === true` 判断「要不要显示
// fallback」。那个标记是**子组件 `setupComponent` 跑完**才置位的，而检查发生在
// `patch(null, defaultBranch, …)` **之前** ⇒ 恒为 false ⇒ **fallback 从未出现**
// （实测：全程渲染 default，只是数据是 undefined）。
//
// 而且它天生只对「default 分支的**根 vnode** 就是异步组件」有效：
// `<Suspense><div><Async/></div><Fallback/></Suspense>` 的根是 `div`，标记永远 false。
//
// 改成**由子组件自己登记**：`setupComponent` 发现 setup 返回 Promise 时调
// `registerSuspensePendingChild(vnode)`，兑现时调 `notifySuspenseChildResolved(vnode)`。
// boundary 从 `vnode.suspense` 取（`mountComponent` 在 setup 之前就把它写上去），
// 于是**任意深度**的异步子组件都会被计入，不依赖「根 vnode 恰好是异步组件」。
//
// ⚠️ 这两个函数是 vdom 对 component 的**窄接口**（参数只有一个 vnode），
//   component 不需要知道 `SuspenseBoundary` 的任何字段 —— 与 `registerSuspenseLinker`
//   同一套「注入缝」思路，只是方向相反。

/** 取 vnode 关联的 suspense 边界（没有则 null） */
function getBoundaryOf(vnode: VNode): SuspenseBoundary | null {
  const b = vnode.suspense as SuspenseBoundary | null | undefined;
  return b && typeof b === 'object' ? b : null;
}

/**
 * 登记一个**正在等待**的异步子组件（`setup` 返回了 Promise）。
 *
 * 返回 `true` 表示已计入某个 suspense 边界；`false` 表示该组件不在任何
 * `<Suspense>` 内（正常路径，无需处理）。
 */
export function registerSuspensePendingChild(vnode: VNode): boolean {
  const boundary = getBoundaryOf(vnode);
  if (!boundary || boundary.isUnmounted) return false;
  boundary.pendingCount = (boundary.pendingCount ?? 0) + 1;
  return true;
}

/**
 * 通知「某个异步子组件已兑现（或失败）」，计数归零时**切回 default**。
 *
 * ⚠️ 必须由调用方在**重渲染之后**调用：子组件的 DOM 此刻还挂在「被摘下来」的
 *   状态里，先让 `instance.update()` 把内容画好，再把节点放回容器。
 */
export function notifySuspenseChildResolved(vnode: VNode): void {
  const boundary = getBoundaryOf(vnode);
  if (!boundary || boundary.isUnmounted) return;
  const next = (boundary.pendingCount ?? 0) - 1;
  boundary.pendingCount = next > 0 ? next : 0;
  if (boundary.pendingCount === 0) {
    boundary.switchToDefault?.();
  }
}

// ============================================================
// Suspense patch 工厂
// ============================================================

export interface SuspensePatchAPI<HN, _HE extends HN> {
  mountSuspense: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchSuspense: (
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmountSuspense: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
  resolveSuspenseChildren: (children: VNode['children']) => {
    defaultBranch: VNode | null;
    fallbackBranch: VNode | null;
  };
}

/**
 * 创建 suspense 相关的 patch 函数集合。
 */
export function createSuspensePatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): SuspensePatchAPI<HN, HE> {
  const { createComment, insert, remove: hostRemove, setVNodeEl, getVNodeEl, patch, unmount } = ctx;

  // ============================================================
  // resolveSuspenseChildren
  // ============================================================

  /** slot / 数组 / 单 vnode → 该分支的**全部**根 vnode（保持顺序） */
  const toRoots = (slot: unknown): VNode[] => {
    if (slot == null) return [];
    if (isArray(slot)) {
      const roots: VNode[] = [];
      for (const item of slot) roots.push(...toRoots(item));
      return roots;
    }
    if (typeof slot === 'function') return toRoots((slot as () => unknown)());
    return typeof slot === 'object' ? [slot as VNode] : [];
  };

  /**
   * 解析 suspension 的 default / fallback **根 vnode 列表**。
   *
   * 与 `resolveSuspenseChildren` 的差别：后者只取每支的**第一根**（公开契约未变），
   * 这里保留全部根 —— 多根 default / fallback 必须整组挂载、整组摘除。
   */
  function resolveSuspenseRoots(children: VNode['children']): {
    defaultRoots: VNode[];
    fallbackRoots: VNode[];
  } {
    if (isArray(children)) {
      // VNode[]：`[default, fallback]`（fallback 可选）
      return {
        defaultRoots: toRoots(children[0]),
        fallbackRoots: toRoots(children[1]),
      };
    }

    if (children && typeof children === 'object') {
      // Slot 对象：{ default, fallback }
      const slots = children as Record<string, unknown>;
      return {
        defaultRoots: toRoots(slots.default),
        fallbackRoots: toRoots(slots.fallback),
      };
    }

    return { defaultRoots: [], fallbackRoots: [] };
  }

  /**
   * 从 vnode children 中提取 default 和 fallback 分支（各取第一根）。
   * Children 可以是：
   * - VNode[]（`[default]` 或 `[default, fallback]`）
   * - { default: VNode[] | () => VNode[], fallback?: 同 }（命名 slots）
   *
   * ⚠️ 2026-10-29 修：**slot 函数形态**此前解析不出内容。
   *   `h(Suspense, null, { default: () => [...], fallback: () => [...] })` 是渲染函数里
   *   最自然的写法（与 `h(Child, null, { default: () => [...] })` 一致），而这里只认
   *   `Array.isArray(slot)` ⇒ 两个分支都得到 null ⇒ **整块渲染为空**（实测）。
   *   现在两种形态都接受：数组直接取，函数**调用后**取。
   */
  function resolveSuspenseChildren(children: VNode['children']): {
    defaultBranch: VNode | null;
    fallbackBranch: VNode | null;
  } {
    const { defaultRoots, fallbackRoots } = resolveSuspenseRoots(children);
    return {
      defaultBranch: defaultRoots[0] ?? null,
      fallbackBranch: fallbackRoots[0] ?? null,
    };
  }

  /**
   * 「这一帧的 default 分支还在等吗」的**统一判据**。
   *
   * 两个信号，缺一不可：
   *
   * 1. `boundary.pendingCount > 0` —— 真实应用里的主信号。异步子组件在
   *    `setupComponent` 里主动登记（`registerSuspensePendingChild`），
   *    **任意深度**都能算到，且计数归零才切回 default（多个异步组件不会被提前收工）。
   * 2. `roots.some(isAsyncPlaceholder)` —— 兼容信号。给「手写 vnode」的场景
   *    （`vdom` 的单测就是直接构造带该标记的 vnode，不经过 `setupComponent`）。
   *    检查**全部根**：多根 default 里任意一根在等，整块都要进 fallback。
   *
   * ⚠️ 关键差别在于**检查时机**：这两个信号都必须在 `patch(null, defaultBranch, …)`
   *   **之后**读。此前的缺陷正是「挂之前读 isAsyncPlaceholder」—— 那个标记要等
   *   挂载时的 `setupComponent` 才置位，读的时候恒为 false。
   */
  function isRootsPending(roots: VNode[], boundary: SuspenseBoundary): boolean {
    if ((boundary.pendingCount ?? 0) > 0) return true;
    return roots.some((root) => root?.isAsyncPlaceholder === true);
  }

  // ============================================================
  // mountSuspense
  // ============================================================

  function mountSuspense(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    _parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // FIX: P2-14 计算 suspense 嵌套深度，超过阈值时发出警告
    // FIX: P1-5 正确遍历组件祖先链查找 suspense boundary，
    // 而非使用 parent.parent.suspense（始终为 undefined）
    let depth = 0;
    let currentParent = parentComponent;
    while (currentParent) {
      // 检查当前组件的 vnode 是否关联了 suspense boundary
      if (currentParent.vnode?.suspense) {
        depth++;
      }
      currentParent = currentParent.parent;
    }
    if (__DEV__ && depth > MAX_SUSPENSE_DEPTH) {
      console.warn(
        `[lytjs/patch-suspense] Suspense 嵌套深度(${depth})超过阈值(${MAX_SUSPENSE_DEPTH})，` +
          `可能导致性能问题。建议减少嵌套层级或使用其他方式组织异步逻辑。`,
      );
    }

    // 创建 SuspenseBoundary 并存储在 vnode 上
    const boundary: SuspenseBoundaryRoots = {
      vnode,
      parent: parentComponent,
      parentComponent,
      isSVG,
      container,
      anchor,
      activeBranch: null,
      pendingBranch: null,
      isInFallback: false,
      isHydrating: false,
      effects: [],
      pendingCount: 0,
      fallbackBranch: null,
      isUnmounted: false,
      activeRoots: [],
      pendingRoots: [],
      fallbackRoots: [],
    };

    vnode.suspense = boundary;

    // 将 vdom 层的 SuspenseBoundary 与 component 层的 SuspenseAsyncState 关联
    // 如果 linker 已由 @lytjs/component 注册。
    if (suspenseLinker && vnode.component) {
      const setupState = (vnode.component as ComponentInternalInstance).setupState;
      if (setupState && typeof setupState === 'object' && 'boundary' in setupState) {
        const asyncState = setupState.boundary;
        if (asyncState && typeof asyncState === 'object') {
          suspenseLinker(asyncState, boundary, (_boundary: unknown, toFallback: boolean) => {
            // domSwitch：在 default 和 fallback 分支之间切换
            const b = _boundary as { vnodeBoundary?: SuspenseBoundary };
            const vb = b.vnodeBoundary;
            if (!vb || vb.isUnmounted) return;
            if (toFallback && !vb.isInFallback) {
              // 真正的执行者是边界自己的 `switchToFallback`（`vb` 就是 boundary 本身）
              if (vb.switchToFallback && vb.fallbackBranch) {
                vb.switchToFallback(vb.fallbackBranch);
              } else {
                vb.isInFallback = true;
              }
            } else if (!toFallback && vb.isInFallback) {
              vb.switchToDefault?.();
            }
          });
        }
      }
    }

    // 从 children 中解析 default 和 fallback 分支（保留全部根节点）
    const { defaultRoots, fallbackRoots } = resolveSuspenseRoots(vnode.children);

    // ============================================================
    // 两个切换原语（挂在 boundary 上，供异步子组件兑现时调用）
    // ============================================================

    boundary.switchToFallback = (fallback: VNode) => {
      if (boundary.isUnmounted || boundary.isInFallback) return;

      // ① 把 default 的 DOM **整组摘下来**。
      //    `remove` 只是从容器摘除，**不**卸载实例 ⇒ 内部 effect 继续跑，
      //    异步子组件兑现后仍能更新自己（它是按 el 引用原地 patch 的）。
      for (const root of boundary.activeRoots) {
        if (root?.el) hostRemove(root.el as unknown as HN);
      }
      boundary.pendingRoots = boundary.activeRoots.slice();
      boundary.activeRoots = [];
      boundary.pendingBranch = boundary.activeBranch;
      boundary.activeBranch = null;

      // ② 挂上 fallback（多根时整组挂载）
      const roots = boundary.fallbackRoots.length > 0 ? boundary.fallbackRoots : [fallback];
      boundary.fallbackRoots = roots;
      boundary.fallbackBranch = roots[0] ?? null;
      boundary.isInFallback = true;
      for (const root of roots) {
        patch(null, root, container, anchor, parentComponent, boundary, isSVG);
      }
      boundary.vnode.el = roots[0]?.el ?? null;
    };

    boundary.switchToDefault = () => {
      if (boundary.isUnmounted || !boundary.isInFallback) return;

      // ① 卸载 fallback（多根时整组卸载）
      const fallbackRoots = boundary.fallbackRoots;
      boundary.fallbackRoots = [];
      boundary.fallbackBranch = null;
      for (const fb of fallbackRoots) {
        if (fb?.el) {
          unmount(fb, boundary.parentComponent, boundary, true);
        }
      }

      // ② 把 default 的 DOM 整组放回原位。
      //    此刻异步子组件已经在自己那块 DOM 上完成过重渲染（`instance.update()`），
      //    所以直接插回去就是**已就绪**的内容。逐个插到同一 anchor 前 ⇒ 顺序保持。
      const pendingRoots = boundary.pendingRoots;
      boundary.pendingRoots = [];
      boundary.activeRoots = pendingRoots;
      boundary.pendingBranch = null;
      boundary.activeBranch = pendingRoots[0] ?? null;
      boundary.isInFallback = false;

      for (const root of pendingRoots) {
        if (root?.el) insert(root.el as unknown as HN, container, anchor);
      }
      if (pendingRoots[0]?.el) boundary.vnode.el = pendingRoots[0].el;
    };

    // 先把 default 分支**挂上去**。
    //
    // ⚠️ 2026-10-29 修（P0）：此前是「挂之前先判断 isAsync」——
    //   而 isAsync 的来源 `isAsyncPlaceholder` 要等**挂载时**的 setupComponent 才置位
    //   ⇒ 判断恒为 false ⇒ fallback 永不出现。
    //   现在改成「先挂、再看计数」：挂载期间异步子组件会通过
    //   `registerSuspensePendingChild` 把 boundary.pendingCount 加上去，
    //   挂完之后这里才读得到真实值。
    boundary.activeRoots = defaultRoots;
    boundary.activeBranch = defaultRoots[0] ?? null;
    boundary.fallbackRoots = fallbackRoots;
    boundary.fallbackBranch = fallbackRoots[0] ?? null;

    if (defaultRoots.length > 0) {
      for (const root of defaultRoots) {
        patch(null, root, container, anchor, parentComponent, boundary, isSVG);
      }
      if (defaultRoots[0]?.el) vnode.el = defaultRoots[0].el;
    }

    // 挂载完才知道「有没有在等」——有就切到 fallback
    if (isRootsPending(defaultRoots, boundary)) {
      if (fallbackRoots.length > 0) {
        boundary.switchToFallback(fallbackRoots[0]!);
      } else if (__DEV__) {
        // 没有 fallback 可显示：保持现状（渲染半成品）是唯一选择，但要**说出来**
        console.warn(
          `[lytjs/patch-suspense] <Suspense> 内有异步子组件，但没有提供 fallback 分支，` +
            `首帧会显示尚未就绪的内容。写法：h(Suspense, null, [default, fallback]) ` +
            `或 h(Suspense, null, { default: () => [...], fallback: () => [...] })。`,
        );
      }
    }

    // 如果没有设置 el，创建占位注释节点
    if (!vnode.el) {
      const placeholder = createComment('');
      setVNodeEl(vnode, placeholder);
      insert(placeholder, container, anchor);
    }
  }

  // ============================================================
  // patchSuspense
  // ============================================================

  /** 按根节点数组 patch：形状一致就逐个原地更新，否则整组卸载重挂。 */
  function patchRoots(
    oldRoots: VNode[],
    newRoots: VNode[],
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    boundary: SuspenseBoundary,
    isSVG: boolean,
  ): void {
    const pairWise =
      oldRoots.length === newRoots.length &&
      oldRoots.every((oldRoot, index) => isSameVNodeType(oldRoot, newRoots[index]!));

    if (pairWise) {
      for (let i = 0; i < oldRoots.length; i++) {
        patch(oldRoots[i]!, newRoots[i]!, container, anchor, parentComponent, boundary, isSVG);
      }
      return;
    }

    for (const oldRoot of oldRoots) {
      if (oldRoot?.el) unmount(oldRoot, parentComponent, boundary, true);
    }
    for (const newRoot of newRoots) {
      patch(null, newRoot, container, anchor, parentComponent, boundary, isSVG);
    }
  }

  function patchSuspense(
    n1: VNode,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // 复用已有的 boundary
    const boundary = n1.suspense as SuspenseBoundaryRoots | undefined;
    if (!boundary) {
      // 没有 boundary（理论上不该发生）：退化成全新挂载，至少不会渲染为空
      mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      return;
    }

    n2.suspense = boundary;
    boundary.vnode = n2;
    n2.el = n1.el;

    const { defaultRoots: newDefaultRoots, fallbackRoots: newFallbackRoots } = resolveSuspenseRoots(
      n2.children,
    );

    if (boundary.isInFallback) {
      // ── 仍显示 fallback ──
      // default 分支此刻是「摘下来」的状态，它的实例还活着；这里**不动它**
      // （等它自己兑现）。只更新 fallback 自身的 props/children。
      const oldFallbackRoots = boundary.fallbackRoots;
      boundary.fallbackRoots = newFallbackRoots;
      boundary.fallbackBranch = newFallbackRoots[0] ?? null;
      patchRoots(
        oldFallbackRoots,
        newFallbackRoots,
        container,
        anchor,
        parentComponent,
        boundary,
        isSVG,
      );
      if (newFallbackRoots[0]?.el) n2.el = newFallbackRoots[0].el;

      // 新一帧里等待已归零（例如异步子组件在两次渲染之间兑现了）⇒ 立即切回
      if (!isRootsPending(newDefaultRoots, boundary)) {
        // ⚠️ 切回之前要先把「挂着但没显示」的 default 更新成**这一帧的 vnode**。
        //
        // 为什么不能直接 `insert(pendingRoots[i].el)` 了事：
        //   · 真实异步场景：pending 根是上一帧的 vnode，这一帧父组件重渲染
        //     生成了新的 vnode ⇒ 直接插旧的会让「父组件传下来的新 props」丢失；
        //   · 合成场景（`vdom/tests/suspense.test.ts` 手写 vnode）：pending 与
        //     newDefault 可能根本不是同一个 vnode ⇒ 插回去的是**过期的内容**。
        // 正常 patch 一遍两者都覆盖：同类型原地更新（异步子组件自己已经画好，这里是
        // 幂等的），不同类型则卸载重挂。
        const oldPendingRoots = boundary.pendingRoots;
        boundary.pendingRoots = newDefaultRoots;
        patchRoots(
          oldPendingRoots,
          newDefaultRoots,
          container,
          anchor,
          parentComponent,
          boundary,
          isSVG,
        );
        boundary.switchToDefault?.();
      }
      return;
    }

    // ── 显示 default ──
    const oldActiveRoots = boundary.activeRoots;
    boundary.activeRoots = newDefaultRoots;
    boundary.activeBranch = newDefaultRoots[0] ?? null;
    patchRoots(
      oldActiveRoots,
      newDefaultRoots,
      container,
      anchor,
      parentComponent,
      boundary,
      isSVG,
    );

    if (newDefaultRoots[0]?.el) n2.el = newDefaultRoots[0].el;

    // 新一帧里出现了异步子组件 ⇒ 切到 fallback
    if (newFallbackRoots.length > 0 && isRootsPending(newDefaultRoots, boundary)) {
      boundary.fallbackRoots = newFallbackRoots;
      boundary.fallbackBranch = newFallbackRoots[0] ?? null;
      boundary.switchToFallback?.(newFallbackRoots[0]!);
    }
  }

  // ============================================================
  // unmountSuspense
  // ============================================================

  function unmountSuspense(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ): void {
    // FIX: P1-14 添加 unmountedSet 防止重复卸载，
    // 避免在 activeBranch 和 fallbackBranch 指向同一 VNode 时重复卸载
    const unmountedSet = new Set<VNode>();

    const safeUnmount = (v: VNode) => {
      if (unmountedSet.has(v)) return;
      unmountedSet.add(v);
      unmount(v, parentComponent, parentSuspense, doRemove);
    };

    const boundary = vnode.suspense as SuspenseBoundaryRoots | undefined;

    // ★ 2026-10-29：置位后，迟到的 Promise 兑现回调一律忽略
    // （否则 `switchToDefault` 会往一个已经卸载的容器里插节点）。
    if (boundary) {
      boundary.isUnmounted = true;
    }

    // 卸载 active / pending / fallback 的**全部根节点**
    if (boundary) {
      for (const root of boundary.activeRoots) safeUnmount(root);
      for (const root of boundary.pendingRoots) safeUnmount(root);
      for (const root of boundary.fallbackRoots) safeUnmount(root);
    }

    // 兜底：children 里还有没被 boundary 跟踪到的分支
    const { defaultRoots, fallbackRoots } = resolveSuspenseRoots(vnode.children);
    for (const branch of [...defaultRoots, ...fallbackRoots]) {
      if (branch?.el) safeUnmount(branch);
    }

    // 清理 boundary
    if (boundary) {
      boundary.activeBranch = null;
      boundary.pendingBranch = null;
      boundary.fallbackBranch = null;
      boundary.activeRoots = [];
      boundary.pendingRoots = [];
      boundary.fallbackRoots = [];
      boundary.effects = [];
    }

    if (doRemove) {
      const vEl = getVNodeEl(vnode);
      if (vEl) hostRemove(vEl);
    }
  }

  return {
    mountSuspense,
    patchSuspense,
    unmountSuspense,
    resolveSuspenseChildren,
  };
}
