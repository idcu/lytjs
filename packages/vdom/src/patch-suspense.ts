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

  /**
   * 从 vnode children 中提取 default 和 fallback 分支。
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
    /** 把「数组 / 函数 / 单 vnode」统一取成首个 vnode */
    const first = (slot: unknown): VNode | null => {
      if (slot == null) return null;
      if (isArray(slot)) return (slot[0] as VNode | undefined) ?? null;
      if (typeof slot === 'function') return first((slot as () => unknown)());
      return (slot as VNode) ?? null;
    };

    if (isArray(children)) {
      // VNode[]：`[default, fallback]`（fallback 可选）
      return {
        defaultBranch: first(children[0]),
        fallbackBranch: first(children[1]),
      };
    }

    if (children && typeof children === 'object') {
      // Slot 对象：{ default, fallback }
      const slots = children as Record<string, unknown>;
      return {
        defaultBranch: first(slots.default),
        fallbackBranch: first(slots.fallback),
      };
    }

    return { defaultBranch: null, fallbackBranch: null };
  }

  /**
   * 「这一帧的 default 分支还在等吗」的**统一判据**。
   *
   * 两个信号，缺一不可：
   *
   * 1. `boundary.pendingCount > 0` —— 真实应用里的主信号。异步子组件在
   *    `setupComponent` 里主动登记（`registerSuspensePendingChild`），
   *    **任意深度**都能算到，且计数归零才切回 default（多个异步组件不会被提前收工）。
   * 2. `branch.isAsyncPlaceholder === true` —— 兼容信号。给「手写 vnode」的场景
   *    （`vdom` 的单测就是直接构造带该标记的 vnode，不经过 `setupComponent`）。
   *
   * ⚠️ 关键差别在于**检查时机**：这两个信号都必须在 `patch(null, defaultBranch, …)`
   *   **之后**读。此前的缺陷正是「挂之前读 isAsyncPlaceholder」—— 那个标记要等
   *   挂载时的 `setupComponent` 才置位，读的时候恒为 false。
   */
  function isBranchPending(branch: VNode | null, boundary: SuspenseBoundary): boolean {
    if ((boundary.pendingCount ?? 0) > 0) return true;
    return branch?.isAsyncPlaceholder === true;
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
    const boundary: SuspenseBoundary = {
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

    // 从 children 中解析 default 和 fallback 分支
    const { defaultBranch, fallbackBranch } = resolveSuspenseChildren(vnode.children);

    // ============================================================
    // 两个切换原语（挂在 boundary 上，供异步子组件兑现时调用）
    // ============================================================

    boundary.switchToFallback = (fallback: VNode) => {
      if (boundary.isUnmounted || boundary.isInFallback) return;

      // ① 把 default 的 DOM **摘下来**。
      //    `remove` 只是从容器摘除，**不**卸载实例 ⇒ 内部 effect 继续跑，
      //    异步子组件兑现后仍能更新自己（它是按 el 引用原地 patch 的）。
      const active = boundary.activeBranch;
      if (active?.el) {
        hostRemove(active.el as unknown as HN);
      }
      boundary.pendingBranch = active;
      boundary.activeBranch = null;

      // ② 挂上 fallback
      boundary.fallbackBranch = fallback;
      boundary.isInFallback = true;
      patch(null, fallback, container, anchor, parentComponent, boundary, isSVG);
      boundary.vnode.el = fallback.el;
    };

    boundary.switchToDefault = () => {
      if (boundary.isUnmounted || !boundary.isInFallback) return;

      // ① 卸载 fallback
      const fb = boundary.fallbackBranch;
      boundary.fallbackBranch = null;
      if (fb?.el) {
        unmount(fb, boundary.parentComponent, boundary, true);
      }

      // ② 把 default 的 DOM 放回原位。
      //    此刻异步子组件已经在自己那块 DOM 上完成过重渲染（`instance.update()`），
      //    所以直接插回去就是**已就绪**的内容。
      const active = boundary.pendingBranch;
      boundary.pendingBranch = null;
      boundary.activeBranch = active;
      boundary.isInFallback = false;

      if (active?.el) {
        insert(active.el as unknown as HN, container, anchor);
        boundary.vnode.el = active.el;
      }
    };

    // 先把 default 分支**挂上去**。
    //
    // ⚠️ 2026-10-29 修（P0）：此前是「挂之前先判断 isAsync」——
    //   而 isAsync 的来源 `isAsyncPlaceholder` 要等**挂载时**的 setupComponent 才置位
    //   ⇒ 判断恒为 false ⇒ fallback 永不出现。
    //   现在改成「先挂、再看计数」：挂载期间异步子组件会通过
    //   `registerSuspensePendingChild` 把 boundary.pendingCount 加上去，
    //   挂完之后这里才读得到真实值。
    boundary.activeBranch = defaultBranch;

    if (defaultBranch) {
      patch(null, defaultBranch, container, anchor, parentComponent, boundary, isSVG);
      vnode.el = defaultBranch.el;
    }

    // 挂载完才知道「有没有在等」——有就切到 fallback
    if (isBranchPending(defaultBranch, boundary)) {
      if (fallbackBranch) {
        boundary.switchToFallback(fallbackBranch);
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
    const boundary = n1.suspense as SuspenseBoundary | undefined;
    if (!boundary) {
      // 没有 boundary（理论上不该发生）：退化成全新挂载，至少不会渲染为空
      mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      return;
    }

    n2.suspense = boundary;
    boundary.vnode = n2;
    n2.el = n1.el;

    const { defaultBranch: newDefault, fallbackBranch: newFallback } = resolveSuspenseChildren(
      n2.children,
    );

    if (boundary.isInFallback) {
      // ── 仍显示 fallback ──
      // default 分支此刻是「摘下来」的状态，它的实例还活着；这里**不动它**
      // （等它自己兑现）。只更新 fallback 自身的 props/children。
      const oldFallback = boundary.fallbackBranch;
      boundary.fallbackBranch = newFallback;

      if (oldFallback && newFallback && isSameVNodeType(oldFallback, newFallback)) {
        patch(oldFallback, newFallback, container, anchor, parentComponent, boundary, isSVG);
        n2.el = newFallback.el;
      } else {
        if (oldFallback?.el) unmount(oldFallback, parentComponent, boundary, true);
        if (newFallback) {
          patch(null, newFallback, container, anchor, parentComponent, boundary, isSVG);
          n2.el = newFallback.el;
        }
      }

      // 新一帧里等待已归零（例如异步子组件在两次渲染之间兑现了）⇒ 立即切回
      if (!isBranchPending(newDefault, boundary)) {
        // ⚠️ 切回之前要先把「挂着但没显示」的 default 更新成**这一帧的 vnode**。
        //
        // 为什么不能直接 `insert(pendingBranch.el)` 了事：
        //   · 真实异步场景：pendingBranch 是上一帧的 vnode，这一帧父组件重渲染
        //     生成了新的 vnode ⇒ 直接插旧的会让「父组件传下来的新 props」丢失；
        //   · 合成场景（`vdom/tests/suspense.test.ts` 手写 vnode）：pendingBranch 与
        //     newDefault 可能根本不是同一个 vnode ⇒ 插回去的是**过期的内容**。
        // 正常 patch 一遍两者都覆盖：同类型原地更新（异步子组件自己已经画好，这里是
        // 幂等的），不同类型则卸载重挂。
        const pending = boundary.pendingBranch;
        if (newDefault) {
          if (pending && isSameVNodeType(pending, newDefault)) {
            patch(pending, newDefault, container, anchor, parentComponent, boundary, isSVG);
          } else {
            if (pending?.el) unmount(pending, parentComponent, boundary, true);
            patch(null, newDefault, container, anchor, parentComponent, boundary, isSVG);
          }
          boundary.pendingBranch = newDefault;
        }
        boundary.switchToDefault?.();
      }
      return;
    }

    // ── 显示 default ──
    const oldActive = boundary.activeBranch;
    boundary.activeBranch = newDefault;

    if (oldActive && newDefault && isSameVNodeType(oldActive, newDefault)) {
      patch(oldActive, newDefault, container, anchor, parentComponent, boundary, isSVG);
    } else {
      if (oldActive?.el) unmount(oldActive, parentComponent, boundary, true);
      if (newDefault) {
        patch(null, newDefault, container, anchor, parentComponent, boundary, isSVG);
      }
    }

    if (newDefault?.el) n2.el = newDefault.el;

    // 新一帧里出现了异步子组件 ⇒ 切到 fallback
    if (newFallback && isBranchPending(newDefault, boundary)) {
      boundary.switchToFallback?.(newFallback);
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

    const boundary = vnode.suspense as SuspenseBoundary | undefined;

    // ★ 2026-10-29：置位后，迟到的 Promise 兑现回调一律忽略
    // （否则 `switchToDefault` 会往一个已经卸载的容器里插节点）。
    if (boundary) {
      boundary.isUnmounted = true;
    }

    // 卸载 active 分支
    if (boundary?.activeBranch) {
      safeUnmount(boundary.activeBranch);
    }

    // 卸载 pending 分支（如果仍然挂载）
    if (boundary?.pendingBranch) {
      safeUnmount(boundary.pendingBranch);
    }

    // 卸载正在显示的 fallback
    if (boundary?.fallbackBranch) {
      safeUnmount(boundary.fallbackBranch);
    }

    // 兜底：children 里还有没被 boundary 跟踪到的分支
    const { defaultBranch, fallbackBranch } = resolveSuspenseChildren(vnode.children);
    for (const branch of [defaultBranch, fallbackBranch]) {
      if (branch?.el) safeUnmount(branch);
    }

    // 清理 boundary
    if (boundary) {
      boundary.activeBranch = null;
      boundary.pendingBranch = null;
      boundary.fallbackBranch = null;
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
