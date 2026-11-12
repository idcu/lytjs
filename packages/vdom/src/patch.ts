/**
 * @lytjs/vdom - patch
 *
 * 核心 patch 逻辑，平台无关的渲染器宿主。
 *
 * 这是协调所有 patch 子模块的主入口：
 * - patch-element.ts: 元素 vnode mount/patch
 * - patch-component.ts: 组件 vnode mount
 * - patch-fragment.ts: Fragment vnode mount/patch/unmount
 * - patch-teleport.ts: Teleport vnode mount/patch/unmount/move
 * - patch-suspense.ts: Suspense vnode mount/patch/unmount
 * - patch-children.ts: Children diff/mount/unmount
 */

import { Fragment, Text, Comment, ShapeFlags, isSameVNodeType } from '@lytjs/common-vnode';
import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { isArray, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { shallowEqual } from '@lytjs/common-object';
import type { RendererHost } from '@lytjs/host-contract';
import type { RendererOptions, SuspenseBoundary } from './types';
import { invokeDirectiveHook } from './directives';
import { registerDOMOperations } from './list-diff';
import type { DOMOperations } from './list-diff';

// 子模块导入
import type { RendererContext } from './patch-element';
import { createElementPatch } from './patch-element';
import { createComponentPatch } from './patch-component';
import { createFragmentPatch } from './patch-fragment';
import { createTeleportPatch } from './patch-teleport';
import { createSuspensePatch } from './patch-suspense';
import { createChildrenPatch } from './patch-children';

// ============================================================
// RendererHost 适配器：将 RendererHost 包装为 RendererOptions 形状
// ============================================================

/**
 * 内部渲染器选项形状，host 和 legacy 适配器共用。
 */
interface InternalRendererOptions<HN, HE extends HN> {
  createElement: (type: string) => HE;
  setElementText: (node: HE, text: string) => void;
  insert: (child: HN, parent: HN, anchor?: HN | null) => void;
  remove: (child: HN) => void;
  createText: (text: string) => HN;
  setText: (node: HN, text: string) => void;
  patchProp: (el: HE, key: string, prevValue: unknown, nextValue: unknown) => void;
  createComment: (text: string) => HN;
  querySelector: ((selector: string) => HE | null) | undefined;
  nextSibling: (node: HN) => HN | null;
  parentNode: (node: HN) => HN | null;
  /** 水合用：取节点类型（1=元素 / 3=文本 / 8=注释） */
  getNodeType: ((node: HN) => number) | undefined;
  /** 水合用：取元素标签名（小写） */
  getTagName: ((el: HE) => string) | undefined;
  /** 水合用：取子节点列表（认领时按序扫描） */
  getChildNodes: ((node: HN) => HN[]) | undefined;
  /** 水合用：取元素属性名（小写），用于清理 SSR 独有属性 */
  getAttributeNames: ((el: HE) => string[]) | undefined;
  /** 水合用：读表单状态（live vs initial），用于避免覆盖用户已输入的内容 */
  getFormState:
    | ((el: HE, key: string) => { live: unknown; initial: unknown } | undefined)
    | undefined;
  setupChildComponent:
    | ((vnode: VNode, parent: ComponentInternalInstance | null) => void)
    | undefined;
  /** FIX: P1-4 组件更新时规范化 props 的回调 */
  normalizeProps:
    | ((instance: ComponentInternalInstance, rawProps: Record<string, unknown> | null) => void)
    | undefined;
  /** 组件更新时重建插槽的回调 */
  initSlots: ((instance: ComponentInternalInstance, children: unknown) => void) | undefined;
  /** 组件生命周期钩子回调（见 RendererOptions 同名说明；由 @lytjs/core 注入） */
  invokeMountedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeUpdatedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeBeforeUnmountHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeUnmountedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  /** 渲染期把当前实例交给上层（见 RendererOptions.setRenderingInstance） */
  setRenderingInstance: ((instance: ComponentInternalInstance | null) => void) | undefined;
}

/**
 * 将 RendererHost 适配为 createRenderer 使用的内部 RendererOptions 形状。
 * 这弥合了 RendererHost 的 patchProp(el, key, prev, next, isSVG?)
 * 和内部对简化 patchProp(el, key, prev, next) 需求之间的差距。
 */
function hostToOptions<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
): InternalRendererOptions<HN, HE> {
  return {
    createElement: (type: string) => host.createElement(type),
    setElementText: (node, text) => host.setElementText(node, text),
    insert: (child, parent, anchor) => host.insert(child, parent, anchor),
    remove: (child) => host.remove(child),
    createText: (text) => host.createText(text),
    setText: (node, text) => host.setText(node, text),
    patchProp: (el, key, prevValue, nextValue) => host.patchProp(el, key, prevValue, nextValue),
    createComment: (text) => host.createComment(text),
    querySelector: (selector) => host.querySelector(selector),
    nextSibling: (node) => host.nextSibling(node),
    parentNode: (node) => host.parentNode(node),
    getNodeType: host.getNodeType ? (node) => host.getNodeType!(node) : undefined,
    getTagName: host.getTagName ? (el) => host.getTagName!(el) : undefined,
    getChildNodes: host.getChildNodes
      ? (node) => host.getChildNodes!(node as unknown as HE)
      : undefined,
    getAttributeNames: host.getAttributeNames
      ? (el) => host.getAttributeNames!(el as unknown as HE)
      : undefined,
    getFormState: host.getFormState
      ? (el, key) => host.getFormState!(el as unknown as HE, key)
      : undefined,
    setupChildComponent: undefined,
    normalizeProps: undefined,
    initSlots: undefined,
    invokeMountedHook: undefined,
    invokeUpdatedHook: undefined,
    invokeBeforeUnmountHook: undefined,
    invokeUnmountedHook: undefined,
    setRenderingInstance: undefined,
  };
}

