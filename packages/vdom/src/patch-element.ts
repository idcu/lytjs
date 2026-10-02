/**
 * @lytjs/vdom - patch-element
 *
 * Element vnode 的挂载和更新逻辑。
 * 包含 mountElement、patchElement、diffProps、setRef 等函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { ShapeFlags, PatchFlags } from '@lytjs/common-vnode';
import { hasChanged, EMPTY_OBJ, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { SuspenseBoundary } from './types';

// ============================================================
// RendererContext - 子模块共享的渲染器上下文接口
// ============================================================

/**
 * 渲染器内部上下文，由 createRenderer 创建并传递给各子模块工厂函数。
 * 包含 host 操作、vnode el 辅助函数、以及核心 patch/unmount/move 递归函数。
 */
export interface RendererContext<HN, HE extends HN> {
  // 宿主操作
  createElement: (type: string) => HE;
  setElementText: (node: HE, text: string) => void;
  insert: (child: HN, parent: HN, anchor?: HN | null) => void;
  remove: (child: HN) => void;
  createText: (text: string) => HN;
  setText: (node: HN, text: string) => void;
  patchProp: (el: HE, key: string, prevValue: unknown, nextValue: unknown) => void;
  createComment: (text: string) => HN;
  querySelector: ((selector: string) => HE | null) | undefined;
  /** 取容器的子节点列表（水合认领时按序扫描） */
  getChildNodes: ((node: HN) => HN[]) | undefined;
  /** 水合用：取节点类型（1=元素 / 3=文本 / 8=注释） */
  getNodeType: ((node: HN) => number) | undefined;
  /** 水合用：取元素标签名（小写） */
  getTagName: ((el: HE) => string) | undefined;
  /** 水合模式开关：`hydrate()` 入口置 true，首屏挂载期间复用既有 DOM */
  hydrating: boolean;
  /**
   * 本次水合中**已被某个 vnode 占用**的宿主节点。
   * 既包含「认领来的既有节点」，也包含「因 SSR 缺失而新建的节点」——
   * 否则后续兄弟 vnode 会把上一个 vnode 刚新建的节点误认成自己的（实测可致
   * 两个 vnode 共享同一 DOM 节点）。未占用者一律跳过。
   */
  hydrateUsed: Set<HN>;
  setupChildComponent:
    | ((vnode: VNode, parent: ComponentInternalInstance | null) => void)
    | undefined;
  /** FIX: P1-4 组件更新时规范化 props 的回调（由 @lytjs/component 注册） */
  normalizeProps:
    | ((instance: ComponentInternalInstance, rawProps: Record<string, unknown> | null) => void)
    | undefined;
  /** 组件生命周期钩子回调（由 @lytjs/core 注入，见 RendererOptions 的同名说明） */
  invokeMountedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeUpdatedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeBeforeUnmountHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeUnmountedHook: ((instance: ComponentInternalInstance) => void) | undefined;

  // VNode el helpers
  setVNodeEl: (vnode: VNode, el: HN | null) => void;
  getVNodeEl: (vnode: VNode) => HN | null;

