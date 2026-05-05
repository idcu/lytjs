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
  // Host operations
  createElement: (type: string) => HE;
  setElementText: (node: HE, text: string) => void;
  insert: (child: HN, parent: HN, anchor?: HN | null) => void;
  remove: (child: HN) => void;
  createText: (text: string) => HN;
  setText: (node: HN, text: string) => void;
  patchProp: (el: HE, key: string, prevValue: unknown, nextValue: unknown) => void;
  createComment: (text: string) => HN;
  querySelector: ((selector: string) => HE | null) | undefined;
  setupChildComponent:
    | ((vnode: VNode, parent: ComponentInternalInstance | null) => void)
    | undefined;

  // VNode el helpers
  setVNodeEl: (vnode: VNode, el: HN | null) => void;
  getVNodeEl: (vnode: VNode) => HN | null;

  // Core recursive functions
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

  // Children helpers
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
// Element patch factory
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
  setRef: (
    el: HN,
    ref: unknown,
    parentComponent: ComponentInternalInstance,
  ) => void;
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
  function setRef(
    el: HN,
    ref: unknown,
    parentComponent: ComponentInternalInstance,
  ): void {
    if (typeof ref === 'string') {
      parentComponent.refs[ref] = el;
    } else if (typeof ref === 'function') {
      ref(el);
    } else if (ref !== null && typeof ref === 'object' && 'value' in ref) {
      (ref as { value: unknown }).value = el;
    }
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
    const el = createElement(tag);
    setVNodeEl(vnode, el);

    // Apply props
    const props = vnode.props ?? EMPTY_OBJ;
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;
      patchProp(el, key, null, props[key]);
    }

    // Mount children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, anchor, isSVG, parentComponent, parentSuspense);
    } else if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      setElementText(el, String(vnode.children ?? ''));
    }

    // Insert into container
    insert(el, container, anchor);

    // Handle ref: store element reference on parent component instance
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
    const node = createText(text);
    setVNodeEl(vnode, node);
    insert(node, container, anchor);
  }

  // ============================================================
  // mountCommentNode
  // ============================================================

  function mountCommentNode(vnode: VNode, container: HN, anchor: HN | null): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '');
    const node = createComment(text);
    setVNodeEl(vnode, node);
    vnode.anchor = node as unknown as Node | null;
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
        warn(`[lytjs/vdom] patchElement: n1.el is null or undefined. ` + `VNode type: ${String(n1.type)}, key: ${String(n1.key)}`);
      }
      return;
    }
    const el = n1.el as unknown as HE;
    setVNodeEl(n2, n1.el as unknown as HN | null);

    // Patch props
    const oldProps = n1.props ?? EMPTY_OBJ;
    const newProps = n2.props ?? EMPTY_OBJ;

    if (n2.patchFlag & PatchFlags.FULL_PROPS) {
      // Full props diff
      diffProps(el, oldProps, newProps);
    } else if (n2.patchFlag > 0) {
      // PatchFlag optimization
      if (n2.patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          patchProp(el, 'class', oldProps.class, newProps.class);
        }
      }
      if (n2.patchFlag & PatchFlags.STYLE) {
        patchProp(el, 'style', oldProps.style, newProps.style);
      }
      if (n2.patchFlag & PatchFlags.PROPS) {
        // Only diff dynamicProps
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
      // No patchFlag, do full props diff
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