/**
 * 将 legacy RendererOptions 适配为 createRenderer 使用的内部形状。
 */
function optionsToInternal<HN, HE extends HN>(
  options: RendererOptions<HN, HE>,
): InternalRendererOptions<HN, HE> {
  return {
    createElement: (type) => options.createElement(type),
    setElementText: (node, text) => options.setElementText(node, text),
    insert: (child, parent, anchor) => options.insert(child, parent, anchor),
    remove: (child) => options.remove(child),
    createText: (text) => options.createText(text),
    setText: (node, text) => options.setText(node, text),
    patchProp: (el, key, prevValue, nextValue) => options.patchProp(el, key, prevValue, nextValue),
    createComment: (text) => options.createComment(text),
    querySelector: options.querySelector
      ? (selector) => options.querySelector!(selector)
      : undefined,
    nextSibling: (node) => options.nextSibling(node),
    parentNode: (node) => options.parentNode(node),
    getNodeType: options.getNodeType ? (node) => options.getNodeType!(node) : undefined,
    getTagName: options.getTagName ? (el) => options.getTagName!(el) : undefined,
    getChildNodes: options.getChildNodes ? (node) => options.getChildNodes!(node) : undefined,
    getAttributeNames: options.getAttributeNames
      ? (el) => options.getAttributeNames!(el)
      : undefined,
    getFormState: options.getFormState ? (el, key) => options.getFormState!(el, key) : undefined,
    setupChildComponent: options.setupChildComponent,
    normalizeProps: options.normalizeProps,
    initSlots: options.initSlots,
    invokeMountedHook: options.invokeMountedHook,
    invokeUpdatedHook: options.invokeUpdatedHook,
    invokeBeforeUnmountHook: options.invokeBeforeUnmountHook,
    invokeUnmountedHook: options.invokeUnmountedHook,
    setRenderingInstance: options.setRenderingInstance,
  };
}

// ============================================================
// 渲染器工厂
// ============================================================

// FIX: P1-10 RENDERER-NEW-01 - 渲染器实例唯一性检查
// 使用 WeakSet 跟踪已创建的渲染器配置，防止重复创建
const createdRenderers = new WeakSet<object>();

// FIX: P2-4 事件监听器清理回调注册表
// 允许外部注册元素卸载时的事件清理函数
const eventCleanupCallbacks = new Set<(el: Node) => void>();

/**
 * 注册元素卸载时的事件清理回调。
 * 用于在组件/元素卸载时清理绑定的事件监听器。
 * FIX: P2-4 事件监听器未清理问题
 */
export function registerEventCleanupCallback(callback: (el: Node) => void): () => void {
  eventCleanupCallbacks.add(callback);
  return () => eventCleanupCallbacks.delete(callback);
}

/**
 * 清理元素上的所有事件监听器。
 * 调用所有注册的清理回调。
 * FIX: P2-4 事件监听器未清理问题
 */
function cleanupElementEvents(el: Node): void {
  for (const callback of eventCleanupCallbacks) {
    try {
      callback(el);
    } catch (e) {
      if (__DEV__) {
        console.warn('[lytjs/patch] Error during event cleanup:', e);
      }
    }
  }
}

/**
 * 检查是否已使用相同的 host/options 创建了渲染器。
 * 防止重复创建渲染器，这可能导致隔离问题。
 */
function checkRendererUniqueness<HN, HE extends HN>(
  hostOrOptions: RendererHost<HN, HE> | RendererOptions<HN, HE>,
): void {
  if (__DEV__) {
    if (createdRenderers.has(hostOrOptions)) {
      // FIX: P2-30 字符串拼接优化 - 使用模板字符串替代 + 拼接
      warn(
        `A renderer has already been created with this host/options object. ` +
          `Creating multiple renderers with the same configuration can lead to ` +
          `unexpected behavior. Consider reusing the existing renderer.`,
      );
    }
    createdRenderers.add(hostOrOptions);
  }
}