  // 核心递归函数
  patch: (
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmount: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
  move: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;

  // Children 辅助函数
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
  diffChildrenInternal: (
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    fallbackAnchor: HN | null,
  ) => void;

  // FIX: P0-04 DOM 操作注册 ID，用于 list-diff 多渲染器隔离
  opsId?: symbol;
}

// ============================================================
// Element patch 工厂
// ============================================================

export interface ElementPatchAPI<HN, _HE extends HN> {
  mountElement: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  patchElement: (
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  mountTextNode: (vnode: VNode, container: HN, anchor: HN | null) => void;
  mountCommentNode: (vnode: VNode, container: HN, anchor: HN | null) => void;
  setRef: (el: HN, ref: unknown, parentComponent: ComponentInternalInstance) => void;
}

/**
 * 创建 element 相关的 patch 函数集合。
 */
export function createElementPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): ElementPatchAPI<HN, HE> {
  const {
    createElement,
    setElementText,
    insert,
    patchProp,
    createText,
    createComment,
    setVNodeEl,
    mountChildren,
  } = ctx;

  // ============================================================
  // setRef - 处理模板 ref 收集
  // ============================================================

  /**
   * 设置 ref 引用：
   * - 字符串 ref：存储到父组件实例的 refs 对象中
   * - 函数 ref：调用并传入元素
   * - 对象 ref（refImpl）：设置其 .value
   */
  function setRef(el: HN, ref: unknown, parentComponent: ComponentInternalInstance): void {
    if (typeof ref === 'string') {
      parentComponent.refs[ref] = el;
    } else if (typeof ref === 'function') {
      ref(el);
    } else if (ref !== null && typeof ref === 'object' && 'value' in ref) {
      (ref as { value: unknown }).value = el;
    }
  }

  // ============================================================
  // 水合：认领容器内既有的节点
  //
  // 宿主契约（`@lytjs/host-contract` 的 `RendererHost`）**早已声明**
  // `getNodeType` / `getTagName` 且注释写明「用于 hydration」，`WebRendererHost`
  // 也已实现 —— 但此前 vdom 从未把它们接进渲染器，也没有 `hydrate()` 入口，
  // 于是「SSR 产出的 DOM 在客户端复用」这件事在本仓**没有任何实现**。
  // 本节把那三个已存在的零件接起来；`ctx.hydrating` 默认 false ⇒ 挂载路径不变。
  // ============================================================

  const NODE_TYPE_ELEMENT = 1;
  const NODE_TYPE_TEXT = 3;
  const NODE_TYPE_COMMENT = 8;

  /**
   * 在容器里找第一个**未被占用**且**类型匹配**（元素还需标签名相同）的既有节点。
   *
   * - 命中即登记进 `hydrateUsed` ⇒ 兄弟同标签（`<li>`×3）不会认领到同一个节点；
   * - 未命中返回 `null`，调用方退回「新建」（客户端比 SSR 多出来的节点）；
   * - 顺带跳过的节点**不删除**（容器里可能有本组件之外的其它内容，删不得）。
   *
   * ⚠️ 宿主没有 `firstChild`（`nextSibling` 只接受一个参数），故按
   * `getChildNodes` 的快照顺序扫描；水合期间只有「认领」不「插入」，
   * 已被占用的节点靠 `hydrateUsed` 排除，因此不会错位。
   */
  function claimExisting(container: HN, nodeType: number, tag?: string): HN | null {
    const { getNodeType, getTagName, getChildNodes, hydrateUsed } = ctx;
    if (!getNodeType || !getTagName || !getChildNodes) return null;
    const children = getChildNodes(container);
    for (let i = 0; i < children.length; i++) {
      const node = children[i] as HN;
      if (hydrateUsed.has(node)) continue;
      if (getNodeType(node) !== nodeType) continue;
      // 元素额外要求标签名一致（宿主返回小写标签名）
      if (nodeType === NODE_TYPE_ELEMENT && getTagName(node as HE) !== tag) continue;
      hydrateUsed.add(node);
      return node;
    }
    return null;
  }

  // ============================================================
  // mountElement
  // ============================================================

  function mountElement(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null = null,
    parentSuspense: SuspenseBoundary | null = null,
  ): void {
    if (typeof vnode.type !== 'string') {
      warn(
        `mountElement received a vnode with non-string type (${String(vnode.type)}). ` +
          `Only element vnodes can be mounted as elements.`,
      );
      return;
    }
    const tag = vnode.type;
    // ★ 水合：优先认领容器内同标签的既有元素，跳过 createElement
    const claimed = ctx.hydrating
      ? claimExisting(container, NODE_TYPE_ELEMENT, tag.toLowerCase())
      : null;
    const el = (claimed ?? createElement(tag)) as HE;
    // 无论认领还是新建，都登记为「已占用」—— 否则当客户端比 SSR 多出节点时，
    // 后续兄弟 vnode 会把这里**新建**的节点误认成自己的（两个 vnode 共享一个 DOM 节点）
    if (ctx.hydrating) ctx.hydrateUsed.add(el as HN);
    setVNodeEl(vnode, el);

    // 应用 props
    const props = vnode.props ?? EMPTY_OBJ;
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;
      patchProp(el, key, null, props[key]);
    }

    // 挂载 children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // ⚠️ 2026-10-01 修复：这里**不能**把外层容器的 `anchor` 传下去 —— 子节点是挂进
      // **新建元素 `el`** 的，而 `anchor` 属于 `container`（另一个父节点）。传下去会让
      // `insertBefore(child, anchor)` 拿到「不属于 el 的锚点」，浏览器抛
      // `NotFoundError: The child can not be found in the parent`。
      // 触发场景：teleport 把 `targetEnd` 当 anchor 交给每个子 vnode，
      // 子 vnode 若是**带子节点的元素**（数组 children）就会把锚点带进元素内部 ⇒ 抛错；
      // 而**纯文本子节点**走 `setElementText` 不用 anchor ⇒ 正常（这解释了形态差异）。
      mountChildren(vnode, el, null, isSVG, parentComponent, parentSuspense);
    } else if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      setElementText(el, String(vnode.children ?? ''));
    }
    // 其余情况（无子节点 / 注释占位）无需处理

    // 插入到容器中（已认领的节点本就在原位，无需再插 —— 否则会变成两份）
    if (!claimed) {
      insert(el, container, anchor);
    }

    // 处理 ref：在父组件实例上存储元素引用
    const refValue = vnode.ref;
    if (refValue && parentComponent) {
      setRef(el, refValue, parentComponent);
    }
  }

  // ============================================================
  // mountTextNode
  // ============================================================

  function mountTextNode(vnode: VNode, container: HN, anchor: HN | null): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '');
    // ★ 水合：认领既有的文本节点并原地改写（不新建、不插入）
    if (ctx.hydrating) {
      const claimed = claimExisting(container, NODE_TYPE_TEXT);
      if (claimed) {
        ctx.setText(claimed, text);
        setVNodeEl(vnode, claimed);
        return;
      }
    }
    const node = createText(text);
    if (ctx.hydrating) ctx.hydrateUsed.add(node);
    setVNodeEl(vnode, node);
    insert(node, container, anchor);
  }

  // ============================================================
  // mountCommentNode
  // ============================================================

  function mountCommentNode(vnode: VNode, container: HN, anchor: HN | null): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '');
    // ★ 水合：认领既有注释节点（注释无文本要同步，只需接管其位置）
    if (ctx.hydrating) {
      const claimed = claimExisting(container, NODE_TYPE_COMMENT);
      if (claimed) {
        setVNodeEl(vnode, claimed);
        vnode.anchor = claimed as unknown as Node | null;
        return;
      }
    }
    const node = createComment(text);
    if (ctx.hydrating) ctx.hydrateUsed.add(node);
    setVNodeEl(vnode, node);
    // FIX: P2-17 添加 null 检查，避免 node 为 null 时的不安全类型断言
    vnode.anchor = node != null ? (node as unknown as Node | null) : null;
    insert(node, container, anchor);
  }

  // ============================================================
  // FIX: P2-09 属性更新策略可配置化：
  // 允许通过 ctx 配置自定义属性更新策略（如合并 class/style 而非替换）
  // diffProps - full props diff between old and new props
  // ============================================================

  function diffProps(
    el: HE,
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ): void {
    // FIX: P1-6 VDOM-NEW-05 - 使用 Object.keys() 替代 for...in 避免遍历原型链属性
    // for...in 会遍历对象原型链上的可枚举属性，可能导致意外的属性更新
    for (const key of Object.keys(newProps)) {
      if (key === 'key' || key === 'ref') continue;
      const next = newProps[key];
      const prev = oldProps[key];
      if (hasChanged(next, prev)) {
        patchProp(el, key, prev, next);
      }
    }
    for (const key of Object.keys(oldProps)) {
      if (key === 'key' || key === 'ref') continue;
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null);
      }
    }
  }

  // ============================================================
  // patchElement
  // ============================================================

  function patchElement(
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // FIX: P1-5 VDOM-NEW-04 - 添加防御性检查，避免 n1.el 非空断言在异常场景下崩溃
    // n1.el 理论上应该存在（因为 n1 之前已被挂载），但在某些异常场景（如内存损坏、
    // 并发更新）下可能为 null，添加检查以提高健壮性
    if (!n1.el) {
      if (__DEV__) {
        warn(
          `[lytjs/vdom] patchElement: n1.el is null or undefined. ` +
            `VNode type: ${String(n1.type)}, key: ${String(n1.key)}`,
        );
      }
      return;
    }
    const el = n1.el as unknown as HE;
    setVNodeEl(n2, n1.el as unknown as HN | null);

    // Patch props
    const oldProps = n1.props ?? EMPTY_OBJ;
    const newProps = n2.props ?? EMPTY_OBJ;

    if (n2.patchFlag & PatchFlags.FULL_PROPS) {
      // 完整 props diff
      diffProps(el, oldProps, newProps);
    } else if (n2.patchFlag > 0) {
      // PatchFlag 优化
      if (n2.patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          patchProp(el, 'class', oldProps.class, newProps.class);
        }
      }
      if (n2.patchFlag & PatchFlags.STYLE) {
        patchProp(el, 'style', oldProps.style, newProps.style);
      }
      if (n2.patchFlag & PatchFlags.PROPS) {
        // 仅 diff dynamicProps
        const dynamicProps = n2.dynamicProps;
        if (dynamicProps) {
          for (let i = 0; i < dynamicProps.length; i++) {
            const key = dynamicProps[i]!;
            const next = newProps[key];
            const prev = oldProps[key];
            if (hasChanged(next, prev)) {
              patchProp(el, key, prev, next);
            }
          }
        }
      }
      if (n2.patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          setElementText(el, String(n2.children ?? ''));
        }
      }
    } else if (oldProps !== newProps) {
      // 无 patchFlag，执行完整 props diff
      diffProps(el, oldProps, newProps);
    }

    // Patch children — Block Tree 快速路径
    const oldDynamicChildren = n1.dynamicChildren;
    const newDynamicChildren = n2.dynamicChildren;

    if (oldDynamicChildren && newDynamicChildren && oldDynamicChildren.length > 0) {
      // Block Tree 优化路径：仅 diff dynamicChildren
      ctx.patchBlockChildren(n1, n2, el, parentComponent, parentSuspense, isSVG);
    } else {
      // 回退路径：全量 diff children
      ctx.patchChildren(n1, n2, el, parentComponent, parentSuspense, isSVG);
    }
  }

  return {
    mountElement,
    patchElement,
    mountTextNode,
    mountCommentNode,
    setRef,
  };
}