/**
 * 使用给定的 RendererHost 创建渲染器。
 * 返回 patch、mount 和 unmount 函数。
 *
 * 这是主要签名 — 完全平台无关。
 */
export function createRenderer<HN, HE extends HN>(
  host: RendererHost<HN, HE>,
): {
  patch(
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor?: HN | null,
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
    isSVG?: boolean,
  ): void;
  mount(vnode: VNode, container: HN): void;
  /** 水合挂载：复用容器内既有 DOM，并照常建立组件实例与响应式 effect */
  hydrate(vnode: VNode, container: HN): void;
  unmount(vnode: VNode): void;
  move(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void;
  diffChildren(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void;
};

/**
 * @deprecated 请使用 createRenderer(host: RendererHost)。
 * 接受 RendererOptions 的 legacy 签名，用于向后兼容。
 */
export function createRenderer<HN, HE extends HN>(
  options: RendererOptions<HN, HE>,
): {
  patch(
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor?: HN | null,
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
    isSVG?: boolean,
  ): void;
  mount(vnode: VNode, container: HN): void;
  /** 水合挂载：复用容器内既有 DOM，并照常建立组件实例与响应式 effect */
  hydrate(vnode: VNode, container: HN): void;
  unmount(vnode: VNode): void;
  move(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void;
  diffChildren(
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void;
};

export function createRenderer<HN, HE extends HN>(
  hostOrOptions: RendererHost<HN, HE> | RendererOptions<HN, HE>,
) {
  // FIX: P1-10 RENDERER-NEW-01 - 检查渲染器实例唯一性
  checkRendererUniqueness(hostOrOptions);

  // FIX: P0-03 使用 __isRendererHost 标识符号替代鸭子类型检测，
  // 避免普通对象碰巧包含 addClass/getBoundingClientRect 时被误判为 RendererHost
  // FIX: P1-T3 使用类型守卫替代类型断言
  // FIX: DTS build error - 先转换为 unknown 再转换为 Record
  const hostOrOptionsRecord = hostOrOptions as unknown as Record<string, unknown>;
  const isHost =
    '__isRendererHost' in hostOrOptions && hostOrOptionsRecord.__isRendererHost === true;
  const internal = isHost
    ? hostToOptions(hostOrOptions as RendererHost<HN, HE>)
    : optionsToInternal(hostOrOptions as RendererOptions<HN, HE>);

  const {
    createElement,
    setElementText,
    insert,
    remove: hostRemove,
    createText,
    setText,
    patchProp,
    createComment,
    querySelector,
    getNodeType,
    getTagName,
    getChildNodes,
    getAttributeNames,
    getFormState,
    setupChildComponent,
    normalizeProps,
    initSlots,
    invokeMountedHook,
    invokeUpdatedHook,
    invokeBeforeUnmountHook,
    invokeUnmountedHook,
    setRenderingInstance,
  } = internal;

  // 辅助函数：将宿主节点赋值给 vnode.el（VNode.el 在 common-vnode 中类型为 Node | null，
  // 但我们这里使用泛型 HN，因此需要类型断言）。
  // 双重断言（HN -> unknown -> Node）是必要的，因为 HN 和 Node
  // 在泛型上下文中是不相关类型 — TypeScript 不允许在
  // 没有共同基类的两个泛型类型之间直接转换。通过 unknown 是
  // 这种跨边界类型桥接的标准模式。
  const setVNodeEl = (vnode: VNode, el: HN | null) => {
    vnode.el = el as unknown as Node | null;
  };
  const getVNodeEl = (vnode: VNode): HN | null => vnode.el as unknown as HN | null;

  // ============================================================
  // 构建共享的 RendererContext 供子模块使用
  // ============================================================

  // 使用可变上下文对象，在函数创建时填充。
  // 这允许子模块通过共享上下文相互引用。
  const ctx = {} as RendererContext<HN, HE>;

  // 填充宿主操作
  ctx.createElement = createElement;
  ctx.setElementText = setElementText;
  ctx.insert = insert;
  ctx.remove = hostRemove;
  ctx.createText = createText;
  ctx.setText = setText;
  ctx.patchProp = patchProp;
  ctx.createComment = createComment;
  ctx.querySelector = querySelector;
  ctx.getNodeType = getNodeType;
  ctx.getTagName = getTagName;
  ctx.getChildNodes = getChildNodes;
  ctx.getAttributeNames = getAttributeNames;
  ctx.getFormState = getFormState;
  // ── 水合状态 ────────────────────────────────────────────────────────
  // `hydrate()` 入口置 true，首屏挂载期间 mountElement / mountTextNode /
  // mountCommentNode 改为「认领」容器内既有节点而非新建。
  // ⚠️ 默认 false ⇒ **既有挂载路径行为完全不变**（这是本改动风险可控的关键）。
  ctx.hydrating = false;
  // 本次水合中已被某个 vnode 占用的宿主节点（**含因 SSR 缺失而新建的**，
  // 否则后续兄弟 vnode 会误认它 —— 详见 patch-element 的 claimExisting 注释）
  ctx.hydrateUsed = new Set<HN>();
  ctx.setupChildComponent = setupChildComponent;
  ctx.normalizeProps = normalizeProps;
  ctx.initSlots = initSlots;
  ctx.invokeMountedHook = invokeMountedHook;
  ctx.invokeUpdatedHook = invokeUpdatedHook;
  ctx.invokeBeforeUnmountHook = invokeBeforeUnmountHook;
  ctx.invokeUnmountedHook = invokeUnmountedHook;
  ctx.setRenderingInstance = setRenderingInstance;
  ctx.setVNodeEl = setVNodeEl;
  ctx.getVNodeEl = getVNodeEl;

  // ============================================================
  // 预定义转发函数供子模块使用（解决循环依赖）
  // 使用可变引用来延迟绑定实际的实现
  // ============================================================

  let _patchImpl: typeof ctx.patch | null = null;
  let _unmountImpl: typeof ctx.unmount | null = null;
  let _moveImpl: typeof ctx.move | null = null;

  ctx.patch = (...args) => {
    if (!_patchImpl) throw new Error('patch not initialized');
    return _patchImpl(...args);
  };
  ctx.unmount = (...args) => {
    if (!_unmountImpl) throw new Error('unmount not initialized');
    return _unmountImpl(...args);
  };
  ctx.move = (...args) => {
    if (!_moveImpl) throw new Error('move not initialized');
    return _moveImpl(...args);
  };

  // ============================================================
  // 创建子模块 API
  // ============================================================

  // 首先创建 children patch API（因为它被其他模块依赖）
  const childrenAPI = createChildrenPatch<HN, HE>(ctx);

  // 立即将 children 辅助函数注入上下文，供后续模块使用
  ctx.mountChildren = childrenAPI.mountChildren;
  ctx.unmountChildren = childrenAPI.unmountChildren;
  ctx.patchChildren = childrenAPI.patchChildren;
  ctx.patchBlockChildren = childrenAPI.patchBlockChildren;
  ctx.diffChildrenInternal = childrenAPI.diffChildrenInternal;

  // 现在可以安全地创建其他子模块 API 了
  const elementAPI = createElementPatch<HN, HE>(ctx);
  const componentAPI = createComponentPatch<HN, HE>(ctx);
  const fragmentAPI = createFragmentPatch<HN, HE>(ctx);
  const teleportAPI = createTeleportPatch<HN, HE>(ctx);
  const suspenseAPI = createSuspensePatch<HN, HE>(ctx);

  // ============================================================
  // 组件 ref 接线（R-P0-5）
  // ============================================================
  //
  // 元素 ref 由 `patch-element.ts` 的 `setRef` 处理；组件 vnode 此前**两头都断**：
  //   · 挂载侧：`mountComponent` 之后没有任何 setRef ⇒ 对象/串/函数 ref 全是 null；
  //   · 卸载侧：组件分支在通用的 ref 清理代码**之前** return ⇒ 永远不会清空。
  //
  // 这里与元素侧保持对称：挂载写值，卸载/换 ref 时清空。

  /** 组件 ref 的目标值：优先 `expose()` 暴露的对象，否则公共实例代理。 */
  function resolveComponentRefValue(component: ComponentInternalInstance): unknown {
    // `exposed` 在 common-vnode 的最小实例接口里未声明（由 component 包补充），
    // 用 `in` 做真实类型收窄，无需双重断言。取值语义与原先的
    // `instance.exposed ?? instance.ctx ?? component` 完全一致（null/undefined 同属 nullish）。
    if ('exposed' in component) {
      const exposed: unknown = component.exposed;
      return exposed ?? component.ctx ?? component;
    }
    return component.ctx ?? component;
  }

  /** 清空 vnode.ref（字符串删键、函数回调 null、对象置 value=null）。 */
  function clearVNodeRef(vnode: VNode, parentComponent: ComponentInternalInstance | null): void {
    if (!vnode.ref || !parentComponent) return;
    elementAPI.setRef(null, vnode.ref, parentComponent);
    if (typeof vnode.ref === 'string') {
      // 字符串 ref 的既有卸载语义是**删键**（不是留一个 null 值）
      delete parentComponent.refs[vnode.ref];
    }
  }

  /** 把组件实例写进 ref。 */
  function setComponentRef(vnode: VNode, parentComponent: ComponentInternalInstance | null): void {
    if (!vnode.ref || !parentComponent || !vnode.component) return;
    elementAPI.setRef(resolveComponentRefValue(vnode.component), vnode.ref, parentComponent);
  }

  // ============================================================
  // patch - 核心 diff 入口
  // ============================================================

  function patch(
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor: HN | null = null,
    parentComponent: ComponentInternalInstance | null = null,
    parentSuspense: SuspenseBoundary | null = null,
    isSVG: boolean = false,
  ): void {
    // FIX: P1-6 VDOM-NEW-10 - 添加对 null/undefined vnode 的防御性检查
    if (n2 === null || n2 === undefined) {
      if (__DEV__) {
        warn('patch() received null or undefined vnode, skipping.');
      }
      return;
    }

    // 第一次检查：判断 n1 是否可以复用（同类型）。
    // 如果 n1.el 为 null（例如之前被卸载），则将 n1 置为 null 以走挂载逻辑。
    // 仅对非组件类型的 vnode 执行此操作，组件 vnode 的 el 为 null 不代表需要重新挂载。
    if (n1 !== null && isSameVNodeType(n1, n2)) {
      if (
        n1.el === null &&
        !(n1.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) &&
        !(n1.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT)
      ) {
        n1 = null;
      }
    }

    // 第二次检查：在 n1 可能被置为 null 之后，再次判断是否走 patch 路径。
    // 两次检查是必要的：第一次可能将 n1 置为 null，第二次需要基于更新后的 n1 做判断。
    if (n1 !== null && isSameVNodeType(n1, n2)) {
      // FIX: P2-9 优化重复的属性查找：缓存 n2.type 到局部变量
      const n2Type = n2.type;
      const n2ShapeFlag = n2.shapeFlag;

      // Fragment 需要特殊处理
      if (n2Type === Fragment) {
        fragmentAPI.patchFragment(n1, n2, container, parentComponent, parentSuspense, isSVG);
      } else if (n2Type === Text || n2Type === Comment) {
        // Patch text/comment 节点：如果 children 变化则更新内容
        const node = n1.el;
        setVNodeEl(n2, node as unknown as HN | null);
        if (n1.children !== n2.children) {
          if (isFunction(n2.children)) {
            warn(
              `${n2Type === Text ? 'Text' : 'Comment'} vnode received a function children value. ` +
                `Function children are only supported on component vnodes. ` +
                `The value will be replaced with an empty string.`,
            );
          }
          setText(node as unknown as HN, isFunction(n2.children) ? '' : String(n2.children ?? ''));
        }
      } else if (n2ShapeFlag & ShapeFlags.SUSPENSE) {
        suspenseAPI.patchSuspense(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
        );
      } else if (n2ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // 组件 patch：委托给组件更新流程
        // FIX: P1-7 VDOM-NEW-11 - 组件更新效率优化
        // 在更新组件前添加 shallowEqual 比较 props，如果相同则跳过更新
        const prevProps = n1.props as Record<string, unknown> | null | undefined;
        const nextProps = n2.props as Record<string, unknown> | null | undefined;
        const propsChanged = !shallowEqual(prevProps ?? {}, nextProps ?? {});

        // FIX: P2-9 添加 slots 变化检查，避免仅通过 props 判断更新而忽略 slots 变化。
        // 当 slots（children）发生变化时（如父组件传入不同的 slot 内容），
        // 即使 props 未变化，组件也需要重新渲染以反映新的 slot 内容。
        const slotsChanged = n1.children !== n2.children;

        n2.el = n1.el;
        n2.component = n1.component;
        if (n2.component) {
          // FIX: P1-4 组件更新时调用 normalizeProps 规范化 nextProps，
          // 避免绕过 initProps 的声明 props 验证和 attrs 分离
          if (ctx.normalizeProps) {
            ctx.normalizeProps(n2.component, nextProps ?? null);
          } else {
            // 回退：直接赋值（无规范化时保持旧行为）
            n2.component.props = nextProps ?? {};
          }

          // ⚠️ 2026-10-27 修（P0）：slots 必须随 children 一起重建。
          // 此前只重建 props，`instance.slots` 永远停在首帧 ⇒ 父组件重渲染后
          // 子组件仍渲染旧插槽内容（静默）；模板形态下 slots 还被固化成
          // `() => list`，指向首帧那个数组。
          if (slotsChanged && ctx.initSlots) {
            ctx.initSlots(n2.component, n2.children);
          }

          const { update } = n2.component;
          if (update && (propsChanged || slotsChanged)) {
            update();
          }

          // ⚠️ 2026-10-30：这里**刻意没有**「更新后再下沉一次过渡钩子」的代码。
          //
          // 我一度加过它（担心 `mountComponent` 的闭包只认首帧 vnode、钩子会过期），
          // 但**注入验证显示删掉它 22 例过渡用例全绿** ⇒ 它当时没有任何用例需要。
          // 按本仓纪律（不留没有驱动的机制），删掉；若将来真出现「组件根元素类型在更新中
          // 改变、新根元素该播 enter」的场景，应当**先写一条会红的用例**再加回来。
          else if (__DEV__ && !propsChanged && !slotsChanged) {
            const compName = (n2.component.type as { name?: string }).name || 'anonymous';
            console.warn(`[lytjs/patch] 跳过组件更新 "${compName}"：props 和 slots 未变化`);
          }
        }

        // R-P0-5：同一组件换 ref（含从无到有 / 从有到无）时，先清旧再写新。
        // 与元素侧 `patchElement` 的 `n1.ref !== n2.ref` 分支同义。
        if (n2.ref !== n1.ref) {
          clearVNodeRef(n1, parentComponent);
          setComponentRef(n2, parentComponent);
        }
      } else if (n2ShapeFlag & ShapeFlags.TELEPORT) {
        teleportAPI.patchTeleport(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
        );
      } else {
        // Patch 现有元素节点
        elementAPI.patchElement(n1, n2, parentComponent, parentSuspense, isSVG);
      }
    } else {
      // 卸载旧节点
      if (n1 !== null) {
        unmount(n1, parentComponent, parentSuspense, true);
      }

      // 挂载新节点
      // FIX: P2-9 优化重复的属性查找：缓存 n2.type 和 n2.shapeFlag 到局部变量
      const n2Type = n2.type;
      const n2ShapeFlag = n2.shapeFlag;

      if (n2ShapeFlag & ShapeFlags.ELEMENT) {
        elementAPI.mountElement(n2, container, anchor, isSVG, parentComponent, parentSuspense);
      } else if (n2Type === Text) {
        elementAPI.mountTextNode(n2, container, anchor);
      } else if (n2Type === Comment) {
        elementAPI.mountCommentNode(n2, container, anchor);
      } else if (n2Type === Fragment) {
        fragmentAPI.mountFragment(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.TELEPORT) {
        teleportAPI.mountTeleport(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.SUSPENSE) {
        suspenseAPI.mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG);
      } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        componentAPI.mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG);
        // R-P0-5：挂载完成后把实例写进 ref（与元素侧 mountElement 的 setRef 对称）
        setComponentRef(n2, parentComponent);
      }
    }
  }

  // ============================================================
  // unmount
  // ============================================================

  function unmount(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean = false,
  ): void {
    const { type, children, component } = vnode;
    const el = getVNodeEl(vnode);

    // 处理组件卸载 - 触发 onUnmounted lifecycle hook
    if (
      component &&
      (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ||
        vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT)
    ) {
      // ============================================================
      // KeepAlive 停用分支
      // ============================================================
      // 当子 vnode 携带 `COMPONENT_SHOULD_KEEP_ALIVE`（由 KeepAlive 的 render 在
      // 未命中缓存时打上）时，组件实例应被**保留**（移入隐藏仓库）而非销毁，
      // 以便再次切回时激活复用、状态不丢。
      //
      // ⚠️ 2026-09-27 补齐：此前 vdom **从不消费**这个 flag，KeepAlive 退化为
      // pass-through（切换时走这里真正销毁组件：触发 unmounted、移除 DOM）。
      // 访问路径：`component.parent` 必为 KeepAlive 实例，其 `setupState` 暴露了
      // `deactivate`（见 keep-alive.ts）。
      if (vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
        const ka = (component.parent?.setupState ?? {}) as Record<string, unknown>;
        const deactivate = ka.deactivate as ((v: VNode) => void) | undefined;
        deactivate?.(vnode);
        return;
      }

      // 生命周期：beforeUnmount / unmounted 通过**回调注入**执行。
      //
      // ⚠️ 2026-09-26 修复：此前这里读 `component.bum` 并自行逐个调用，
      // 但**全仓没有任何地方给 `bum` 赋值** ⇒ `beforeUnmountHooks` 恒为 `[]`
      // ⇒ `onBeforeUnmount` / `beforeUnmount` 在生产路径**永不执行**。
      // 现改为与本文件既有的 setupChildComponent 同模式（回调注入），
      // 由 `@lytjs/core` 注入 component 侧的 `callLifecycleHook(instance, …)`。
      invokeBeforeUnmountHook?.(component as ComponentInternalInstance);
      component.isUnmounted = true;

      // 卸载组件的 subTree 以移除 DOM 元素
      const subTree = (component as ComponentInternalInstance).subTree;
      if (subTree) {
        unmount(subTree, component as ComponentInternalInstance, parentSuspense, doRemove);
      }
      // unmounted 语义上在 DOM 移除**之后**触发
      invokeUnmountedHook?.(component as ComponentInternalInstance);
      // R-P0-5：组件分支此前在这里直接 return，通用的 ref 清理代码永远走不到
      clearVNodeRef(vnode, parentComponent);
      return;
    }

    if (type === Fragment) {
      fragmentAPI.unmountFragment(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    if (type === Comment) {
      if (doRemove) {
        const commentEl = getVNodeEl(vnode);
        if (commentEl) hostRemove(commentEl);
      }
      return;
    }

    if (vnode.shapeFlag & ShapeFlags.TELEPORT) {
      teleportAPI.unmountTeleport(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    if (vnode.shapeFlag & ShapeFlags.SUSPENSE) {
      suspenseAPI.unmountSuspense(vnode, parentComponent, parentSuspense, doRemove);
      return;
    }

    // ============================================================
    // 卸载 children
    // ============================================================
    //
    // ★ 2026-10-30 修（P0）：**有 leave 钩子时推迟子树卸载**。
    //
    // 此前顺序是「先卸载 children（含移除 DOM）→ 再交给 leave 播动画」，于是动画期间
    // 元素是个**空壳**：
    //
    //   <Transition name="fade"><div v-if="on"><p>CONTENT</p></div></Transition>
    //   leave 期间 innerHTML === ''        ← 内容瞬间消失，用户看到"空盒子淡出"
    //
    // 实测（`_probe-leave`）：before=`<p class="inner">CONTENT</p>` → during=`''`。
    //
    // 现在：有 `leave` 时把子树卸载**挂到过渡结束的回调里**，动画播完才真正卸载 + 移除节点。
    // 代价：动画期间子树里的组件实例**还没销毁**（`onUnmounted` 会推迟到动画结束），
    // 这是「让内容看得见」必须付的代价 —— 与 Vue 的行为一致（Vue 也是延后移除）。
    const childList = isArray(children) ? children : null;
    const shouldDeferChildren =
      doRemove && childList !== null && vnode.transition?.leave !== undefined;

    const unmountChildrenNow = () => {
      if (!childList) return;
      for (let i = 0; i < childList.length; i++) {
        unmount(childList[i]!, parentComponent, parentSuspense, doRemove);
      }
    };

    // ★ 2026-10-31 新增：自定义指令 beforeUnmount（子树卸载之前）
    invokeDirectiveHook(vnode, 'beforeUnmount');

    if (!shouldDeferChildren) {
      unmountChildrenNow();
    }

    // FIX: P2-4 清理元素上的事件监听器
    // 在卸载元素前清理所有绑定的事件监听器，防止内存泄漏
    if (el && vnode.shapeFlag & ShapeFlags.ELEMENT) {
      cleanupElementEvents(el as unknown as Node);
    }

    // 卸载时清理 ref（字符串删键 / 函数回调 null / 对象置 null）
    clearVNodeRef(vnode, parentComponent);

    if (doRemove) {
      if (el) {
        // ★ 2026-10-29 新增：过渡 leave。
        //
        // 有 `leave` 钩子时**不立即移除**，而是把移除交给它，在过渡结束后再调 ——
        // 否则「动画刚开始播、元素已经被摘掉」，等于没有动画。
        //
        // ★ 2026-10-30：子树卸载也一并推迟到这里（见上方 `shouldDeferChildren`），
        // 否则动画期间是空壳。
        const leaveHooks = vnode.transition;
        if (leaveHooks?.leave) {
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            // 动画结束后：先真正卸载子树（会移除子节点），再把宿主元素摘掉
            unmountChildrenNow();
            hostRemove(el);
          };
          leaveHooks.leave(el, finish);
        } else {
          hostRemove(el);
        }
      }
    }

    // ★ 2026-10-31 新增：自定义指令 unmounted
    //   注意：有 leave 过渡时元素移除被推迟到动画结束，这里仍按「逻辑卸载」时机触发
    //   （与 Vue 的 unmounted 时机一致：vnode 生命周期结束，而非 DOM 消失）。
    invokeDirectiveHook(vnode, 'unmounted');
  }

  // ============================================================
  // move
  // ============================================================

  function move(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ): void {
    if (vnode.type === Fragment) {
      // 移动 Fragment children
      const children = isArray(vnode.children) ? vnode.children : [];
      for (let i = 0; i < children.length; i++) {
        move(children[i]!, container, anchor, parentComponent, parentSuspense);
      }
      // 移动锚点
      const vEl = getVNodeEl(vnode);
      if (vEl) insert(vEl, container, anchor);
      // FIX: P2-16 添加 null 检查，避免 vnode.anchor 为 null 时的不安全类型断言
      if (vnode.anchor && vnode.anchor !== vnode.el) {
        const anchorEl = vnode.anchor as unknown as HN;
        if (anchorEl) insert(anchorEl, container, anchor);
      }
    } else if (vnode.shapeFlag & ShapeFlags.TELEPORT) {
      teleportAPI.moveTeleport(vnode, container, anchor);
    } else {
      const vEl = getVNodeEl(vnode);
      if (vEl) insert(vEl, container, anchor);
    }
  }

  // ============================================================
  // 将核心递归函数注入上下文
  // （必须在 patch/unmount/move 定义之后执行）
  // ============================================================

  // 设置转发函数的实际实现
  _patchImpl = patch;
  _unmountImpl = unmount;
  _moveImpl = move;

  // ============================================================
  // mount
  // ============================================================

  function mount(vnode: VNode, container: HN): void {
    patch(null, vnode, container, null);
  }

  /**
   * 水合挂载：复用容器内**既有的** DOM（典型来源：SSR 产出的 HTML），
   * 同时照常建立组件实例与响应式 effect ⇒ 挂载完成后**由客户端接管更新**。
   *
   * 与 `mount()` 的差别只有一处：首屏挂载时，元素/文本/注释优先**认领**
   * 同类型的既有节点（跳过 `create*` 与 `insert`），props 仍照常 apply
   * （因此事件监听器会在水合时接上）。
   *
   * ⚠️ 能力边界（务必知悉后再用）：
   * · 宿主必须提供 `getNodeType` / `getTagName`（`WebRendererHost` 已有），
   *   否则无法判断节点类型，只能退化为「全部新建」。
   * · 认领是**按顺序配对**的（游标语义），不做 keyed 匹配 ⇒ SSR 与客户端产物顺序不一致时
   *   以客户端为准：多出来的节点会被删、少掉的节点会新建（dev 侧告警，不静默）。
   * · 多根（Fragment）根节点会**清理容器里的服务端残留**；单根时容器里的其它内容
   *   （`<script>` / 第三方 widget）不动 —— 那些可能不属于本应用。
   * · 服务端注入的资源节点（`<script>` / `<style>` / `<link>` / `<noscript>` …）
   *   **永不删除**：它们的副作用在 DOM 之外（丢数据 / 丢样式），且不属于 vnode。
   * · 表单状态（`value` / `checked` / `selected`）若**已被用户改动**则保留，
   *   不按 vnode 覆盖 —— 否则慢网络下用户先输入的内容会被抹掉。
   */
  function hydrate(vnode: VNode, container: HN): void {
    if (!getNodeType || !getTagName || !getChildNodes) {
      warn(
        'hydrate() requires the host to provide getNodeType/getTagName/getChildNodes; ' +
          'falling back to a normal mount (existing DOM will be duplicated).',
      );
    }
    ctx.hydrating = true;
    ctx.hydrateUsed.clear();
    try {
      patch(null, vnode, container, null);

      // ⚠️ 2026-11-04 修（P1）：**多根（Fragment）根节点**要清理容器里的服务端残留。
      //
      //   元素级收敛（`mountElement` 里删未认领的 children）覆盖不到「根就是 Fragment」
      //   的情况：容器的 children 就是应用的根，多出来的根没有任何人负责删除。
      //   实测：SSR 输出 3 个根、客户端只渲染 2 个 ⇒ 第 3 个根**一直留在页面上**
      //   （还带着服务端的数据），而 `mount()` 的结果只有 2 个。
      //
      //   只在根是 Fragment 时做：单根时容器里可能还有本应用之外的内容
      //   （统计脚本、第三方 widget），不能一并删掉。
      let root: VNode = vnode;
      while (root.component?.subTree) root = root.component.subTree;
      if (root.type === Fragment) {
        elementAPI.cleanupUnclaimedChildren(container, 'root');
      }
    } finally {
      ctx.hydrating = false;
      ctx.hydrateUsed.clear();
    }
  }

  // ============================================================
  // diffChildren - 公共 API
  // ============================================================

  const { diffChildren } = childrenAPI;

  // ============================================================
  // 注册 DOM 操作到 list-diff 模块
  // FIX: P0-04 使用返回的 symbol ID 支持多渲染器场景
  // ============================================================
  const domOps: DOMOperations<HN, SuspenseBoundary | null> = {
    insert: (child, container, anchor) => {
      const childEl = getVNodeEl(child);
      if (childEl) {
        insert(childEl, container, anchor);
      }
    },
    createElement: (type) => createElement(type),
    mount: (vnode, container, anchor) => {
      patch(null, vnode, container, anchor);
    },
    patch: (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG) => {
      patch(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG);
    },
    unmount: (vnode, parentComponent, parentSuspense, doRemove) => {
      unmount(vnode, parentComponent, parentSuspense, doRemove);
    },
    move: (vnode, container, anchor, parentComponent, parentSuspense) => {
      move(vnode, container, anchor, parentComponent, parentSuspense);
    },
  };
  const opsId = registerDOMOperations(domOps);
  // 将 opsId 存入 ctx，供 patch-children 等子模块传递给 list-diff
  ctx.opsId = opsId;

  return {
    patch,
    mount,
    hydrate,
    unmount: (vnode: VNode) => unmount(vnode, null, null, true),
    move,
    diffChildren,
  };
}
